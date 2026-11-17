from datetime import date

from accountable.rules.expected import expected_cents, is_late

TODAY = date(2026, 11, 17)


def test_expected_is_value_times_probability():
    assert expected_cents(120000 * 100, 50) == 6000000


def test_expected_rounds_half_up_to_the_cent():
    # 1 cent at 50% is half a cent, which rounds up to 1 cent.
    assert expected_cents(1, 50) == 1
    # 3 cents at 25% is 0.75 cent, which rounds to 1 cent.
    assert expected_cents(3, 25) == 1


def test_lost_and_zero_probability_give_zero():
    assert expected_cents(45000 * 100, 0) == 0


def test_open_deal_past_expected_close_is_late():
    assert is_late("Qualified", date(2026, 11, 8), TODAY) is True


def test_open_deal_due_today_or_later_is_not_late():
    assert is_late("New", TODAY, TODAY) is False
    assert is_late("New", date(2026, 12, 1), TODAY) is False


def test_closed_deal_is_never_late():
    assert is_late("Won", date(2026, 1, 1), TODAY) is False
    assert is_late("Lost", date(2026, 1, 1), TODAY) is False
