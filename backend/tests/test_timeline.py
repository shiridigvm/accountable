from datetime import date, datetime

from accountable.rules.timeline import (
    merge_newest_first,
    stage_change_text,
)


def entry(kind, id_, on, created):
    return {"kind": kind, "id": id_, "on": on, "created_at": created}


def test_stage_change_wording_matches_the_intent():
    assert (
        stage_change_text("Proposal", "Negotiation")
        == "Moved from Proposal to Negotiation"
    )


def test_merge_orders_newest_first_across_kinds():
    items = [
        entry("activity", 1, date(2026, 11, 1), datetime(2026, 11, 1, 9)),
        entry("stage_change", 2, date(2026, 11, 10), datetime(2026, 11, 10, 9)),
        entry("activity", 3, date(2026, 11, 5), datetime(2026, 11, 5, 9)),
    ]
    assert [i["id"] for i in merge_newest_first(items)] == [2, 3, 1]


def test_same_day_ties_break_on_creation_time():
    items = [
        entry("activity", 1, date(2026, 11, 5), datetime(2026, 11, 5, 9)),
        entry("activity", 2, date(2026, 11, 5), datetime(2026, 11, 5, 14)),
    ]
    assert [i["id"] for i in merge_newest_first(items)] == [2, 1]
