from datetime import datetime

from fastapi import APIRouter, Request, Response

from accountable import store
from accountable.clock import today
from accountable.routes.common import engine_of, require
from accountable.rules.timeline import activity_entry, merge_newest_first
from accountable.schemas import ActivityIn, ActivityPatch

router = APIRouter(prefix="/api/activities", tags=["activities"])


@router.get("")
def list_activities(
    request: Request, contact_id: int | None = None, deal_id: int | None = None
):
    with engine_of(request).connect() as conn:
        rows = store.list_activities(conn, contact_id=contact_id, deal_id=deal_id)
        return merge_newest_first([activity_entry(r) for r in rows])


@router.post("", status_code=201)
def create_activity(body: ActivityIn, request: Request):
    data = body.model_dump()
    data["occurred_on"] = data["occurred_on"] or today()
    data["created_at"] = datetime.now()
    with engine_of(request).begin() as conn:
        if data["contact_id"] is not None:
            require(
                store.get_contact(conn, data["contact_id"]),
                "Contact",
                data["contact_id"],
            )
        if data["deal_id"] is not None:
            require(store.raw_deal(conn, data["deal_id"]), "Deal", data["deal_id"])
        activity_id = store.insert_activity(conn, data)
        return activity_entry(
            require(store.get_activity(conn, activity_id), "Activity", activity_id)
        )


@router.patch("/{activity_id}")
def update_activity(activity_id: int, body: ActivityPatch, request: Request):
    with engine_of(request).begin() as conn:
        require(store.get_activity(conn, activity_id), "Activity", activity_id)
        store.update_activity(conn, activity_id, body.model_dump(exclude_unset=True))
        return activity_entry(
            require(store.get_activity(conn, activity_id), "Activity", activity_id)
        )


@router.delete("/{activity_id}", status_code=204)
def delete_activity(activity_id: int, request: Request):
    with engine_of(request).begin() as conn:
        require(store.get_activity(conn, activity_id), "Activity", activity_id)
        store.delete_activity(conn, activity_id)
    return Response(status_code=204)
