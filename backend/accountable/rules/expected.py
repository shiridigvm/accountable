"""Expected revenue (R21) and the late flag (R10). Money is in integer cents."""

from datetime import date
from decimal import ROUND_HALF_UP, Decimal

from accountable.rules.stages import is_open


def expected_cents(value_cents: int, probability: int) -> int:
    """Value times probability, rounded half up to the cent."""
    exact = Decimal(value_cents) * Decimal(probability) / Decimal(100)
    return int(exact.quantize(Decimal(1), rounding=ROUND_HALF_UP))


def is_late(stage: str, expected_close: date, today: date) -> bool:
    return is_open(stage) and expected_close < today
