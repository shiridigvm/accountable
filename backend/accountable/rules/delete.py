"""Delete refusals (R14). A record with linked records cannot be deleted."""

from dataclasses import dataclass, field

SINGULAR = {
    "activities": "activity",
    "contacts": "contact",
    "deals": "deal",
    "deals as main contact": "deal as main contact",
}


@dataclass
class DeleteRefused(Exception):
    """Raised when a record still has linked records. Maps to HTTP 409."""

    record: str
    linked: dict[str, int] = field(default_factory=dict)

    def message(self) -> str:
        parts = []
        for name, count in self.linked.items():
            if count:
                label = name if count != 1 else SINGULAR.get(name, name)
                parts.append(f"{count} {label}")
        listed = ", ".join(parts)
        return (
            f"This {self.record} cannot be deleted yet. It has {listed}. "
            "Remove or move those first."
        )


def check_deletable(record: str, linked: dict[str, int]) -> None:
    if any(count > 0 for count in linked.values()):
        raise DeleteRefused(
            record=record, linked={k: v for k, v in linked.items() if v}
        )
