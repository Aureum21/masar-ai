"""Durable boxing image checks and unique evidence receipts."""
from alembic import op
import sqlalchemy as sa

revision = '20261027_evidence'
down_revision = '20261026_attractions'
branch_labels = None
depends_on = None


def upgrade():
    op.add_column('passport_submissions', sa.Column('verification', sa.JSON(), nullable=True))
    op.create_table('passport_evidence_checks',
        sa.Column('submission_id', sa.String(32), sa.ForeignKey('passport_submissions.id', ondelete='CASCADE'), primary_key=True),
        sa.Column('user_id', sa.Integer(), sa.ForeignKey('users.id', ondelete='CASCADE'), nullable=False),
        sa.Column('state', sa.String(20), nullable=False),
        sa.Column('image_sha', sa.String(64), nullable=False),
        sa.Column('image_phash', sa.String(16), nullable=False),
        sa.Column('token', sa.String(32)), sa.Column('lease_until', sa.DateTime(timezone=True)),
        sa.Column('attempts', sa.Integer(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_passport_evidence_checks_state', 'passport_evidence_checks', ['state'])
    op.create_index('ix_passport_evidence_checks_image_sha', 'passport_evidence_checks', ['image_sha'])
    op.create_table('passport_evidence_uses', sa.Column('image_sha', sa.String(64), primary_key=True),
        sa.Column('submission_id', sa.String(32), nullable=False, unique=True),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))


def downgrade():
    op.drop_table('passport_evidence_uses')
    op.drop_index('ix_passport_evidence_checks_image_sha', table_name='passport_evidence_checks')
    op.drop_index('ix_passport_evidence_checks_state', table_name='passport_evidence_checks')
    op.drop_table('passport_evidence_checks')
    op.drop_column('passport_submissions', 'verification')
