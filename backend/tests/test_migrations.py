"""Migrations on SQLite (R28, R45). Postgres is checked by hand, see plan.md."""

from datetime import datetime

from accountable.db import make_engine
from accountable.migrate import run_migrations
from sqlalchemy import (
    Column,
    Integer,
    MetaData,
    String,
    Table,
    insert,
    inspect,
    select,
    text,
)


def _url(tmp_path):
    return f"sqlite:///{tmp_path / 'm.db'}"


def test_a_new_database_is_migrated_and_reported_new(tmp_path):
    engine = make_engine(_url(tmp_path))
    assert run_migrations(engine) is True
    columns = {c["name"] for c in inspect(engine).get_columns("deals")}
    assert {"created_by", "updated_by"} <= columns
    with engine.connect() as conn:
        assert conn.execute(
            text("SELECT version_num FROM alembic_version")
        ).scalar() == ("0003")


def test_a_second_run_changes_nothing(tmp_path):
    engine = make_engine(_url(tmp_path))
    run_migrations(engine)
    assert run_migrations(engine) is False


def _old_schema(engine):
    """The tables as create_all made them before migrations existed."""
    old = MetaData()
    Table(
        "organizations",
        old,
        Column("id", Integer, primary_key=True),
        Column("name", String, nullable=False),
        Column("website", String),
        Column("industry", String),
        Column("notes", String),
    )
    for name in ("contacts", "deals", "activities", "deal_stage_changes"):
        Table(name, old, Column("id", Integer, primary_key=True))
    old.create_all(engine)
    return old


def test_a_database_from_before_migrations_is_upgraded_and_kept(tmp_path):
    engine = make_engine(_url(tmp_path))
    old = _old_schema(engine)
    with engine.begin() as conn:
        conn.execute(insert(old.tables["organizations"]).values(name="Kept"))

    assert run_migrations(engine) is False

    from accountable.schema import organizations

    with engine.connect() as conn:
        row = conn.execute(select(organizations)).one()
    assert row.name == "Kept"
    assert row.created_by == row.updated_by == "Unknown"


def test_row_level_security_does_nothing_on_sqlite(tmp_path):
    engine = make_engine(_url(tmp_path))
    run_migrations(engine)
    from accountable.schema import activities, contacts

    # The tables still work as normal after the Postgres-only migration.
    with engine.begin() as conn:
        conn.execute(
            insert(contacts).values(
                id=1, name="A", status="lead", created_by="a@x", updated_by="a@x"
            )
        )
        conn.execute(
            insert(activities).values(
                type="note",
                description="d",
                occurred_on=datetime(2026, 1, 1).date(),
                done=False,
                created_at=datetime(2026, 1, 1),
                contact_id=1,
                created_by="a@x",
                updated_by="a@x",
            )
        )
