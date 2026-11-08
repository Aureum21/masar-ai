"""Individual evidence-photo reuse receipts; preserve the existing queue."""
from alembic import op
import sqlalchemy as sa
revision = '20261028_scene_evidence'
down_revision = '20261027_evidence'
branch_labels = None
depends_on = None

def upgrade():
    op.create_table('passport_evidence_photo_uses',
        sa.Column('image_sha', sa.String(64), primary_key=True),
        sa.Column('submission_id', sa.String(32), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), nullable=False))
    op.create_index('ix_passport_evidence_photo_uses_submission_id','passport_evidence_photo_uses',['submission_id'])

def downgrade():
    op.drop_index('ix_passport_evidence_photo_uses_submission_id',table_name='passport_evidence_photo_uses')
    op.drop_table('passport_evidence_photo_uses')
