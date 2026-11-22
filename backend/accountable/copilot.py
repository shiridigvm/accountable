"""The Copilot's conversation with OpenRouter (R61 to R69, R72, R73).

Each turn sends the conversation and the tools to OpenRouter. Lookups the model
asks for run through the API's own read route functions, as the signed-in person,
and go back to the model as `tool` messages, which the system prompt marks as
record content. A propose_change call ends the turn with a checked proposal. The
backend never writes here: the person's Confirm in the browser sends the change to
the normal route (decision 22).
"""

import json
import logging
import urllib.error
import urllib.request
from collections.abc import Callable

from fastapi import Request
from fastapi.encoders import jsonable_encoder

from accountable.clock import today
from accountable.config import openrouter_api_key, openrouter_base_url, openrouter_model
from accountable.deals import NotFound
from accountable.routes import (
    activities,
    contacts,
    dashboard,
    deals,
    organizations,
    pipeline,
    search,
)
from accountable.rules.copilot import (
    COULD_NOT_PREPARE,
    DETAIL_KINDS,
    PROPOSAL_TEXT,
    TOOLS,
    ProposalRefused,
    check_fields,
    cut,
    records_used,
    system_prompt,
    trim_history,
)

MAX_LOOKUP_ROUNDS = 5
TIMEOUT_SECONDS = 30
log = logging.getLogger(__name__)


class CopilotNotSetUp(Exception):
    pass


class CopilotBusy(Exception):
    pass


class CopilotFailed(Exception):
    pass


def fetch_completion(body: dict) -> dict:
    """One chat completions request to OpenRouter. The tests replace this function.

    Only the status code is ever logged, never the key, the request or the reply.
    """
    request = urllib.request.Request(
        f"{openrouter_base_url()}/chat/completions",
        data=json.dumps(body).encode(),
        headers={
            "Authorization": f"Bearer {openrouter_api_key()}",
            "Content-Type": "application/json",
        },
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=TIMEOUT_SECONDS) as reply:
            return json.load(reply)
    except urllib.error.HTTPError as error:
        log.warning("OpenRouter answered %s", error.code)
        if error.code == 429:
            raise CopilotBusy() from error
        raise CopilotFailed() from error
    except (urllib.error.URLError, TimeoutError, ValueError) as error:
        log.warning("OpenRouter could not be read: %s", type(error).__name__)
        raise CopilotFailed() from error


# Lookups (choice 2): each calls the route function the API uses for that GET.

_LIST_ROUTES: dict[str, Callable] = {
    "organization": organizations.list_organizations,
    "contact": contacts.list_contacts,
    "deal": deals.list_deals,
    "activity": activities.list_activities,
}
_DETAIL_ROUTES: dict[str, tuple[Callable, Callable]] = {
    "organization": (
        organizations.get_organization,
        organizations.organization_timeline,
    ),
    "contact": (contacts.get_contact, contacts.contact_timeline),
    "deal": (deals.get_deal, deals.deal_timeline),
}
_SEARCH_GROUPS = {
    "organizations": "organization",
    "contacts": "contact",
    "deals": "deal",
}


def _note(seen: list[dict], kind: str, rows: list[dict], opened: bool) -> None:
    for row in rows:
        seen.append(
            {"kind": kind, "id": row["id"], "name": row["name"], "opened": opened}
        )


def _search(args: dict, request: Request, seen: list[dict]):
    found = search.search_records(request, q=str(args["q"]))
    for group, kind in _SEARCH_GROUPS.items():
        _note(seen, kind, found[group], opened=False)
    return found


def _list_records(args: dict, request: Request, seen: list[dict]):
    kind = args["kind"]
    if kind == "contact":
        rows = contacts.list_contacts(request, status=args.get("status"))
    else:
        rows = _LIST_ROUTES[kind](request)
    if kind != "activity":
        _note(seen, kind, rows, opened=False)
    return rows


def _get_record(args: dict, request: Request, seen: list[dict]):
    kind, record_id = args["kind"], int(args["id"])
    if kind not in DETAIL_KINDS:
        raise KeyError(kind)
    detail, timeline = _DETAIL_ROUTES[kind]
    record = detail(record_id, request)
    _note(seen, kind, [record], opened=True)
    return {"record": record, "timeline": timeline(record_id, request)}


_LOOKUPS: dict[str, Callable] = {
    "search": _search,
    "list_records": _list_records,
    "get_record": _get_record,
    "pipeline": lambda _args, request, _seen: pipeline.pipeline(request),
    "dashboard": lambda _args, request, _seen: dashboard.dashboard(request),
}


def run_lookup(name: str, args: dict, request: Request, seen: list[dict]) -> str:
    """The lookup's result as JSON text for a `tool` message, cut to size."""
    lookup = _LOOKUPS.get(name)
    if lookup is None:
        return json.dumps({"error": "unknown tool"})
    try:
        result = lookup(args, request, seen)
    except NotFound:
        return json.dumps({"error": "not found"})
    except (KeyError, TypeError, ValueError):
        return json.dumps({"error": "invalid arguments"})
    return cut(json.dumps(jsonable_encoder(result)))


# Proposals (choice 5).


def _current_activity(activity_id: int, request: Request) -> dict:
    for entry in activities.list_activities(request):
        if entry["id"] == activity_id:
            return entry
    raise NotFound(f"Activity {activity_id} was not found.")


def _current_record(kind: str, record_id: int, request: Request) -> dict:
    if kind == "activity":
        return _current_activity(record_id, request)
    return _DETAIL_ROUTES[kind][0](record_id, request)


def _record_name(kind: str, record: dict) -> str:
    return str(record.get("text" if kind == "activity" else "name") or "")


def check_proposal(args: dict, request: Request) -> dict | None:
    """The proposal the card shows, or None when it fails the checks (R69)."""
    kind, action = args.get("kind"), args.get("action")
    try:
        fields = check_fields(str(kind), str(action), args.get("fields"))
    except ProposalRefused:
        return None
    if action == "create":
        name = fields.get("name") or fields.get("description") or ""
        return {
            "kind": kind,
            "action": "create",
            "id": None,
            "name": name,
            "fields": fields,
            "current": None,
        }
    try:
        record_id = int(args["id"])
        record = _current_record(str(kind), record_id, request)
    except (KeyError, TypeError, ValueError, NotFound):
        return None
    # An activity entry calls its description "text".
    current_key = {"description": "text"} if kind == "activity" else {}
    return {
        "kind": kind,
        "action": "update",
        "id": record_id,
        "name": _record_name(str(kind), record),
        "fields": fields,
        "current": {f: record.get(current_key.get(f, f)) for f in fields},
    }


# The conversation loop (choice 3).


def _next_message(conversation: list[dict]) -> dict:
    body = {
        "model": openrouter_model(),
        "messages": conversation,
        "tools": TOOLS,
        "tool_choice": "auto",
    }
    reply = fetch_completion(body)
    # OpenRouter can report an error inside a 200 reply.
    if not isinstance(reply, dict) or reply.get("error"):
        raise CopilotFailed()
    try:
        message = reply["choices"][0]["message"]
    except (KeyError, IndexError, TypeError) as error:
        raise CopilotFailed() from error
    if not isinstance(message, dict):
        raise CopilotFailed()
    return message


def _arguments(call: dict) -> dict | None:
    try:
        args = json.loads(call["function"].get("arguments") or "{}")
    except (KeyError, TypeError, ValueError, AttributeError):
        return None
    return args if isinstance(args, dict) else None


def _call_name(call: dict) -> str:
    function = call.get("function")
    return function.get("name", "") if isinstance(function, dict) else ""


def _proposal_reply(
    message: dict, call: dict, seen: list[dict], request: Request
) -> dict:
    args = _arguments(call)
    proposal = check_proposal(args, request) if args is not None else None
    text = (message.get("content") or "").strip()
    if proposal is None:
        text = f"{text}\n\n{COULD_NOT_PREPARE}" if text else COULD_NOT_PREPARE
    else:
        text = text or PROPOSAL_TEXT
    return {"reply": text, "records": records_used(seen, text), "proposal": proposal}


def _tool_messages(calls: list[dict], request: Request, seen: list[dict]):
    for call in calls:
        args = _arguments(call)
        if args is None:
            content = json.dumps({"error": "invalid arguments"})
        else:
            content = run_lookup(_call_name(call), args, request, seen)
        yield {"role": "tool", "tool_call_id": call.get("id", ""), "content": content}


def chat(messages: list[dict], request: Request) -> dict:
    """One turn: {reply, records, proposal}. Reads only."""
    if not openrouter_api_key():
        raise CopilotNotSetUp()
    conversation: list[dict] = [{"role": "system", "content": system_prompt(today())}]
    conversation += trim_history(messages)
    seen: list[dict] = []
    for lookup_round in range(MAX_LOOKUP_ROUNDS + 1):
        message = _next_message(conversation)
        calls = message.get("tool_calls") or []
        proposal_call = next(
            (c for c in calls if _call_name(c) == "propose_change"), None
        )
        if proposal_call is not None:
            return _proposal_reply(message, proposal_call, seen, request)
        if not calls:
            text = (message.get("content") or "").strip()
            if not text:
                raise CopilotFailed()
            return {
                "reply": text,
                "records": records_used(seen, text),
                "proposal": None,
            }
        if lookup_round == MAX_LOOKUP_ROUNDS:
            break
        conversation.append(
            {
                "role": "assistant",
                "content": message.get("content"),
                "tool_calls": calls,
            }
        )
        conversation += _tool_messages(calls, request, seen)
    raise CopilotFailed()
