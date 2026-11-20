"""Helpers shared by the route modules."""

from fastapi import Request

from accountable.auth import user_of
from accountable.deals import NotFound


def engine_of(request: Request):
    return request.app.state.engine


def added_by(request: Request) -> dict:
    """Who added a new record: the signed-in person, from the token (R44)."""
    email = user_of(request)
    return {"created_by": email, "updated_by": email}


def changed_by(request: Request) -> dict:
    return {"updated_by": user_of(request)}


def require(record, name: str, record_id: int):
    if record is None:
        raise NotFound(f"{name} {record_id} was not found.")
    return record
