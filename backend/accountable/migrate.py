"""Runs the Alembic migrations from code, on SQLite and Postgres alike (R28)."""

from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy import inspect
from sqlalchemy.engine import Engine

MIGRATIONS = Path(__file__).resolve().parent / "migrations"
APP_TABLES = {"organizations", "contacts", "deals", "activities", "deal_stage_changes"}
BASELINE = "0001"


def run_migrations(engine: Engine) -> bool:
    """Bring the schema up to date. Returns True when the database had no tables before."""
    with engine.begin() as conn:
        tables = set(inspect(conn).get_table_names())
        config = Config()
        config.set_main_option("script_location", str(MIGRATIONS))
        config.attributes["connection"] = conn
        if tables & APP_TABLES and "alembic_version" not in tables:
            # Made by create_all before migrations existed: it matches the baseline.
            command.stamp(config, BASELINE)
        command.upgrade(config, "head")
    return not tables & APP_TABLES
