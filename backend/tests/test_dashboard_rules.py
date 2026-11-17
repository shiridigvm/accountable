from datetime import date

from accountable.rules.dashboard import (
    follow_ups,
    headline_stats,
    month_window,
    monthly_series,
)

TODAY = date(2026, 11, 17)


def deal(stage, value, expected, actual=None, probability=50):
    from accountable.rules.expected import expected_cents

    return {
        "stage": stage,
        "value_cents": value,
        "expected_close": expected,
        "actual_close": actual,
        "expected_cents": expected_cents(value, probability)
        if stage not in ("Won", "Lost")
        else 0,
    }


def test_window_runs_from_twelve_months_back_to_six_ahead():
    labels = month_window(TODAY)
    assert len(labels) == 19
    assert labels[0] == "2025-11"
    assert labels[12] == "2026-11"
    assert labels[-1] == "2027-05"


def test_won_deals_count_in_their_actual_close_month():
    deals = [deal("Won", 100_00, date(2026, 10, 1), actual=date(2026, 10, 28))]
    series = {m["month"]: m for m in monthly_series(TODAY, deals)}
    assert series["2026-10"]["won_count"] == 1
    assert series["2026-10"]["won_cents"] == 100_00


def test_open_deals_count_in_their_expected_close_month_ahead():
    deals = [deal("Proposal", 200_00, date(2027, 1, 15), probability=50)]
    series = {m["month"]: m for m in monthly_series(TODAY, deals)}
    assert series["2027-01"]["expected_count"] == 1
    assert series["2027-01"]["expected_cents"] == 100_00


def test_deals_outside_the_window_are_left_out():
    deals = [deal("Won", 50_00, date(2020, 1, 1), actual=date(2020, 1, 5))]
    assert sum(m["won_count"] for m in monthly_series(TODAY, deals)) == 0


def test_headline_stats_match_the_deal_rows():
    deals = [
        deal("Won", 100_00, date(2026, 3, 1), actual=date(2026, 3, 3)),
        deal("Won", 50_00, date(2025, 3, 1), actual=date(2025, 3, 3)),
        deal("New", 40_00, date(2026, 11, 1), probability=10),
        deal("Qualified", 60_00, date(2027, 2, 1), probability=25),
    ]
    stats = headline_stats(TODAY, deals)
    assert stats["won_year_count"] == 1
    assert stats["won_year_cents"] == 100_00
    assert stats["open_count"] == 2
    assert stats["open_cents"] == 100_00
    assert stats["expected_cents"] == 4_00 + 15_00
    assert stats["late_count"] == 1


def row(id_, due, done=False, description="Call"):
    return {
        "id": id_,
        "follow_up_on": due,
        "done": done,
        "description": description,
        "contact_name": "Priya Nair",
        "deal_name": None,
    }


def test_follow_ups_split_into_overdue_and_upcoming():
    rows = [
        row(1, date(2026, 11, 10)),
        row(2, date(2026, 11, 20)),
        row(3, date(2026, 12, 15)),
        row(4, date(2026, 11, 21), done=True),
        row(5, None),
    ]
    result = follow_ups(TODAY, rows)
    assert [(f["id"], f["status"]) for f in result] == [(1, "overdue"), (2, "upcoming")]


def test_follow_up_due_today_is_upcoming_not_overdue():
    result = follow_ups(TODAY, [row(1, TODAY)])
    assert result[0]["status"] == "upcoming"
