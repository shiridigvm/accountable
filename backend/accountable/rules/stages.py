"""Stage rules: default probability (R5) and the close date (R6)."""

from datetime import date

STAGES = ("New", "Qualified", "Proposal", "Negotiation", "Won", "Lost")
OPEN_STAGES = ("New", "Qualified", "Proposal", "Negotiation")
CLOSED_STAGES = ("Won", "Lost")

DEFAULT_PROBABILITY = {
    "New": 10,
    "Qualified": 25,
    "Proposal": 50,
    "Negotiation": 75,
    "Won": 100,
    "Lost": 0,
}


def is_open(stage: str) -> bool:
    return stage in OPEN_STAGES


def probability_after_move(from_stage: str | None, to_stage: str, current: int) -> int:
    """A stage change resets the probability to the stage's usual value.

    Staying in the same stage keeps a probability that was typed by hand.
    """
    if from_stage == to_stage:
        return current
    return DEFAULT_PROBABILITY[to_stage]


def actual_close_after_move(
    from_stage: str | None,
    to_stage: str,
    current_actual: date | None,
    today: date,
) -> date | None:
    """Won or Lost sets today's date unless one exists. Reopening clears it."""
    if from_stage == to_stage:
        return current_actual
    if to_stage in CLOSED_STAGES:
        return current_actual or today
    if from_stage in CLOSED_STAGES:
        # An open deal has no outcome, so the old close date goes.
        return None
    return current_actual
