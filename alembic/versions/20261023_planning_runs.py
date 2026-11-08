"""Durable planning runs; additive queue and result references only."""
from alembic import op
import sqlalchemy as sa
revision='20261023_runs'
down_revision='20261023_join'
branch_labels=None
depends_on=None

def upgrade():
    op.create_table('planning_runs',
        sa.Column('id',sa.String(),primary_key=True),
        sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id',ondelete='CASCADE'),nullable=False),
        sa.Column('brief_id',sa.String(),nullable=False),
        sa.Column('brief_revision',sa.Integer(),nullable=False),
        sa.Column('brief_snapshot',sa.JSON(),nullable=False),
        sa.Column('request_id',sa.String(),nullable=False),
        sa.Column('request_hash',sa.String(),nullable=False),
        sa.Column('status',sa.String(),nullable=False),
        sa.Column('attempts',sa.Integer(),nullable=False,server_default='0'),
        sa.Column('progress',sa.JSON(),nullable=False),
        sa.Column('workers',sa.JSON(),nullable=False),
        sa.Column('message',sa.String(),nullable=False),
        sa.Column('response',sa.String(),nullable=True),
        sa.Column('trip_id',sa.Integer(),sa.ForeignKey('trips.id',ondelete='SET NULL'),nullable=True),
        sa.Column('lease_token',sa.String(),nullable=True),
        sa.Column('lease_expires_at',sa.DateTime(timezone=True),nullable=True),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()),
        sa.UniqueConstraint('user_id','request_id',name='uq_planning_request'),
        sa.CheckConstraint("status IN ('queued','running','completed','failed','interrupted','cancelled')",name='ck_planning_status'),
        sa.CheckConstraint('attempts >= 0 AND attempts <= 3',name='ck_planning_attempts'))
    op.create_index('ix_planning_runs_user_id','planning_runs',['user_id'])
    op.create_index('ix_planning_runs_status','planning_runs',['status'])

def downgrade():
    op.drop_table('planning_runs')
