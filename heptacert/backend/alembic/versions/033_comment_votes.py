"""Add comment voting and nested replies support.

Revision ID: 033_comment_votes
Revises: 032_add_connections
Create Date: 2026-04-09
"""

from __future__ import annotations

from alembic import op
import sqlalchemy as sa


revision = "033_comment_votes"
down_revision = "032_add_connections"
branch_labels = None
depends_on = None


def upgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    # Add missing columns to community_post_comments
    if "community_post_comments" in inspector.get_table_names():
        columns = {col["name"] for col in inspector.get_columns("community_post_comments")}
        
        if "parent_comment_id" not in columns:
            op.add_column(
                "community_post_comments",
                sa.Column("parent_comment_id", sa.Integer(), sa.ForeignKey("community_post_comments.id", ondelete="CASCADE"), nullable=True)
            )
            op.create_index("ix_community_post_comments_parent_id", "community_post_comments", ["parent_comment_id"], unique=False)
        
        if "upvote_count" not in columns:
            op.add_column(
                "community_post_comments",
                sa.Column("upvote_count", sa.Integer(), nullable=False, server_default="0")
            )
        
        if "downvote_count" not in columns:
            op.add_column(
                "community_post_comments",
                sa.Column("downvote_count", sa.Integer(), nullable=False, server_default="0")
            )

    # Create community_comment_votes table if it doesn't exist
    if "community_comment_votes" not in inspector.get_table_names():
        op.create_table(
            "community_comment_votes",
            sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
            sa.Column("comment_id", sa.Integer(), sa.ForeignKey("community_post_comments.id", ondelete="CASCADE"), nullable=False),
            sa.Column("member_id", sa.Integer(), sa.ForeignKey("public_members.id", ondelete="CASCADE"), nullable=False),
            sa.Column("vote_type", sa.String(length=20), nullable=False),  # 'upvote', 'downvote', 'none'
            sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.Column("updated_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
            sa.UniqueConstraint("comment_id", "member_id", name="uq_comment_member_vote"),
        )
        op.create_index("ix_community_comment_votes_comment_id", "community_comment_votes", ["comment_id"], unique=False)
        op.create_index("ix_community_comment_votes_member_id", "community_comment_votes", ["member_id"], unique=False)


def downgrade() -> None:
    conn = op.get_bind()
    inspector = sa.inspect(conn)

    if "community_comment_votes" in inspector.get_table_names():
        indexes = {index["name"] for index in inspector.get_indexes("community_comment_votes")}
        if "ix_community_comment_votes_member_id" in indexes:
            op.drop_index("ix_community_comment_votes_member_id", table_name="community_comment_votes")
        if "ix_community_comment_votes_comment_id" in indexes:
            op.drop_index("ix_community_comment_votes_comment_id", table_name="community_comment_votes")
        op.drop_table("community_comment_votes")

    if "community_post_comments" in inspector.get_table_names():
        columns = {col["name"] for col in inspector.get_columns("community_post_comments")}
        
        if "parent_comment_id" in columns:
            indexes = {index["name"] for index in inspector.get_indexes("community_post_comments")}
            if "ix_community_post_comments_parent_id" in indexes:
                op.drop_index("ix_community_post_comments_parent_id", table_name="community_post_comments")
            op.drop_column("community_post_comments", "parent_comment_id")
        
        if "downvote_count" in columns:
            op.drop_column("community_post_comments", "downvote_count")
        
        if "upvote_count" in columns:
            op.drop_column("community_post_comments", "upvote_count")
