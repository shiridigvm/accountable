"""Shared fixtures. Every test gets its own database file and a fixed 'today'.

The app seeds a new database at startup. The `client` fixture clears that seed,
so each test starts empty and states its own data. Tests that need the sample
data call the reset endpoint.
"""

import pytest
from accountable.schema import metadata
from fastapi.testclient import TestClient
from sqlalchemy import delete

TODAY = "2026-11-17"


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    monkeypatch.setenv("ACCOUNTABLE_TODAY", TODAY)
    monkeypatch.setenv("ACCOUNTABLE_ALLOW_RESET", "1")
    return path


@pytest.fixture
def client(db_path):
    from accountable.main import app

    with TestClient(app) as test_client:
        with app.state.engine.begin() as conn:
            for table in reversed(metadata.sorted_tables):
                conn.execute(delete(table))
        yield test_client
