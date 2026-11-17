"""Seed counts (R27, R28) and persistence across restarts (R25)."""

import json
from pathlib import Path

from accountable.config import PROJECT_ROOT
from fastapi.testclient import TestClient


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


def test_changes_survive_a_restart(db_path):
    from accountable.main import app

    with TestClient(app) as first:
        first.post("/api/organizations", json={"name": "Kept after restart"})
    with TestClient(app) as second:
        names = [o["name"] for o in second.get("/api/organizations").json()]
    assert "Kept after restart" in names


def test_startup_does_not_reseed_an_existing_database(db_path):
    from accountable.main import app

    with TestClient(app) as first:
        first.post("/api/organizations", json={"name": "Extra"})
        count = len(first.get("/api/organizations").json())
    with TestClient(app) as second:
        assert len(second.get("/api/organizations").json()) == count == 7


def test_first_start_creates_and_seeds_a_new_database(db_path):
    from accountable.main import app

    assert not Path(db_path).exists()
    with TestClient(app) as test_client:
        assert len(test_client.get("/api/organizations").json()) == 6
    assert Path(db_path).exists()


def test_dev_server_listens_on_loopback_only():
    from accountable.config import HOST

    assert HOST == "127.0.0.1"
    scripts = json.loads((PROJECT_ROOT / "package.json").read_text())["scripts"]
    assert "--host 127.0.0.1" in scripts["dev"]
