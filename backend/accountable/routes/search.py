from fastapi import APIRouter, Request

from accountable import search
from accountable.routes.common import engine_of
from accountable.rules.search import normalize, top_matches

router = APIRouter(prefix="/api/search", tags=["search"])


@router.get("")
def search_records(request: Request, q: str = ""):
    """Up to 5 organizations, contacts and deals whose name contains q (R51 to R53)."""
    if not normalize(q):
        return {"organizations": [], "contacts": [], "deals": []}
    with engine_of(request).connect() as conn:
        return {
            "organizations": top_matches(search.organization_names(conn), q),
            "contacts": top_matches(search.contact_names(conn), q),
            "deals": top_matches(search.deal_names(conn), q),
        }
