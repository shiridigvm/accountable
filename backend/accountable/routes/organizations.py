from fastapi import APIRouter, Request, Response

from accountable import store
from accountable.routes.common import added_by, changed_by, engine_of, require
from accountable.rules.delete import check_deletable
from accountable.rules.timeline import (
    activity_entry,
    merge_newest_first,
    stage_change_entry,
)
from accountable.schemas import OrganizationIn, OrganizationPatch

router = APIRouter(prefix="/api/organizations", tags=["organizations"])


@router.get("")
def list_organizations(request: Request):
    with engine_of(request).connect() as conn:
        return store.list_organizations(conn)


@router.post("", status_code=201)
def create_organization(body: OrganizationIn, request: Request):
    with engine_of(request).begin() as conn:
        org_id = store.insert_organization(conn, body.model_dump() | added_by(request))
        return store.get_organization(conn, org_id)


@router.get("/{org_id}")
def get_organization(org_id: int, request: Request):
    with engine_of(request).connect() as conn:
        return require(store.get_organization(conn, org_id), "Organization", org_id)


@router.patch("/{org_id}")
def update_organization(org_id: int, body: OrganizationPatch, request: Request):
    with engine_of(request).begin() as conn:
        require(store.get_organization(conn, org_id), "Organization", org_id)
        store.update_organization(
            conn, org_id, body.model_dump(exclude_unset=True) | changed_by(request)
        )
        return store.get_organization(conn, org_id)


@router.delete("/{org_id}", status_code=204)
def delete_organization(org_id: int, request: Request):
    with engine_of(request).begin() as conn:
        require(store.get_organization(conn, org_id), "Organization", org_id)
        check_deletable("organization", store.organization_links(conn, org_id))
        store.delete_organization(conn, org_id)
    return Response(status_code=204)


@router.get("/{org_id}/timeline")
def organization_timeline(org_id: int, request: Request):
    with engine_of(request).connect() as conn:
        require(store.get_organization(conn, org_id), "Organization", org_id)
        deal_ids = store.deal_ids_for_organization(conn, org_id)
        contact_ids = store.contact_ids_for_organization(conn, org_id)
        entries = [
            activity_entry(r) for r in store.activities_for(conn, contact_ids, deal_ids)
        ]
        entries += [
            stage_change_entry(r) for r in store.stage_changes_for(conn, deal_ids)
        ]
        return merge_newest_first(entries)
