"""Add event_banner_url column to events table.

Revision ID: 004banner
Revises: 003attendance
Create Date: 2026-03-01
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision: str = "004banner"
down_revision = "003attendance"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    events_cols = [c["name"] for c in inspector.get_columns("events")]
    if "event_banner_url" not in events_cols:
        op.add_column("events", sa.Column("event_banner_url", sa.Text, nullable=True))


def downgrade() -> None:
    op.drop_column("events", "event_banner_url")
