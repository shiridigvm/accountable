"""Deal writes that touch stage rules, board order and stage history (R5, R6, R17, R18, R19)."""

from datetime import date, datetime

from sqlalchemy.engine import Connection

from accountable import store
from accountable.rules.stages import (
    DEFAULT_PROBABILITY,
    actual_close_after_move,
    probability_after_move,
)


class NotFound(Exception):
    pass


def _fetch(conn: Connection, deal_id: int) -> dict:
    deal = store.raw_deal(conn, deal_id)
    if deal is None:
        raise NotFound(f"Deal {deal_id} was not found.")
    return deal


def create_deal(conn: Connection, data: dict, today: date) -> int:
    stage = data["stage"]
    probability = data.get("probability")
    if probability is None:
        probability = DEFAULT_PROBABILITY[stage]
    actual = actual_close_after_move(None, stage, data.get("actual_close"), today)
    position = len(store.column_deal_ids(conn, stage))
    return store.insert_deal(
        conn,
        {
            **data,
            "probability": probability,
            "actual_close": actual,
            "position": position,
        },
    )


def move_deal(
    conn: Connection,
    deal_id: int,
    to_stage: str,
    position: int,
    today: date,
    now: datetime,
    by: str,
) -> None:
    """Place a deal in a column at a position, renumber both columns, log a stage change.

    Only the moved deal records who changed it. Renumbering the others is not a
    change to them (R44).
    """
    deal = _fetch(conn, deal_id)
    from_stage = deal["stage"]
    changed = from_stage != to_stage

    order = [i for i in store.column_deal_ids(conn, to_stage) if i != deal_id]
    index = max(0, min(position, len(order)))
    order.insert(index, deal_id)

    if changed:
        store.update_deal_fields(
            conn,
            deal_id,
            {
                "stage": to_stage,
                "probability": probability_after_move(
                    from_stage, to_stage, deal["probability"]
                ),
                "actual_close": actual_close_after_move(
                    from_stage, to_stage, deal["actual_close"], today
                ),
            },
        )
    store.update_deal_fields(conn, deal_id, {"updated_by": by})
    for pos, other_id in enumerate(order):
        store.set_deal_position(conn, other_id, pos)

    if changed:
        for pos, other_id in enumerate(store.column_deal_ids(conn, from_stage)):
            store.set_deal_position(conn, other_id, pos)
        store.insert_stage_change(conn, deal_id, from_stage, to_stage, today, now)


def update_deal(
    conn: Connection, deal_id: int, data: dict, today: date, now: datetime, by: str
) -> None:
    """Edit a deal. A stage change goes through move_deal, to the end of the new column."""
    deal = _fetch(conn, deal_id)
    data = dict(data)
    stage = data.pop("stage", None)
    if "probability" in data and data["probability"] is None:
        # An empty probability on edit means the stage default, not NULL.
        data["probability"] = DEFAULT_PROBABILITY[stage or deal["stage"]]
    if stage is not None and stage != deal["stage"]:
        end = len(store.column_deal_ids(conn, stage))
        move_deal(conn, deal_id, stage, end, today, now, by)
    # A probability sent with the request is typed by hand, so it wins over the stage default.
    store.update_deal_fields(conn, deal_id, data | {"updated_by": by})


def delete_deal(conn: Connection, deal_id: int) -> None:
    deal = _fetch(conn, deal_id)
    store.delete_deal(conn, deal_id)
    for pos, other_id in enumerate(store.column_deal_ids(conn, deal["stage"])):
        store.set_deal_position(conn, other_id, pos)
