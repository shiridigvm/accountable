from datetime import datetime

from fastapi import APIRouter, Request, Response

from accountable import store
from accountable.clock import today
from accountable.deals import create_deal, delete_deal, move_deal, update_deal
from accountable.routes.common import engine_of, require
from accountable.rules.delete import check_deletable
from accountable.rules.pipeline import with_derived
from accountable.rules.timeline import (
    activity_entry,
    merge_newest_first,
    stage_change_entry,
)
from accountable.schemas import DealIn, DealPatch, MoveIn

router = APIRouter(prefix="/api/deals", tags=["deals"])


@router.get("")
def list_deals(request: Request):
    with engine_of(request).connect() as conn:
        return [with_derived(d, today()) for d in store.list_deals(conn)]


@router.post("", status_code=201)
def create(body: DealIn, request: Request):
    with engine_of(request).begin() as conn:
        deal_id = create_deal(conn, body.model_dump(), today())
        deal = require(store.get_deal(conn, deal_id), "Deal", deal_id)
        return with_derived(deal, today())


@router.get("/{deal_id}")
def get_deal(deal_id: int, request: Request):
    with engine_of(request).connect() as conn:
        deal = require(store.get_deal(conn, deal_id), "Deal", deal_id)
        return with_derived(deal, today())


@router.patch("/{deal_id}")
def update(deal_id: int, body: DealPatch, request: Request):
    with engine_of(request).begin() as conn:
        require(store.raw_deal(conn, deal_id), "Deal", deal_id)
        update_deal(
            conn, deal_id, body.model_dump(exclude_unset=True), today(), datetime.now()
        )
        deal = require(store.get_deal(conn, deal_id), "Deal", deal_id)
        return with_derived(deal, today())


@router.post("/{deal_id}/move")
def move(deal_id: int, body: MoveIn, request: Request):
    with engine_of(request).begin() as conn:
        require(store.raw_deal(conn, deal_id), "Deal", deal_id)
        move_deal(conn, deal_id, body.stage, body.position, today(), datetime.now())
        deal = require(store.get_deal(conn, deal_id), "Deal", deal_id)
        return with_derived(deal, today())


@router.delete("/{deal_id}", status_code=204)
def remove(deal_id: int, request: Request):
    with engine_of(request).begin() as conn:
        require(store.raw_deal(conn, deal_id), "Deal", deal_id)
        check_deletable("deal", store.deal_links(conn, deal_id))
        delete_deal(conn, deal_id)
    return Response(status_code=204)


@router.get("/{deal_id}/timeline")
def deal_timeline(deal_id: int, request: Request):
    with engine_of(request).connect() as conn:
        require(store.raw_deal(conn, deal_id), "Deal", deal_id)
        entries = [activity_entry(r) for r in store.activities_for(conn, [], [deal_id])]
        entries += [
            stage_change_entry(r) for r in store.stage_changes_for(conn, [deal_id])
        ]
        return merge_newest_first(entries)
