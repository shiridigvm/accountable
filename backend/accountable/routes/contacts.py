from fastapi import APIRouter, Request, Response

from accountable import store
from accountable.routes.common import added_by, changed_by, engine_of, require
from accountable.rules.delete import check_deletable
from accountable.rules.timeline import (
    activity_entry,
    merge_newest_first,
    stage_change_entry,
)
from accountable.schemas import ContactIn, ContactPatch

router = APIRouter(prefix="/api/contacts", tags=["contacts"])


@router.get("")
def list_contacts(request: Request, status: str | None = None):
    with engine_of(request).connect() as conn:
        return store.list_contacts(conn, status=status)


@router.post("", status_code=201)
def create_contact(body: ContactIn, request: Request):
    with engine_of(request).begin() as conn:
        contact_id = store.insert_contact(conn, body.model_dump() | added_by(request))
        return store.get_contact(conn, contact_id)


@router.get("/{contact_id}")
def get_contact(contact_id: int, request: Request):
    with engine_of(request).connect() as conn:
        return require(store.get_contact(conn, contact_id), "Contact", contact_id)


@router.patch("/{contact_id}")
def update_contact(contact_id: int, body: ContactPatch, request: Request):
    with engine_of(request).begin() as conn:
        require(store.get_contact(conn, contact_id), "Contact", contact_id)
        store.update_contact(
            conn, contact_id, body.model_dump(exclude_unset=True) | changed_by(request)
        )
        return store.get_contact(conn, contact_id)


@router.delete("/{contact_id}", status_code=204)
def delete_contact(contact_id: int, request: Request):
    with engine_of(request).begin() as conn:
        require(store.get_contact(conn, contact_id), "Contact", contact_id)
        check_deletable("contact", store.contact_links(conn, contact_id))
        store.delete_contact(conn, contact_id)
    return Response(status_code=204)


@router.get("/{contact_id}/timeline")
def contact_timeline(contact_id: int, request: Request):
    with engine_of(request).connect() as conn:
        require(store.get_contact(conn, contact_id), "Contact", contact_id)
        deal_ids = store.deal_ids_with_main_contact(conn, contact_id)
        entries = [
            activity_entry(r)
            for r in store.activities_for(conn, [contact_id], deal_ids)
        ]
        entries += [
            stage_change_entry(r) for r in store.stage_changes_for(conn, deal_ids)
        ]
        return merge_newest_first(entries)
