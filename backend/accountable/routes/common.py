"""Helpers shared by the route modules."""

from fastapi import Request

from accountable.deals import NotFound


def engine_of(request: Request):
    return request.app.state.engine


def require(record, name: str, record_id: int):
    if record is None:
        raise NotFound(f"{name} {record_id} was not found.")
    return record
