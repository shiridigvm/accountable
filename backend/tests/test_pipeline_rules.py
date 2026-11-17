from datetime import date

from accountable.rules.pipeline import build_board

TODAY = date(2026, 11, 17)


def deal(id_, stage, value, position, probability=50, expected=date(2026, 12, 1)):
    return {
        "id": id_,
        "name": f"Deal {id_}",
        "stage": stage,
        "value_cents": value,
        "probability": probability,
        "expected_close": expected,
        "position": position,
    }


def test_board_totals_count_open_deals_only():
    deals = [
        deal(1, "New", 100_00, 0, probability=10),
        deal(2, "Negotiation", 200_00, 0, probability=75),
        deal(3, "Won", 300_00, 0, probability=100),
        deal(4, "Lost", 400_00, 0, probability=0),
    ]
    board = build_board(deals, TODAY)
    assert board["open_value_cents"] == 300_00
    assert board["open_expected_cents"] == 10_00 + 150_00


def test_closed_columns_have_no_expected_total():
    board = build_board([deal(1, "Won", 100_00, 0, probability=100)], TODAY)
    won = next(c for c in board["columns"] if c["stage"] == "Won")
    assert won["expected_cents"] is None
    assert won["value_cents"] == 100_00


def test_cards_are_ordered_by_position_within_a_column():
    deals = [deal(1, "New", 1, 2), deal(2, "New", 1, 0), deal(3, "New", 1, 1)]
    new = next(c for c in build_board(deals, TODAY)["columns"] if c["stage"] == "New")
    assert [d["id"] for d in new["deals"]] == [2, 3, 1]


def test_late_flag_is_derived_per_deal():
    board = build_board([deal(1, "New", 1, 0, expected=date(2026, 11, 1))], TODAY)
    assert board["columns"][0]["deals"][0]["late"] is True
