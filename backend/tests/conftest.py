"""Shared fixtures. Every test gets its own database file and a fixed 'today'.

The app seeds a new database at startup. The `client` fixture clears that seed,
so each test starts empty and states its own data. Tests that need the sample
data call the reset endpoint.

`client` is signed in as USER through test sign-in. `anon_client` sends no token.
The Supabase settings and DATABASE_URL are removed, so no test reaches Supabase
or Postgres, whatever the shell or .env holds.
"""

import pytest
from accountable import auth
from accountable.schema import metadata
from fastapi.testclient import TestClient
from sqlalchemy import delete

TODAY = "2026-11-17"
USER = "tester@example.com"


@pytest.fixture(autouse=True)
def isolated_env(monkeypatch):
    for name in ("DATABASE_URL", "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY"):
        monkeypatch.delenv(name, raising=False)
    monkeypatch.setenv("ACCOUNTABLE_TEST_SIGN_IN", "1")
    auth.clear()
    yield
    auth.clear()


@pytest.fixture
def db_path(tmp_path, monkeypatch):
    path = tmp_path / "test.db"
    monkeypatch.setenv("ACCOUNTABLE_DB", str(path))
    monkeypatch.setenv("ACCOUNTABLE_TODAY", TODAY)
    monkeypatch.setenv("ACCOUNTABLE_ALLOW_RESET", "1")
    return path


def sign_in(test_client: TestClient, email: str = USER) -> None:
    reply = test_client.post("/api/auth/test-sign-in", json={"email": email})
    test_client.headers["Authorization"] = f"Bearer {reply.json()['access_token']}"


@pytest.fixture
def client(db_path):
    from accountable.main import app

    with TestClient(app) as test_client:
        with app.state.engine.begin() as conn:
            for table in reversed(metadata.sorted_tables):
                conn.execute(delete(table))
        sign_in(test_client)
        yield test_client


@pytest.fixture
def anon_client(client):
    """No token. Shares the app and database that `client` started."""
    from accountable.main import app

    return TestClient(app)
