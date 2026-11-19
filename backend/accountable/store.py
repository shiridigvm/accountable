"""Database reads and writes (SQLAlchemy Core). Each function takes an open connection."""

from datetime import date, datetime

from sqlalchemy import Table, delete, func, insert, select, update
from sqlalchemy.engine import Connection

from accountable.schema import (
    activities,
    contacts,
    deal_stage_changes,
    deals,
    organizations,
)

MainContact = contacts.alias("main_contact")


def as_dict(row) -> dict:
    return dict(row._mapping)


def _insert(conn: Connection, table: Table, data: dict) -> int:
    key = conn.execute(insert(table).values(**data)).inserted_primary_key
    if key is None:
        raise RuntimeError(f"Insert into {table.name} returned no primary key.")
    return key[0]


# Organizations


def list_organizations(conn: Connection) -> list[dict]:
    contact_count = (
        select(func.count())
        .select_from(contacts)
        .where(contacts.c.organization_id == organizations.c.id)
        .correlate(organizations)
        .scalar_subquery()
        .label("contact_count")
    )
    deal_count = (
        select(func.count())
        .select_from(deals)
        .where(deals.c.organization_id == organizations.c.id)
        .correlate(organizations)
        .scalar_subquery()
        .label("deal_count")
    )
    stmt = select(organizations, contact_count, deal_count).order_by(
        organizations.c.name
    )
    return [as_dict(r) for r in conn.execute(stmt)]


def get_organization(conn: Connection, org_id: int) -> dict | None:
    row = conn.execute(
        select(organizations).where(organizations.c.id == org_id)
    ).first()
    return as_dict(row) if row else None


def insert_organization(conn: Connection, data: dict) -> int:
    return _insert(conn, organizations, data)


def update_organization(conn: Connection, org_id: int, data: dict) -> None:
    if data:
        conn.execute(
            update(organizations).where(organizations.c.id == org_id).values(**data)
        )


def delete_organization(conn: Connection, org_id: int) -> None:
    conn.execute(delete(organizations).where(organizations.c.id == org_id))


def organization_links(conn: Connection, org_id: int) -> dict[str, int]:
    return {
        "contacts": _count(
            conn, select(contacts.c.id).where(contacts.c.organization_id == org_id)
        ),
        "deals": _count(
            conn, select(deals.c.id).where(deals.c.organization_id == org_id)
        ),
    }


# Contacts


def list_contacts(conn: Connection, status: str | None = None) -> list[dict]:
    stmt = (
        select(contacts, organizations.c.name.label("organization_name"))
        .select_from(
            contacts.outerjoin(
                organizations, contacts.c.organization_id == organizations.c.id
            )
        )
        .order_by(contacts.c.name)
    )
    if status:
        stmt = stmt.where(contacts.c.status == status)
    return [as_dict(r) for r in conn.execute(stmt)]


def get_contact(conn: Connection, contact_id: int) -> dict | None:
    stmt = (
        select(contacts, organizations.c.name.label("organization_name"))
        .select_from(
            contacts.outerjoin(
                organizations, contacts.c.organization_id == organizations.c.id
            )
        )
        .where(contacts.c.id == contact_id)
    )
    row = conn.execute(stmt).first()
    return as_dict(row) if row else None


def insert_contact(conn: Connection, data: dict) -> int:
    return _insert(conn, contacts, data)


def update_contact(conn: Connection, contact_id: int, data: dict) -> None:
    if data:
        conn.execute(update(contacts).where(contacts.c.id == contact_id).values(**data))


def delete_contact(conn: Connection, contact_id: int) -> None:
    conn.execute(delete(contacts).where(contacts.c.id == contact_id))


def contact_links(conn: Connection, contact_id: int) -> dict[str, int]:
    return {
        "activities": _count(
            conn, select(activities.c.id).where(activities.c.contact_id == contact_id)
        ),
        "deals as main contact": _count(
            conn, select(deals.c.id).where(deals.c.main_contact_id == contact_id)
        ),
    }


# Deals


def _deal_select():
    return select(
        deals,
        organizations.c.name.label("organization_name"),
        MainContact.c.name.label("main_contact_name"),
    ).select_from(
        deals.outerjoin(
            organizations, deals.c.organization_id == organizations.c.id
        ).outerjoin(MainContact, deals.c.main_contact_id == MainContact.c.id)
    )


def list_deals(conn: Connection) -> list[dict]:
    return [as_dict(r) for r in conn.execute(_deal_select().order_by(deals.c.id))]


def get_deal(conn: Connection, deal_id: int) -> dict | None:
    row = conn.execute(_deal_select().where(deals.c.id == deal_id)).first()
    return as_dict(row) if row else None


def raw_deal(conn: Connection, deal_id: int) -> dict | None:
    row = conn.execute(select(deals).where(deals.c.id == deal_id)).first()
    return as_dict(row) if row else None


def column_deal_ids(conn: Connection, stage: str) -> list[int]:
    """Deal ids in a stage, in board order."""
    stmt = (
        select(deals.c.id)
        .where(deals.c.stage == stage)
        .order_by(deals.c.position, deals.c.id)
    )
    return [r.id for r in conn.execute(stmt)]


def insert_deal(conn: Connection, data: dict) -> int:
    return _insert(conn, deals, data)


def update_deal_fields(conn: Connection, deal_id: int, data: dict) -> None:
    if data:
        conn.execute(update(deals).where(deals.c.id == deal_id).values(**data))


def set_deal_position(conn: Connection, deal_id: int, position: int) -> None:
    conn.execute(update(deals).where(deals.c.id == deal_id).values(position=position))


def delete_deal(conn: Connection, deal_id: int) -> None:
    conn.execute(
        delete(deal_stage_changes).where(deal_stage_changes.c.deal_id == deal_id)
    )
    conn.execute(delete(deals).where(deals.c.id == deal_id))


def deal_links(conn: Connection, deal_id: int) -> dict[str, int]:
    return {
        "activities": _count(
            conn, select(activities.c.id).where(activities.c.deal_id == deal_id)
        ),
    }


def insert_stage_change(
    conn: Connection,
    deal_id: int,
    from_stage: str,
    to_stage: str,
    today: date,
    now: datetime,
) -> None:
    conn.execute(
        insert(deal_stage_changes).values(
            deal_id=deal_id,
            from_stage=from_stage,
            to_stage=to_stage,
            changed_on=today,
            created_at=now,
        )
    )


# Activities


def _activity_select():
    return select(
        activities,
        deals.c.name.label("deal_name"),
        contacts.c.name.label("contact_name"),
    ).select_from(
        activities.outerjoin(deals, activities.c.deal_id == deals.c.id).outerjoin(
            contacts, activities.c.contact_id == contacts.c.id
        )
    )


def list_activities(
    conn: Connection, contact_id: int | None = None, deal_id: int | None = None
) -> list[dict]:
    stmt = _activity_select()
    if contact_id is not None:
        stmt = stmt.where(activities.c.contact_id == contact_id)
    if deal_id is not None:
        stmt = stmt.where(activities.c.deal_id == deal_id)
    return [as_dict(r) for r in conn.execute(stmt)]


def get_activity(conn: Connection, activity_id: int) -> dict | None:
    row = conn.execute(_activity_select().where(activities.c.id == activity_id)).first()
    return as_dict(row) if row else None


def insert_activity(conn: Connection, data: dict) -> int:
    return _insert(conn, activities, data)


def update_activity(conn: Connection, activity_id: int, data: dict) -> None:
    if data:
        conn.execute(
            update(activities).where(activities.c.id == activity_id).values(**data)
        )


def delete_activity(conn: Connection, activity_id: int) -> None:
    conn.execute(delete(activities).where(activities.c.id == activity_id))


# Timeline sources


def activities_for(
    conn: Connection, contact_ids: list[int], deal_ids: list[int]
) -> list[dict]:
    if not contact_ids and not deal_ids:
        return []
    stmt = _activity_select().where(
        (activities.c.contact_id.in_(contact_ids or [-1]))
        | (activities.c.deal_id.in_(deal_ids or [-1]))
    )
    return [as_dict(r) for r in conn.execute(stmt)]


def stage_changes_for(conn: Connection, deal_ids: list[int]) -> list[dict]:
    if not deal_ids:
        return []
    stmt = (
        select(deal_stage_changes, deals.c.name.label("deal_name"))
        .select_from(
            deal_stage_changes.join(deals, deal_stage_changes.c.deal_id == deals.c.id)
        )
        .where(deal_stage_changes.c.deal_id.in_(deal_ids))
    )
    return [as_dict(r) for r in conn.execute(stmt)]


def deal_ids_for_organization(conn: Connection, org_id: int) -> list[int]:
    return [
        r.id
        for r in conn.execute(
            select(deals.c.id).where(deals.c.organization_id == org_id)
        )
    ]


def contact_ids_for_organization(conn: Connection, org_id: int) -> list[int]:
    stmt = select(contacts.c.id).where(contacts.c.organization_id == org_id)
    return [r.id for r in conn.execute(stmt)]


def deal_ids_with_main_contact(conn: Connection, contact_id: int) -> list[int]:
    stmt = select(deals.c.id).where(deals.c.main_contact_id == contact_id)
    return [r.id for r in conn.execute(stmt)]


def open_follow_ups(conn: Connection) -> list[dict]:
    """Activities with a follow-up date that are not done, with their names."""
    stmt = _activity_select().where(
        activities.c.follow_up_on.is_not(None), activities.c.done.is_(False)
    )
    return [as_dict(r) for r in conn.execute(stmt)]


def _count(conn: Connection, stmt) -> int:
    return len(conn.execute(stmt).all())
