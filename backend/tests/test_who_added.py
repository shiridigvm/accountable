"""Who added and last changed a record (R44, R46)."""

import pytest
from conftest import USER, sign_in


@pytest.fixture
def other(client):
    """A second person on the same app and database."""
    from accountable.main import app
    from fastapi.testclient import TestClient

    second = TestClient(app)
    sign_in(second, "ben@example.com")
    return second


def _org(client, name="Acme"):
    return client.post("/api/organizations", json={"name": name}).json()


def _contact(client):
    return client.post("/api/contacts", json={"name": "Ana", "status": "lead"}).json()


def _deal(client, name="Deal", stage="New"):
    body = {
        "name": name,
        "stage": stage,
        "value_cents": 1000,
        "expected_close": "2026-12-01",
    }
    return client.post("/api/deals", json=body).json()


def _activity(client, contact_id):
    body = {"type": "note", "description": "Hi", "contact_id": contact_id}
    return client.post("/api/activities", json=body).json()


def test_new_records_are_added_by_the_signed_in_person(client):
    contact = _contact(client)
    for record in (
        _org(client),
        contact,
        _deal(client),
        _activity(client, contact["id"]),
    ):
        assert record["created_by"] == USER
    for record in (_org(client), _contact(client), _deal(client)):
        assert record["updated_by"] == USER


def test_an_edit_changes_only_who_last_changed_it(client, other):
    org = _org(client)
    contact = _contact(client)
    deal = _deal(client)
    edited = [
        other.patch(f"/api/organizations/{org['id']}", json={"notes": "x"}).json(),
        other.patch(f"/api/contacts/{contact['id']}", json={"phone": "1"}).json(),
        other.patch(f"/api/deals/{deal['id']}", json={"value_cents": 5}).json(),
    ]
    for record in edited:
        assert record["created_by"] == USER
        assert record["updated_by"] == "ben@example.com"


def test_who_is_never_taken_from_the_request_body(client):
    body = {"name": "Sneaky", "created_by": "boss@example.com", "updated_by": "x"}
    org = client.post("/api/organizations", json=body).json()
    assert org["created_by"] == org["updated_by"] == USER
    patched = client.patch(
        f"/api/organizations/{org['id']}", json={"updated_by": "boss@example.com"}
    ).json()
    assert patched["updated_by"] == USER


def test_moving_a_deal_changes_only_the_moved_deal(client, other):
    first = _deal(client, "First")
    second = _deal(client, "Second")
    moved = other.post(
        f"/api/deals/{second['id']}/move", json={"stage": "New", "position": 0}
    ).json()
    assert moved["updated_by"] == "ben@example.com"
    renumbered = client.get(f"/api/deals/{first['id']}").json()
    assert renumbered["position"] == 1
    assert renumbered["updated_by"] == USER


def test_moving_to_another_column_changes_the_moved_deal(client, other):
    deal = _deal(client)
    other.post(f"/api/deals/{deal['id']}/move", json={"stage": "Won", "position": 0})
    assert client.get(f"/api/deals/{deal['id']}").json()["updated_by"] == (
        "ben@example.com"
    )


def test_marking_an_activity_done_is_a_change(client, other):
    contact = _contact(client)
    activity = _activity(client, contact["id"])
    other.patch(f"/api/activities/{activity['id']}", json={"done": True})
    stored = client.get("/api/activities", params={"contact_id": contact["id"]}).json()
    assert stored[0]["done"] is True
    assert stored[0]["created_by"] == USER


def test_timeline_activities_show_who_added_them(client):
    contact = _contact(client)
    _activity(client, contact["id"])
    timeline = client.get(f"/api/contacts/{contact['id']}/timeline").json()
    assert timeline[0]["created_by"] == USER
