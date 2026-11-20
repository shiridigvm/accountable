"""Who added and last changed each record (R44, R45).

Rows that exist already get "Unknown". The default stays on the column: dropping
it would mean rebuilding each table on SQLite, which breaks the foreign keys that
point at it. The app always sets both columns itself, and the tests check that.

Revision ID: 0002
"""

import sqlalchemy as sa
from alembic import op

revision = "0002"
down_revision = "0001"

TABLES = ("organizations", "contacts", "deals", "activities")


def upgrade() -> None:
    for table in TABLES:
        for column in ("created_by", "updated_by"):
            op.add_column(
                table,
                sa.Column(column, sa.String, nullable=False, server_default="Unknown"),
            )


def downgrade() -> None:
    for table in TABLES:
        with op.batch_alter_table(table) as batch:
            batch.drop_column("updated_by")
            batch.drop_column("created_by")
