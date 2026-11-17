from datetime import date

from accountable.rules.stages import actual_close_after_move, probability_after_move

TODAY = date(2026, 11, 17)
EARLIER = date(2026, 10, 1)


def test_stage_change_sets_usual_probability():
    assert probability_after_move("New", "Proposal", current=10) == 50


def test_same_stage_keeps_hand_set_probability():
    assert probability_after_move("Proposal", "Proposal", current=35) == 35


def test_moving_to_won_sets_close_date_to_today():
    assert actual_close_after_move("Negotiation", "Won", None, TODAY) == TODAY


def test_moving_to_lost_sets_close_date_to_today():
    assert actual_close_after_move("Proposal", "Lost", None, TODAY) == TODAY


def test_existing_actual_close_is_not_replaced():
    assert actual_close_after_move("Negotiation", "Won", EARLIER, TODAY) == EARLIER


def test_won_to_lost_keeps_existing_close_date():
    assert actual_close_after_move("Won", "Lost", EARLIER, TODAY) == EARLIER


def test_moving_between_open_stages_leaves_close_date_alone():
    assert actual_close_after_move("New", "Qualified", None, TODAY) is None


def test_reopening_clears_close_date():
    assert actual_close_after_move("Won", "Negotiation", EARLIER, TODAY) is None
    assert probability_after_move("Won", "Negotiation", current=100) == 75
