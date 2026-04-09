"""Add connections system tables (follow/block)

Revision ID: 032_add_connections
Revises: 031_user_connections
Create Date: 2026-04-09

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '032_add_connections'
down_revision = '031_user_connections'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create public_member_connections table
    op.create_table(
        'public_member_connections',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('follower_id', sa.Integer(), nullable=False),
        sa.Column('following_id', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['follower_id'], ['public_members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['following_id'], ['public_members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('follower_id', 'following_id', name='uq_public_member_connection')
    )
    op.create_index('ix_public_member_connections_following', 'public_member_connections', ['following_id'])
    op.create_index('ix_public_member_connections_follower', 'public_member_connections', ['follower_id'])

    # Create public_member_connection_requests table
    op.create_table(
        'public_member_connection_requests',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('requester_id', sa.Integer(), nullable=False),
        sa.Column('recipient_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['requester_id'], ['public_members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['recipient_id'], ['public_members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_public_member_connection_requests_recipient', 'public_member_connection_requests', ['recipient_id'])
    op.create_index('ix_public_member_connection_requests_requester', 'public_member_connection_requests', ['requester_id'])
    op.create_index('ix_public_member_connection_requests_status', 'public_member_connection_requests', ['status'])

    # Create public_member_blocklist table
    op.create_table(
        'public_member_blocklist',
        sa.Column('id', sa.Integer(), nullable=False, autoincrement=True),
        sa.Column('blocker_id', sa.Integer(), nullable=False),
        sa.Column('blocked_id', sa.Integer(), nullable=False),
        sa.Column('reason', sa.String(255), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.ForeignKeyConstraint(['blocker_id'], ['public_members.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['blocked_id'], ['public_members.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('blocker_id', 'blocked_id', name='uq_public_member_blocklist')
    )
    op.create_index('ix_public_member_blocklist_blocked', 'public_member_blocklist', ['blocked_id'])
    op.create_index('ix_public_member_blocklist_blocker', 'public_member_blocklist', ['blocker_id'])


def downgrade() -> None:
    op.drop_index('ix_public_member_blocklist_blocker')
    op.drop_index('ix_public_member_blocklist_blocked')
    op.drop_table('public_member_blocklist')

    op.drop_index('ix_public_member_connection_requests_status')
    op.drop_index('ix_public_member_connection_requests_requester')
    op.drop_index('ix_public_member_connection_requests_recipient')
    op.drop_table('public_member_connection_requests')

    op.drop_index('ix_public_member_connections_follower')
    op.drop_index('ix_public_member_connections_following')
    op.drop_table('public_member_connections')
