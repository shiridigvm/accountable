"""Dashboard figures match the data (R22 to R24)."""


def test_dashboard_reflects_a_won_deal_and_a_new_follow_up(client):
    before = client.get("/api/dashboard").json()["stats"]["won_year_count"]
    deal = client.post(
        "/api/deals",
        json={
            "name": "Won today",
            "stage": "Negotiation",
            "value_cents": 5000_00,
            "expected_close": "2026-11-30",
        },
    ).json()
    client.post(f"/api/deals/{deal['id']}/move", json={"stage": "Won", "position": 0})
    client.post(
        "/api/activities",
        json={
            "type": "call",
            "description": "Check in",
            "deal_id": deal["id"],
            "follow_up_on": "2026-11-18",
        },
    )
    dashboard = client.get("/api/dashboard").json()
    assert dashboard["stats"]["won_year_count"] == before + 1
    assert dashboard["follow_ups"][0]["status"] == "upcoming"
    assert dashboard["recent"][0]["kind"] in ("activity", "stage_change")


def test_dashboard_has_19_months_and_the_seed_figures(client):
    client.post("/api/admin/reset")
    dashboard = client.get("/api/dashboard").json()
    assert len(dashboard["monthly"]) == 19
    stats = dashboard["stats"]
    assert stats["open_count"] == 15
    assert stats["late_count"] == 3
    assert len(dashboard["recent"]) == 8


def test_pipeline_figures_agree_with_the_dashboard(client):
    client.post("/api/admin/reset")
    board = client.get("/api/pipeline").json()
    stats = client.get("/api/dashboard").json()["stats"]
    assert board["open_value_cents"] == stats["open_cents"]
    assert board["open_expected_cents"] == stats["expected_cents"]


def test_dashboard_with_no_deals_shows_zero(client):
    stats = client.get("/api/dashboard").json()["stats"]
    assert stats["open_count"] == 0
    assert stats["won_year_cents"] == 0
