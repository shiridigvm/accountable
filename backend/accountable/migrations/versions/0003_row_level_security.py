"""Row-level security on every table, Postgres only.

Supabase's Data API serves the public schema to anyone with the publishable key.
With row-level security on and no policies, it can read and change nothing. The
backend connects as the table owner, so it is not affected. SQLAlchemy Core has
no construct for this statement, so it is the one piece of raw SQL in the app.

Revision ID: 0003
"""

from alembic import op

revision = "0003"
down_revision = "0002"

TABLES = (
    "organizations",
    "contacts",
    "deals",
    "activities",
    "deal_stage_changes",
    "alembic_version",
)


def upgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} ENABLE ROW LEVEL SECURITY")


def downgrade() -> None:
    if op.get_bind().dialect.name != "postgresql":
        return
    for table in TABLES:
        op.execute(f"ALTER TABLE {table} DISABLE ROW LEVEL SECURITY")
