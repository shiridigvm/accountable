"""Database engine for SQLite or Postgres."""

from pathlib import Path

from sqlalchemy import create_engine, event
from sqlalchemy.engine import Engine


def make_engine(url: str) -> Engine:
    if not url.startswith("sqlite"):
        # Supabase's pooler drops idle connections, and Render sleeps between visits.
        return create_engine(url, pool_pre_ping=True)

    Path(url.removeprefix("sqlite:///")).parent.mkdir(parents=True, exist_ok=True)
    engine = create_engine(url, connect_args={"check_same_thread": False})

    @event.listens_for(engine, "connect")
    def _enable_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

    return engine
