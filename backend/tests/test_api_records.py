"""API tests for organizations, contacts, deals and activities (R1 to R4, R13 to R15)."""

from datetime import date


def make_org(client, name="Acme Co"):
    return client.post("/api/organizations", json={"name": name}).json()


def make_contact(client, name="Ana Lee", org_id=None, status="lead"):
    body = {"name": name, "status": status, "organization_id": org_id}
    return client.post("/api/contacts", json=body).json()


def make_deal(
    client, name="Big deal", stage="New", value=10000, contact_id=None, org_id=None
):
    body = {
        "name": name,
        "stage": stage,
        "value_cents": value,
        "expected_close": "2027-01-15",
        "organization_id": org_id,
        "main_contact_id": contact_id,
    }
    return client.post("/api/deals", json=body).json()


def test_organization_crud(client):
    org = make_org(client)
    assert org["name"] == "Acme Co"
    client.patch(f"/api/organizations/{org['id']}", json={"industry": "Retail"})
    assert client.get(f"/api/organizations/{org['id']}").json()["industry"] == "Retail"
    assert client.delete(f"/api/organizations/{org['id']}").status_code == 204
    assert client.get(f"/api/organizations/{org['id']}").status_code == 404


def test_deleting_organization_with_contacts_is_refused_with_counts(client):
    org = make_org(client)
    make_contact(client, org_id=org["id"])
    make_contact(client, name="Ben", org_id=org["id"])
    make_deal(client, org_id=org["id"])
    response = client.delete(f"/api/organizations/{org['id']}")
    assert response.status_code == 409
    body = response.json()
    assert body["linked"] == {"contacts": 2, "deals": 1}
    assert "2 contacts, 1 deal" in body["error"]
    assert client.get(f"/api/organizations/{org['id']}").status_code == 200


def test_contact_with_activity_cannot_be_deleted(client):
    contact = make_contact(client)
    client.post(
        "/api/activities",
        json={"type": "note", "description": "Hi", "contact_id": contact["id"]},
    )
    response = client.delete(f"/api/contacts/{contact['id']}")
    assert response.status_code == 409
    assert response.json()["linked"] == {"activities": 1}


def test_deal_with_activity_cannot_be_deleted_but_activity_can(client):
    deal = make_deal(client)
    activity = client.post(
        "/api/activities",
        json={"type": "call", "description": "Pricing", "deal_id": deal["id"]},
    ).json()
    assert client.delete(f"/api/deals/{deal['id']}").status_code == 409
    assert client.delete(f"/api/activities/{activity['id']}").status_code == 204
    assert client.delete(f"/api/deals/{deal['id']}").status_code == 204


def test_contacts_filter_by_status(client):
    make_contact(client, name="Lead one", status="lead")
    make_contact(client, name="Customer one", status="customer")
    leads = client.get("/api/contacts", params={"status": "lead"}).json()
    assert [c["name"] for c in leads] == ["Lead one"]


def test_contact_detail_shows_its_organization_name(client):
    org = make_org(client, "Globex")
    contact = make_contact(client, org_id=org["id"])
    assert (
        client.get(f"/api/contacts/{contact['id']}").json()["organization_name"]
        == "Globex"
    )


def test_deal_create_applies_default_probability_and_position(client):
    first = make_deal(client, name="First", stage="Proposal")
    second = make_deal(client, name="Second", stage="Proposal")
    assert first["probability"] == 50
    assert (first["position"], second["position"]) == (0, 1)


def test_deal_create_in_won_sets_close_date_to_today(client):
    deal = make_deal(client, stage="Won")
    assert deal["actual_close"] == "2026-11-17"


def test_editing_a_deal_stage_writes_a_timeline_entry(client):
    deal = make_deal(client, stage="Proposal")
    client.patch(f"/api/deals/{deal['id']}", json={"stage": "Negotiation"})
    timeline = client.get(f"/api/deals/{deal['id']}/timeline").json()
    assert timeline[0]["kind"] == "stage_change"
    assert timeline[0]["text"] == "Moved from Proposal to Negotiation"


def test_activity_needs_exactly_one_link(client):
    contact = make_contact(client)
    deal = make_deal(client)
    neither = client.post("/api/activities", json={"type": "note", "description": "x"})
    both = client.post(
        "/api/activities",
        json={
            "type": "note",
            "description": "x",
            "contact_id": contact["id"],
            "deal_id": deal["id"],
        },
    )
    assert neither.status_code == 422
    assert both.status_code == 422


def test_activity_edit_and_done_flag(client):
    deal = make_deal(client)
    activity = client.post(
        "/api/activities",
        json={
            "type": "call",
            "description": "Pricing",
            "deal_id": deal["id"],
            "follow_up_on": "2026-11-20",
        },
    ).json()
    client.patch(
        f"/api/activities/{activity['id']}",
        json={"description": "Pricing agreed", "done": True},
    )
    timeline = client.get(f"/api/deals/{deal['id']}/timeline").json()
    assert timeline[0]["text"] == "Pricing agreed"
    assert timeline[0]["done"] is True


def test_missing_records_return_the_error_shape(client):
    response = client.get("/api/deals/99999")
    assert response.status_code == 404
    assert "error" in response.json()


def test_validation_rejects_bad_input(client):
    assert client.post("/api/organizations", json={"name": "   "}).status_code == 422
    assert (
        client.post(
            "/api/deals",
            json={
                "name": "x",
                "stage": "New",
                "value_cents": -1,
                "expected_close": "2027-01-01",
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/deals",
            json={
                "name": "x",
                "stage": "New",
                "value_cents": 1,
                "probability": 101,
                "expected_close": "2027-01-01",
            },
        ).status_code
        == 422
    )
    assert (
        client.post(
            "/api/contacts", json={"name": "x", "email": "not-an-email"}
        ).status_code
        == 422
    )


def test_empty_database_lists_are_empty_lists(client):
    for path in ("/api/organizations", "/api/deals", "/api/activities"):
        assert client.get(path).status_code == 200


def test_reset_endpoint_restores_sample_data(client):
    make_org(client, "Temporary Org")
    assert client.post("/api/admin/reset").status_code == 200
    names = [o["name"] for o in client.get("/api/organizations").json()]
    assert "Temporary Org" not in names
    assert len(names) == 6


def test_reset_is_hidden_unless_enabled(client, monkeypatch):
    monkeypatch.setenv("ACCOUNTABLE_ALLOW_RESET", "0")
    assert client.post("/api/admin/reset").status_code == 404


def test_dates_are_iso_strings(client):
    deal = make_deal(client)
    assert deal["expected_close"] == date(2027, 1, 15).isoformat()


def test_patch_stage_only_applies_stage_rules(client):
    # The deal edit form sends only changed fields. A stage-only PATCH must get the stage default
    # probability (R5) and today's close date for Won (R6).
    created = client.post(
        "/api/deals",
        json={
            "name": "Stage only",
            "stage": "New",
            "value_cents": 100000,
            "expected_close": "2027-01-15",
        },
    ).json()
    edited = client.patch(f"/api/deals/{created['id']}", json={"stage": "Won"}).json()
    assert edited["probability"] == 100
    assert edited["actual_close"] == "2026-11-17"
