"""Board layout: deals grouped by stage with totals (R16, R20). Pure over plain dicts."""

from datetime import date

from accountable.rules.expected import expected_cents, is_late
from accountable.rules.stages import DEFAULT_PROBABILITY, STAGES, is_open


def with_derived(deal: dict, today: date) -> dict:
    """Add expected revenue and the late flag to a deal row."""
    return {
        **deal,
        "expected_cents": expected_cents(deal["value_cents"], deal["probability"]),
        "late": is_late(deal["stage"], deal["expected_close"], today),
    }


def build_board(deals: list[dict], today: date) -> dict:
    rows = [with_derived(d, today) for d in deals]
    columns = []
    for stage in STAGES:
        in_stage = sorted(
            (r for r in rows if r["stage"] == stage),
            key=lambda r: (r["position"], r["id"]),
        )
        open_stage = is_open(stage)
        columns.append(
            {
                "stage": stage,
                "probability": DEFAULT_PROBABILITY[stage],
                "open": open_stage,
                "count": len(in_stage),
                "value_cents": sum(r["value_cents"] for r in in_stage),
                # Totals for Won and Lost are value only, so expected is None there.
                "expected_cents": sum(r["expected_cents"] for r in in_stage)
                if open_stage
                else None,
                "deals": in_stage,
            }
        )
    open_rows = [r for r in rows if is_open(r["stage"])]
    return {
        "columns": columns,
        "open_value_cents": sum(r["value_cents"] for r in open_rows),
        "open_expected_cents": sum(r["expected_cents"] for r in open_rows),
    }
