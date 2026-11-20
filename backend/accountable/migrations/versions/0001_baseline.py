"""The tables as they were before sign-in.

Revision ID: 0001
"""

import sqlalchemy as sa
from alembic import op

revision = "0001"
down_revision = None


def upgrade() -> None:
    op.create_table(
        "organizations",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("website", sa.String),
        sa.Column("industry", sa.String),
        sa.Column("notes", sa.Text),
    )
    op.create_table(
        "contacts",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("email", sa.String),
        sa.Column("phone", sa.String),
        sa.Column("job_title", sa.String),
        sa.Column("status", sa.String, nullable=False),
        sa.Column("organization_id", sa.Integer, sa.ForeignKey("organizations.id")),
        sa.CheckConstraint(
            "status IN ('lead', 'qualified', 'customer')", name="contact_status"
        ),
    )
    op.create_table(
        "deals",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("name", sa.String, nullable=False),
        sa.Column("stage", sa.String, nullable=False),
        sa.Column("value_cents", sa.Integer, nullable=False),
        sa.Column("probability", sa.Integer, nullable=False),
        sa.Column("expected_close", sa.Date, nullable=False),
        sa.Column("actual_close", sa.Date),
        sa.Column("organization_id", sa.Integer, sa.ForeignKey("organizations.id")),
        sa.Column("main_contact_id", sa.Integer, sa.ForeignKey("contacts.id")),
        sa.Column("position", sa.Integer, nullable=False),
        sa.CheckConstraint("value_cents >= 0", name="deal_value_non_negative"),
        sa.CheckConstraint(
            "probability BETWEEN 0 AND 100", name="deal_probability_range"
        ),
        sa.CheckConstraint(
            "stage IN ('New', 'Qualified', 'Proposal', 'Negotiation', 'Won', 'Lost')",
            name="deal_stage",
        ),
    )
    op.create_table(
        "activities",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("type", sa.String, nullable=False),
        sa.Column("description", sa.Text, nullable=False),
        sa.Column("occurred_on", sa.Date, nullable=False),
        sa.Column("follow_up_on", sa.Date),
        sa.Column("done", sa.Boolean, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
        sa.Column("contact_id", sa.Integer, sa.ForeignKey("contacts.id")),
        sa.Column("deal_id", sa.Integer, sa.ForeignKey("deals.id")),
        sa.CheckConstraint("type IN ('note', 'call', 'email')", name="activity_type"),
        sa.CheckConstraint(
            "(contact_id IS NULL) <> (deal_id IS NULL)", name="activity_one_link"
        ),
    )
    op.create_table(
        "deal_stage_changes",
        sa.Column("id", sa.Integer, primary_key=True),
        sa.Column("deal_id", sa.Integer, sa.ForeignKey("deals.id"), nullable=False),
        sa.Column("from_stage", sa.String, nullable=False),
        sa.Column("to_stage", sa.String, nullable=False),
        sa.Column("changed_on", sa.Date, nullable=False),
        sa.Column("created_at", sa.DateTime, nullable=False),
    )


def downgrade() -> None:
    for table in (
        "deal_stage_changes",
        "activities",
        "deals",
        "contacts",
        "organizations",
    ):
        op.drop_table(table)
