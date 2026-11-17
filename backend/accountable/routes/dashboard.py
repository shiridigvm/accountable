from fastapi import APIRouter, Request

from accountable import store
from accountable.clock import today
from accountable.routes.common import engine_of
from accountable.rules.dashboard import follow_ups, headline_stats, monthly_series
from accountable.rules.expected import expected_cents
from accountable.rules.timeline import (
    activity_entry,
    merge_newest_first,
    stage_change_entry,
)

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])
RECENT_LIMIT = 8


@router.get("")
def dashboard(request: Request):
    now_day = today()
    with engine_of(request).connect() as conn:
        deals = store.list_deals(conn)
        for deal in deals:
            deal["expected_cents"] = expected_cents(
                deal["value_cents"], deal["probability"]
            )
        deal_ids = [d["id"] for d in deals]
        recent = [activity_entry(r) for r in store.list_activities(conn)]
        recent += [
            stage_change_entry(r) for r in store.stage_changes_for(conn, deal_ids)
        ]
        return {
            "today": now_day.isoformat(),
            "stats": headline_stats(now_day, deals),
            "monthly": monthly_series(now_day, deals),
            "follow_ups": follow_ups(now_day, store.open_follow_ups(conn)),
            "recent": merge_newest_first(recent)[:RECENT_LIMIT],
        }
