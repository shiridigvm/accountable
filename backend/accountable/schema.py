"""Table definitions (SQLAlchemy Core). The check constraints back up the API rules.

The migrations in migrations/ create and change the tables. Keep this file in step.
"""

from sqlalchemy import (
    Boolean,
    CheckConstraint,
    Column,
    Date,
    DateTime,
    ForeignKey,
    Integer,
    MetaData,
    String,
    Table,
    Text,
)

metadata = MetaData()


def _who() -> list[Column]:
    """Who added and last changed a record (R44). Migrations own the real schema;
    these definitions are kept in step with them for queries."""
    return [
        Column("created_by", String, nullable=False, server_default="Unknown"),
        Column("updated_by", String, nullable=False, server_default="Unknown"),
    ]


organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("website", String),
    Column("industry", String),
    Column("notes", Text),
    *_who(),
)

contacts = Table(
    "contacts",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("email", String),
    Column("phone", String),
    Column("job_title", String),
    Column("status", String, nullable=False),
    Column("organization_id", Integer, ForeignKey("organizations.id")),
    *_who(),
    CheckConstraint(
        "status IN ('lead', 'qualified', 'customer')", name="contact_status"
    ),
)

deals = Table(
    "deals",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("stage", String, nullable=False),
    Column("value_cents", Integer, nullable=False),
    Column("probability", Integer, nullable=False),
    Column("expected_close", Date, nullable=False),
    Column("actual_close", Date),
    Column("organization_id", Integer, ForeignKey("organizations.id")),
    Column("main_contact_id", Integer, ForeignKey("contacts.id")),
    Column("position", Integer, nullable=False),
    *_who(),
    CheckConstraint("value_cents >= 0", name="deal_value_non_negative"),
    CheckConstraint("probability BETWEEN 0 AND 100", name="deal_probability_range"),
    CheckConstraint(
        "stage IN ('New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')",
        name="deal_stage",
    ),
)

activities = Table(
    "activities",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("type", String, nullable=False),
    Column("description", Text, nullable=False),
    Column("occurred_on", Date, nullable=False),
    Column("follow_up_on", Date),
    Column("done", Boolean, nullable=False, default=False),
    Column("created_at", DateTime, nullable=False),
    Column("contact_id", Integer, ForeignKey("contacts.id")),
    Column("deal_id", Integer, ForeignKey("deals.id")),
    *_who(),
    CheckConstraint("type IN ('note', 'call', 'email')", name="activity_type"),
    # Exactly one of contact_id or deal_id is set.
    CheckConstraint(
        "(contact_id IS NULL) <> (deal_id IS NULL)", name="activity_one_link"
    ),
)

deal_stage_changes = Table(
    "deal_stage_changes",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("deal_id", Integer, ForeignKey("deals.id"), nullable=False),
    Column("from_stage", String, nullable=False),
    Column("to_stage", String, nullable=False),
    Column("changed_on", Date, nullable=False),
    Column("created_at", DateTime, nullable=False),
)
