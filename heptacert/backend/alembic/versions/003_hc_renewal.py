"""Add last_hc_credited_at to subscriptions table.

Revision ID: 003hcrenewal
Revises: 002features
Create Date: 2026-03-01
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision: str = "005hcrenewal"
down_revision = "004banner"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    subs_cols = [c["name"] for c in inspector.get_columns("subscriptions")]
    if "last_hc_credited_at" not in subs_cols:
        op.add_column(
            "subscriptions",
            sa.Column("last_hc_credited_at", sa.DateTime(timezone=True), nullable=True),
        )


def downgrade() -> None:
    op.drop_column("subscriptions", "last_hc_credited_at")
