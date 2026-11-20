"""Reads for search (R51): the id and name of every organization, contact and deal."""

from sqlalchemy import select
from sqlalchemy.engine import Connection

from accountable.schema import contacts, deals, organizations
from accountable.store import as_dict


def organization_names(conn: Connection) -> list[dict]:
    stmt = select(organizations.c.id, organizations.c.name)
    return [as_dict(r) for r in conn.execute(stmt)]


def contact_names(conn: Connection) -> list[dict]:
    stmt = select(
        contacts.c.id,
        contacts.c.name,
        organizations.c.name.label("organization_name"),
    ).select_from(
        contacts.outerjoin(
            organizations, contacts.c.organization_id == organizations.c.id
        )
    )
    return [as_dict(r) for r in conn.execute(stmt)]


def deal_names(conn: Connection) -> list[dict]:
    stmt = select(deals.c.id, deals.c.name)
    return [as_dict(r) for r in conn.execute(stmt)]
