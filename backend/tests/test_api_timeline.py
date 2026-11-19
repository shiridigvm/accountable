"""Timelines (R11): merged newest first, with the organization and contact rules from the spec."""


def test_organization_timeline_merges_contact_and_deal_activity_and_stage_changes(
    client,
):
    org = client.post("/api/organizations", json={"name": "Merge Co"}).json()
    contact = client.post(
        "/api/contacts", json={"name": "Lee", "organization_id": org["id"]}
    ).json()
    deal = client.post(
        "/api/deals",
        json={
            "name": "Merge deal",
            "stage": "New",
            "value_cents": 100,
            "expected_close": "2027-01-01",
            "organization_id": org["id"],
        },
    ).json()
    client.post(
        "/api/activities",
        json={
            "type": "call",
            "description": "Call with Lee",
            "contact_id": contact["id"],
            "occurred_on": "2026-11-10",
        },
    )
    client.post(
        "/api/activities",
        json={
            "type": "note",
            "description": "Deal note",
            "deal_id": deal["id"],
            "occurred_on": "2026-11-12",
        },
    )
    client.post(
        f"/api/deals/{deal['id']}/move", json={"stage": "Qualified", "position": 0}
    )

    timeline = client.get(f"/api/organizations/{org['id']}/timeline").json()
    texts = [entry["text"] for entry in timeline]
    assert "Moved from New to Qualified" in texts
    assert "Call with Lee" in texts and "Deal note" in texts
    dates = [entry["on"] for entry in timeline if entry["kind"] == "activity"]
    assert dates == sorted(dates, reverse=True)


def test_contact_timeline_includes_deals_where_the_contact_is_main_contact(client):
    contact = client.post("/api/contacts", json={"name": "Main Person"}).json()
    deal = client.post(
        "/api/deals",
        json={
            "name": "Owned deal",
            "stage": "Proposal",
            "value_cents": 100,
            "expected_close": "2027-01-01",
            "main_contact_id": contact["id"],
        },
    ).json()
    client.post(
        "/api/activities",
        json={
            "type": "email",
            "description": "Sent proposal",
            "deal_id": deal["id"],
            "occurred_on": "2026-11-11",
        },
    )
    client.post(
        f"/api/deals/{deal['id']}/move", json={"stage": "Negotiation", "position": 0}
    )

    timeline = client.get(f"/api/contacts/{contact['id']}/timeline").json()
    texts = [entry["text"] for entry in timeline]
    assert "Sent proposal" in texts
    assert "Moved from Proposal to Negotiation" in texts


def test_unrelated_activity_is_not_in_a_contact_timeline(client):
    contact = client.post("/api/contacts", json={"name": "Alone"}).json()
    other = client.post("/api/contacts", json={"name": "Other"}).json()
    client.post(
        "/api/activities",
        json={"type": "note", "description": "For other", "contact_id": other["id"]},
    )
    assert client.get(f"/api/contacts/{contact['id']}/timeline").json() == []


def test_timeline_of_a_missing_record_is_not_found(client):
    assert client.get("/api/deals/99999/timeline").status_code == 404
