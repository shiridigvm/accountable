"""Alembic environment. migrate.py passes in an open connection, so there is no alembic.ini."""

from alembic import context

connection = context.config.attributes["connection"]
context.configure(connection=connection)

with context.begin_transaction():
    context.run_migrations()
