"""Timeline entries: activities and stage changes, merged newest first (R11, R12)."""


def stage_change_text(from_stage: str, to_stage: str) -> str:
    return f"Moved from {from_stage} to {to_stage}"


def activity_entry(row: dict) -> dict:
    return {
        "kind": "activity",
        "id": row["id"],
        "on": row["occurred_on"],
        "created_at": row["created_at"],
        "type": row["type"],
        "text": row["description"],
        "follow_up_on": row["follow_up_on"],
        "done": row["done"],
        "contact_id": row["contact_id"],
        "contact_name": row["contact_name"],
        "deal_id": row["deal_id"],
        "deal_name": row["deal_name"],
        "created_by": row["created_by"],
    }


def stage_change_entry(row: dict) -> dict:
    return {
        "kind": "stage_change",
        "id": row["id"],
        "on": row["changed_on"],
        "created_at": row["created_at"],
        "text": stage_change_text(row["from_stage"], row["to_stage"]),
        "from_stage": row["from_stage"],
        "to_stage": row["to_stage"],
        "deal_id": row["deal_id"],
        "deal_name": row["deal_name"],
    }


def merge_newest_first(entries: list[dict]) -> list[dict]:
    """Newest date first. Ties go to the entry created last, so order is stable."""
    return sorted(
        entries,
        key=lambda e: (e["on"], e["created_at"], e["kind"], e["id"]),
        reverse=True,
    )
