"""Separate demonstration coin redemptions from earned Passport rewards."""
from alembic import op
import sqlalchemy as sa

revision = '20261101_coin_redemptions'
down_revision = '20261031_daily_promotions'
branch_labels = None
depends_on = None


def upgrade():
    op.create_table('coin_redemptions',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('offer_id', sa.String(80), nullable=False),
        sa.Column('idempotency_key', sa.String(100), nullable=False),
        sa.Column('coins_cost', sa.Integer, nullable=False),
        sa.Column('state', sa.String(20), nullable=False),
        sa.Column('snapshot', sa.JSON, nullable=False),
        sa.Column('code', sa.String(60), nullable=False, unique=True),
        sa.Column('is_demo', sa.Boolean, nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('used_at', sa.DateTime(timezone=True)),
        sa.UniqueConstraint('user_id','idempotency_key',name='uq_coin_redemption_replay'),
        sa.CheckConstraint('coins_cost > 0', name='ck_coin_redemption_positive'),
        sa.CheckConstraint("state IN ('issued','redeemed')", name='ck_coin_redemption_state'))
    op.create_index('ix_coin_redemptions_user_id','coin_redemptions',['user_id'])


def downgrade():
    op.drop_table('coin_redemptions')
