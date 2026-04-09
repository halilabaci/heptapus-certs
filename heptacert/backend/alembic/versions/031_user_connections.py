"""User connections system - fields already in public_members table

Revision ID: 031_user_connections
Revises: 030_mem_subs
Create Date: 2026-04-09

Note: LinkedIn-style connection features (member_connections table, enhanced profile fields)
are deferred. Profile enrichment fields (bio, avatar_url, headline, location, website, etc.)
are already present in public_members table from migrations 024-025.
This is a placeholder migration to maintain version chain continuity.
"""
from alembic import op
import sqlalchemy as sa

revision = "031_user_connections"
down_revision = "030_mem_subs"
branch_labels = None
depends_on = None


def upgrade() -> None:
    """No-op: User connection features already handled in public_members schema."""
    pass


def downgrade() -> None:
    pass
