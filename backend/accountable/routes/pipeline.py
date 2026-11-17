from fastapi import APIRouter, Request

from accountable import store
from accountable.clock import today
from accountable.routes.common import engine_of
from accountable.rules.pipeline import build_board

router = APIRouter(prefix="/api/pipeline", tags=["pipeline"])


@router.get("")
def pipeline(request: Request):
    with engine_of(request).connect() as conn:
        return build_board(store.list_deals(conn), today())
