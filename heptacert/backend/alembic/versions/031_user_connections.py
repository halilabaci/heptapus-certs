"""Add user connections system (LinkedIn-style)

Revision ID: 031_user_connections
Revises: 030_mem_subs
Create Date: 2026-04-09 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '031_user_connections'
down_revision = '030_mem_subs'
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Create member_connections table for LinkedIn-style connections
    op.create_table(
        'member_connections',
        sa.Column('id', sa.Integer(), nullable=False),
        sa.Column('member_id', sa.Integer(), nullable=False),
        sa.Column('connected_member_id', sa.Integer(), nullable=False),
        sa.Column('status', sa.String(length=20), nullable=False, server_default='pending'),  # pending, accepted, blocked
        sa.Column('created_at', sa.DateTime(), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(), nullable=False, server_default=sa.func.now(), onupdate=sa.func.now()),
        sa.ForeignKeyConstraint(['member_id'], ['member.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['connected_member_id'], ['member.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('member_id', 'connected_member_id', name='uq_member_connection_pair'),
    )
    
    # Add indexes for faster queries
    op.create_index('idx_member_connections_status', 'member_connections', ['status'])
    op.create_index('idx_member_connections_member', 'member_connections', ['member_id'])
    op.create_index('idx_member_connections_connected', 'member_connections', ['connected_member_id'])

    # Enhanced member profile fields
    op.add_column('member', sa.Column('bio', sa.String(length=500), nullable=True))
    op.add_column('member', sa.Column('avatar_url', sa.String(length=500), nullable=True))
    op.add_column('member', sa.Column('headline', sa.String(length=150), nullable=True))  # e.g., "Product Manager at X"
    op.add_column('member', sa.Column('location', sa.String(length=100), nullable=True))
    op.add_column('member', sa.Column('website', sa.String(length=500), nullable=True))
    op.add_column('member', sa.Column('linkedin_url', sa.String(length=500), nullable=True))
    op.add_column('member', sa.Column('github_url', sa.String(length=500), nullable=True))
    op.add_column('member', sa.Column('twitter_handle', sa.String(length=100), nullable=True))


def downgrade() -> None:
    # Remove profile fields
    op.drop_column('member', 'twitter_handle')
    op.drop_column('member', 'github_url')
    op.drop_column('member', 'linkedin_url')
    op.drop_column('member', 'website')
    op.drop_column('member', 'location')
    op.drop_column('member', 'headline')
    op.drop_column('member', 'avatar_url')
    op.drop_column('member', 'bio')

    # Drop connection table
    op.drop_index('idx_member_connections_connected')
    op.drop_index('idx_member_connections_member')
    op.drop_index('idx_member_connections_status')
    op.drop_table('member_connections')
