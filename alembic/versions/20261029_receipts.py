"""Private receipt organizer; legacy prototype tables are left untouched."""
from alembic import op
import sqlalchemy as sa
revision='20261029_receipts'
down_revision='20261028_scene_evidence'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('travel_receipts',
        sa.Column('id', sa.String(32), primary_key=True),
        sa.Column('user_id', sa.Integer, sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('trip_id', sa.Integer, sa.ForeignKey('trips.id', ondelete='SET NULL'), nullable=True),
        sa.Column('idempotency_key', sa.String(100), nullable=False),
        sa.Column('request_hash', sa.String(64), nullable=False),
        sa.Column('image_sha', sa.String(64), nullable=True),
        sa.Column('storage', sa.JSON, nullable=True),
        sa.Column('file_name', sa.String(180), nullable=True),
        sa.Column('is_demo', sa.Boolean, nullable=False),
        sa.Column('state', sa.String(20), nullable=False),
        sa.Column('merchant_name', sa.String(250), nullable=True),
        sa.Column('purchase_date', sa.String(10), nullable=True),
        sa.Column('currency', sa.String(3), nullable=True),
        sa.Column('total_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('vat_amount', sa.Numeric(12, 2), nullable=True),
        sa.Column('estimated_refund', sa.Numeric(12, 2), nullable=True),
        sa.Column('category', sa.String(30), nullable=True),
        sa.Column('is_service', sa.Boolean, nullable=True),
        sa.Column('has_planet_tag', sa.Boolean, nullable=True),
        sa.Column('assessment_status', sa.String(30), nullable=False),
        sa.Column('assessment', sa.JSON, nullable=False),
        sa.Column('extracted_fields', sa.JSON, nullable=False),
        sa.Column('corrections', sa.JSON, nullable=False),
        sa.Column('policy_version', sa.String(50), nullable=True),
        sa.Column('feedback', sa.String(500), nullable=True),
        sa.Column('revision', sa.Integer, nullable=False),
        sa.Column('attempts', sa.Integer, nullable=False),
        sa.Column('lease_token', sa.String(32), nullable=True),
        sa.Column('lease_until', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), nullable=False),
        sa.Column('deleted_at', sa.DateTime(timezone=True), nullable=True),
        sa.Column('acknowledged_version', sa.String(50), nullable=False),
        sa.UniqueConstraint('user_id','idempotency_key',name='uq_receipt_request'),
        sa.UniqueConstraint('user_id','image_sha',name='uq_receipt_photo'))
    op.create_index('ix_travel_receipts_user_id','travel_receipts',['user_id'])
    op.create_index('ix_travel_receipts_trip_id','travel_receipts',['trip_id'])
    op.create_index('ix_receipt_jobs','travel_receipts',['state','lease_until','created_at'])

def downgrade():
    op.drop_index('ix_receipt_jobs',table_name='travel_receipts')
    op.drop_index('ix_travel_receipts_trip_id',table_name='travel_receipts')
    op.drop_index('ix_travel_receipts_user_id',table_name='travel_receipts')
    op.drop_table('travel_receipts')
