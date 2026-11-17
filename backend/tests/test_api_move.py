"""Pipeline moves: stage rules (R5, R6), positions (R18) and board totals (R20)."""


def make(client, name, stage, value=10000):
    body = {
        "name": name,
        "stage": stage,
        "value_cents": value,
        "expected_close": "2027-01-15",
    }
    return client.post("/api/deals", json=body).json()


def column_names(client, stage):
    board = client.get("/api/pipeline").json()
    column = next(c for c in board["columns"] if c["stage"] == stage)
    return [d["name"] for d in column["deals"]]


def test_move_to_won_sets_stage_probability_and_close_date(client):
    deal = make(client, "Closer", "Negotiation")
    moved = client.post(
        f"/api/deals/{deal['id']}/move", json={"stage": "Won", "position": 0}
    ).json()
    assert moved["stage"] == "Won"
    assert moved["probability"] == 100
    assert moved["actual_close"] == "2026-11-17"


def test_move_within_column_changes_order_and_survives_reads(client):
    a = make(client, "A", "New")
    make(client, "B", "New")
    make(client, "C", "New")
    client.post(f"/api/deals/{a['id']}/move", json={"stage": "New", "position": 2})
    assert column_names(client, "New") == ["B", "C", "A"]
    assert column_names(client, "New") == ["B", "C", "A"]


def test_move_between_columns_renumbers_both(client):
    a = make(client, "A", "New")
    b = make(client, "B", "New")
    make(client, "C", "Qualified")
    client.post(
        f"/api/deals/{a['id']}/move", json={"stage": "Qualified", "position": 0}
    )
    assert column_names(client, "New") == ["B"]
    assert column_names(client, "Qualified") == ["A", "C"]
    client.post(
        f"/api/deals/{b['id']}/move", json={"stage": "Qualified", "position": 1}
    )
    assert column_names(client, "Qualified") == ["A", "B", "C"]


def test_position_beyond_the_column_end_goes_last(client):
    a = make(client, "A", "New")
    make(client, "B", "New")
    client.post(f"/api/deals/{a['id']}/move", json={"stage": "New", "position": 99})
    assert column_names(client, "New") == ["B", "A"]


def test_move_logs_a_stage_change_with_the_intent_wording(client):
    deal = make(client, "Ledger", "Proposal")
    client.post(
        f"/api/deals/{deal['id']}/move", json={"stage": "Negotiation", "position": 0}
    )
    timeline = client.get(f"/api/deals/{deal['id']}/timeline").json()
    assert timeline[0]["text"] == "Moved from Proposal to Negotiation"


def test_board_totals_change_as_soon_as_a_card_moves(client):
    deal = make(client, "Mover", "New", value=100_00)
    before = client.get("/api/pipeline").json()
    assert before["open_value_cents"] == 100_00
    client.post(f"/api/deals/{deal['id']}/move", json={"stage": "Won", "position": 0})
    after = client.get("/api/pipeline").json()
    assert after["open_value_cents"] == 0
    won = next(c for c in after["columns"] if c["stage"] == "Won")
    assert won["value_cents"] == 100_00


def test_reopening_a_won_deal_clears_its_close_date(client):
    deal = make(client, "Reopen me", "New")
    client.post(f"/api/deals/{deal['id']}/move", json={"stage": "Won", "position": 0})
    reopened = client.post(
        f"/api/deals/{deal['id']}/move", json={"stage": "Negotiation", "position": 0}
    ).json()
    assert reopened["actual_close"] is None
    assert reopened["probability"] == 75


def test_deleting_a_deal_closes_the_gap_in_its_column(client):
    a = make(client, "A", "New")
    make(client, "B", "New")
    make(client, "C", "New")
    client.delete(f"/api/deals/{a['id']}")
    assert column_names(client, "New") == ["B", "C"]
