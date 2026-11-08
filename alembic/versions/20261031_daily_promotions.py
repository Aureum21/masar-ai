"""Daily promotional challenge wheel and coin ledger.

Revision ID: 20261031_daily_promotions
Revises: f0b02a64fa61
Create Date: 2026-10-31 00:00:00.000000
"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '20261031_daily_promotions'
down_revision: Union[str, Sequence[str], None] = 'f0b02a64fa61'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'daily_promo_assignments',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('dubai_day', sa.String(10), nullable=False),
        sa.Column('template_id', sa.String(50), nullable=False),
        sa.Column('template_version', sa.String(20), nullable=False, server_default='1.0'),
        sa.Column('kind', sa.String(20), nullable=False),
        sa.Column('selected_slot', sa.Integer, nullable=False),
        sa.Column('wheel_pool', sa.JSON, nullable=False),
        sa.Column('template_snapshot', sa.JSON, nullable=False),
        sa.Column('state', sa.String(20), nullable=False, server_default='drawn'),
        sa.Column('game_session_id', sa.String(32), nullable=True),
        sa.Column('coins_reward', sa.Integer, nullable=False, server_default='1'),
        sa.Column('drawn_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('accepted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('rejected_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('completed_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('expires_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('user_id', 'dubai_day', name='uq_user_daily_promo'),
    )
    op.create_index('ix_daily_promo_assignments_user_id', 'daily_promo_assignments', ['user_id'])
    op.create_index('ix_daily_promo_assignments_dubai_day', 'daily_promo_assignments', ['dubai_day'])

    op.create_table(
        'daily_coin_ledger',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('assignment_id', sa.String(32), sa.ForeignKey('daily_promo_assignments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('amount', sa.Integer, nullable=False, server_default='1'),
        sa.Column('reason', sa.String(100), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.UniqueConstraint('assignment_id', name='uq_coin_ledger_assignment'),
    )
    op.create_index('ix_daily_coin_ledger_user_id', 'daily_coin_ledger', ['user_id'])

    op.create_table(
        'daily_promo_submissions',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('assignment_id', sa.String(32), sa.ForeignKey('daily_promo_assignments.id', ondelete='CASCADE'), nullable=False),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('idempotency_key', sa.String(100), nullable=False),
        sa.Column('status', sa.String(20), nullable=False, server_default='pending'),
        sa.Column('evidence_type', sa.String(20), nullable=False),
        sa.Column('text', sa.Text, nullable=False, server_default=''),
        sa.Column('image_name', sa.String(180), nullable=True),
        sa.Column('image_storage', sa.JSON, nullable=True),
        sa.Column('feedback', sa.Text, nullable=False, server_default=''),
        sa.Column('submitted_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('reviewed_at', sa.DateTime(timezone=True), nullable=True),
        sa.UniqueConstraint('assignment_id', 'idempotency_key', name='uq_daily_promo_sub_replay'),
    )
    op.create_index('ix_daily_promo_subs_assignment_id', 'daily_promo_submissions', ['assignment_id'])
    op.create_index('ix_daily_promo_subs_user_id', 'daily_promo_submissions', ['user_id'])


def downgrade() -> None:
    op.drop_index('ix_daily_promo_subs_user_id', table_name='daily_promo_submissions')
    op.drop_index('ix_daily_promo_subs_assignment_id', table_name='daily_promo_submissions')
    op.drop_table('daily_promo_submissions')

    op.drop_index('ix_daily_coin_ledger_user_id', table_name='daily_coin_ledger')
    op.drop_table('daily_coin_ledger')

    op.drop_index('ix_daily_promo_assignments_dubai_day', table_name='daily_promo_assignments')
    op.drop_index('ix_daily_promo_assignments_user_id', table_name='daily_promo_assignments')
    op.drop_table('daily_promo_assignments')
