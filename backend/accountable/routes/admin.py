from fastapi import APIRouter, Request

from accountable.clock import today
from accountable.config import reset_allowed
from accountable.deals import NotFound
from accountable.routes.common import engine_of
from accountable.seed import seed_database

router = APIRouter(prefix="/api/admin", tags=["admin"])


@router.post("/reset")
def reset(request: Request):
    """Replace all data with the sample data. Only enabled for the end-to-end tests."""
    if not reset_allowed():
        raise NotFound("Not found.")
    seed_database(engine_of(request), today())
    return {"status": "reset"}
