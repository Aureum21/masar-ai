"""Private S3 evidence references and durable deletion retries."""
from alembic import op
import sqlalchemy as sa
revision = '20261028_evidence_s3'
down_revision = '20261028_scene_evidence'
branch_labels = None
depends_on = None

def upgrade():
    op.add_column('passport_submissions',sa.Column('image_storage',sa.JSON(),nullable=True))
    op.create_table('passport_evidence_deletions',
        sa.Column('id',sa.String(32),primary_key=True),
        sa.Column('storage',sa.JSON(),nullable=False),
        sa.Column('attempts',sa.Integer(),nullable=False),
        sa.Column('last_error',sa.String(80),nullable=True),
        sa.Column('retry_at',sa.DateTime(timezone=True),nullable=False),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False))
    op.create_index('ix_passport_evidence_deletions_retry_at','passport_evidence_deletions',['retry_at'])

def downgrade():
    op.drop_index('ix_passport_evidence_deletions_retry_at',table_name='passport_evidence_deletions')
    op.drop_table('passport_evidence_deletions')
    op.drop_column('passport_submissions','image_storage')
