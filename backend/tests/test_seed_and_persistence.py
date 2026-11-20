"""Seed counts and refusal (R27, R28, R45) and persistence across restarts (R25)."""

from pathlib import Path

import pytest
from accountable import seed
from accountable.schema import metadata
from conftest import sign_in
from fastapi.testclient import TestClient
from sqlalchemy import delete


def test_seed_creates_the_sample_counts(client):
    client.post("/api/admin/reset")
    assert len(client.get("/api/organizations").json()) == 6
    assert len(client.get("/api/contacts").json()) == 20
    assert len(client.get("/api/deals").json()) == 25
    assert len(client.get("/api/activities").json()) == 40


def test_seed_is_repeatable(client):
    client.post("/api/admin/reset")
    first = [d["name"] for d in client.get("/api/deals").json()]
    client.post("/api/admin/reset")
    second = [d["name"] for d in client.get("/api/deals").json()]
    assert sorted(first) == sorted(second)


def test_sample_dates_move_with_today(client):
    client.post("/api/admin/reset")
    deals = client.get("/api/deals").json()
    assert any(d["late"] for d in deals)
    assert any(d["stage"] == "Won" and d["actual_close"] == "2026-11-03" for d in deals)


def test_sample_records_are_added_by_sample_data(client):
    client.post("/api/admin/reset")
    for path in ("organizations", "contacts", "deals"):
        for record in client.get(f"/api/{path}").json():
            assert record["created_by"] == record["updated_by"] == "Sample data"
    for entry in client.get("/api/activities").json():
        assert entry["created_by"] == "Sample data"


def test_changes_survive_a_restart(db_path):
    from accountable.main import app

    with TestClient(app) as first:
        sign_in(first)
        first.post("/api/organizations", json={"name": "Kept after restart"})
    with TestClient(app) as second:
        sign_in(second)
        names = [o["name"] for o in second.get("/api/organizations").json()]
    assert "Kept after restart" in names


def test_startup_does_not_reseed_an_existing_database(db_path):
    from accountable.main import app

    with TestClient(app) as first:
        sign_in(first)
        first.post("/api/organizations", json={"name": "Extra"})
        count = len(first.get("/api/organizations").json())
    with TestClient(app) as second:
        sign_in(second)
        assert len(second.get("/api/organizations").json()) == count == 7


def test_first_start_creates_and_seeds_a_new_database(db_path):
    from accountable.main import app

    assert not Path(db_path).exists()
    with TestClient(app) as test_client:
        sign_in(test_client)
        assert len(test_client.get("/api/organizations").json()) == 6
    assert Path(db_path).exists()


def test_a_database_emptied_by_hand_is_not_reseeded(db_path):
    """Seeding is for a database with no tables, not one whose records were deleted."""
    from accountable.main import app

    with TestClient(app), app.state.engine.begin() as conn:
        for table in reversed(metadata.sorted_tables):
            conn.execute(delete(table))
    with TestClient(app) as second:
        sign_in(second)
        assert second.get("/api/organizations").json() == []


def test_seed_command_refuses_postgres(monkeypatch, db_path):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@db.example:5432/postgres")
    touched = []
    monkeypatch.setattr(seed, "make_engine", lambda url: touched.append(url))
    with pytest.raises(SystemExit) as stop:
        seed.main()
    assert "nothing was changed" in str(stop.value.code)
    assert touched == []


def test_seed_command_resets_the_sqlite_file(db_path, capsys):
    seed.main()
    assert Path(db_path).exists()
    assert "Sample data written" in capsys.readouterr().out


def test_reset_is_refused_on_postgres(client, monkeypatch):
    monkeypatch.setenv("DATABASE_URL", "postgresql://user:pw@db.example:5432/postgres")
    assert client.post("/api/admin/reset").status_code == 404
