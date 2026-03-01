"""Create waitlist_entries table.

Revision ID: 006waitlist
Revises: 005hcrenewal
Create Date: 2026-03-01
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision: str = "006waitlist"
down_revision = "005hcrenewal"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()
    if "waitlist_entries" not in existing_tables:
        op.create_table(
            "waitlist_entries",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("email", sa.String(255), nullable=False, unique=True),
            sa.Column("phone", sa.String(30), nullable=True),
            sa.Column("plan_interest", sa.String(50), nullable=True),
            sa.Column("note", sa.Text, nullable=True),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index("ix_waitlist_email", "waitlist_entries", ["email"], unique=True)


def downgrade() -> None:
    op.drop_table("waitlist_entries")
