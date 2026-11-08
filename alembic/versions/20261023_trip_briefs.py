"""Add account-owned trip briefs; do not alter existing user/trip/booking data."""
from alembic import op
import sqlalchemy as sa

revision='20261023_briefs'
down_revision='20261023_places'
branch_labels=None
depends_on=None


def upgrade():
    op.create_table('trip_briefs',
        sa.Column('id',sa.String(),primary_key=True),
        sa.Column('user_id',sa.Integer(),sa.ForeignKey('users.id',ondelete='CASCADE'),nullable=False),
        sa.Column('payload',sa.JSON(),nullable=False),
        sa.Column('revision',sa.Integer(),nullable=False,server_default='1'),
        sa.Column('created_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()),
        sa.Column('updated_at',sa.DateTime(timezone=True),nullable=False,server_default=sa.func.now()),
        sa.CheckConstraint('revision >= 1',name='ck_trip_brief_revision'),
        sa.UniqueConstraint('user_id',name='uq_trip_brief_owner'))


def downgrade():
    op.drop_table('trip_briefs')
