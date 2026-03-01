"""Baseline — existing tables created by SQLAlchemy create_all + legacy SQL migrations.

Revision ID: 001baseline
Revises:
Create Date: 2026-03-01

This migration is a no-op for existing databases.
Tables are created by SQLAlchemy's create_all() on first startup.
This revision simply marks the baseline so subsequent migrations have a parent.
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa

revision: str = "001baseline"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    """No-op — existing tables already exist via create_all()."""
    pass


def downgrade() -> None:
    pass
