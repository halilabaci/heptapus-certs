"""Add support tickets table for AI assistant escalation

Revision ID: 035_support_tickets
Revises: 034_public_member_contact_email
Create Date: 2026-04-20 10:00:00.000000

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision = '035_support_tickets'
down_revision = '034_public_member_contact_email'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        'support_tickets',
        sa.Column('id', sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id'), nullable=False),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id'), nullable=False),
        sa.Column('subject', sa.String(255), nullable=False),
        sa.Column('messages', postgresql.JSONB(), nullable=False, server_default='[]'),
        sa.Column('status', sa.String(20), nullable=False, server_default='open'),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False, server_default=sa.func.now()),
    )
    op.create_index('idx_support_tickets_org_id', 'support_tickets', ['organization_id'])
    op.create_index('idx_support_tickets_user_id', 'support_tickets', ['user_id'])
    op.create_index('idx_support_tickets_status', 'support_tickets', ['status'])


def downgrade() -> None:
    op.drop_index('idx_support_tickets_status')
    op.drop_index('idx_support_tickets_user_id')
    op.drop_index('idx_support_tickets_org_id')
    op.drop_table('support_tickets')
