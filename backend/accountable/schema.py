"""Table definitions (SQLAlchemy Core). The check constraints back up the API rules."""

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

organizations = Table(
    "organizations",
    metadata,
    Column("id", Integer, primary_key=True),
    Column("name", String, nullable=False),
    Column("website", String),
    Column("industry", String),
    Column("notes", Text),
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
