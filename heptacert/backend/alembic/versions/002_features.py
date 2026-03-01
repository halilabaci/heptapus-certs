"""Add magic_link_token to users, create event_template_snapshots table.

Revision ID: 002features
Revises: 001baseline
Create Date: 2026-03-01
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "002features"
down_revision = "001baseline"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # add magic_link_token column to users (idempotent with IF NOT EXISTS via exception catch)
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    users_cols = [c["name"] for c in inspector.get_columns("users")]
    if "magic_link_token" not in users_cols:
        op.add_column("users", sa.Column("magic_link_token", sa.String(256), nullable=True))

    # create event_template_snapshots table if not exists
    existing_tables = inspector.get_table_names()
    if "event_template_snapshots" not in existing_tables:
        op.create_table(
            "event_template_snapshots",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("event_id", sa.Integer, sa.ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True),
            sa.Column("template_image_url", sa.Text, nullable=True),
            sa.Column("config", JSONB, nullable=True),
            sa.Column("created_by", sa.Integer, sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index("ix_ets_event_id", "event_template_snapshots", ["event_id"])


def downgrade() -> None:
    op.drop_table("event_template_snapshots")
    op.drop_column("users", "magic_link_token")
