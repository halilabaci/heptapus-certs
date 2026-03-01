"""Add attendance management: event_sessions, attendees, attendance_records + event metadata columns.

Revision ID: 003attendance
Revises: 002features
Create Date: 2026-03-01
"""
from __future__ import annotations
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision: str = "003attendance"
down_revision = "002features"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)
    existing_tables = inspector.get_table_names()

    # ── Extend events table with metadata & session threshold ─────────────────
    events_cols = [c["name"] for c in inspector.get_columns("events")]
    if "event_date" not in events_cols:
        op.add_column("events", sa.Column("event_date", sa.Date, nullable=True))
    if "event_description" not in events_cols:
        op.add_column("events", sa.Column("event_description", sa.Text, nullable=True))
    if "event_location" not in events_cols:
        op.add_column("events", sa.Column("event_location", sa.String(300), nullable=True))
    if "min_sessions_required" not in events_cols:
        op.add_column("events", sa.Column("min_sessions_required", sa.Integer, nullable=False, server_default="1"))

    # ── event_sessions ────────────────────────────────────────────────────────
    if "event_sessions" not in existing_tables:
        op.create_table(
            "event_sessions",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column(
                "event_id",
                sa.Integer,
                sa.ForeignKey("events.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("session_date", sa.Date, nullable=True),
            sa.Column("session_start", sa.Time, nullable=True),
            sa.Column("session_location", sa.String(300), nullable=True),
            sa.Column("checkin_token", sa.String(64), nullable=False, unique=True),
            sa.Column("is_active", sa.Boolean, nullable=False, server_default="false"),
            sa.Column(
                "created_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index("ix_event_sessions_event_id", "event_sessions", ["event_id"])
        op.create_index("ix_event_sessions_token", "event_sessions", ["checkin_token"], unique=True)

    # ── attendees ─────────────────────────────────────────────────────────────
    if "attendees" not in existing_tables:
        op.create_table(
            "attendees",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column(
                "event_id",
                sa.Integer,
                sa.ForeignKey("events.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column("name", sa.String(200), nullable=False),
            sa.Column("email", sa.String(320), nullable=False),
            sa.Column(
                "source",
                sa.Enum("import", "self_register", name="attendee_source_enum"),
                nullable=False,
                server_default="import",
            ),
            sa.Column(
                "registered_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
        )
        op.create_index("ix_attendees_event_id", "attendees", ["event_id"])
        op.create_unique_constraint(
            "uq_attendee_event_email", "attendees", ["event_id", "email"]
        )

    # ── attendance_records ────────────────────────────────────────────────────
    if "attendance_records" not in existing_tables:
        op.create_table(
            "attendance_records",
            sa.Column("id", sa.Integer, primary_key=True, autoincrement=True),
            sa.Column(
                "attendee_id",
                sa.Integer,
                sa.ForeignKey("attendees.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "session_id",
                sa.Integer,
                sa.ForeignKey("event_sessions.id", ondelete="CASCADE"),
                nullable=False,
                index=True,
            ),
            sa.Column(
                "checked_in_at",
                sa.DateTime(timezone=True),
                server_default=sa.func.now(),
                nullable=False,
            ),
            sa.Column("ip_address", sa.String(45), nullable=True),
        )
        op.create_unique_constraint(
            "uq_attendance_attendee_session",
            "attendance_records",
            ["attendee_id", "session_id"],
        )


def downgrade() -> None:
    op.drop_table("attendance_records")
    op.execute("DROP TYPE IF EXISTS attendee_source_enum")
    op.drop_table("attendees")
    op.drop_table("event_sessions")
    op.drop_column("events", "min_sessions_required")
    op.drop_column("events", "event_location")
    op.drop_column("events", "event_description")
    op.drop_column("events", "event_date")
