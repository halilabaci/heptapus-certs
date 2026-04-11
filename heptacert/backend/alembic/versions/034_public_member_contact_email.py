"""Add optional contact email to public members.

Revision ID: 034_public_member_contact_email
Revises: 033_comment_votes
Create Date: 2026-04-10
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "034_public_member_contact_email"
down_revision = "033_comment_votes"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "public_members" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("public_members")}
    if "contact_email" not in columns:
        op.add_column(
            "public_members",
            sa.Column("contact_email", sa.String(length=320), nullable=True),
        )


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    if "public_members" not in inspector.get_table_names():
        return

    columns = {col["name"] for col in inspector.get_columns("public_members")}
    if "contact_email" in columns:
        op.drop_column("public_members", "contact_email")
