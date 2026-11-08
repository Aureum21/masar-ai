"""Add the UAE attraction catalogue; existing tables and trip data are unchanged."""
from alembic import op
import sqlalchemy as sa
revision='20261026_attractions'
down_revision='20261023_runs'
branch_labels=None
depends_on=None
def upgrade():
    op.create_table('attractions',sa.Column('id',sa.String(120),primary_key=True),sa.Column('name',sa.String(240),nullable=False),sa.Column('emirate',sa.String(24),nullable=False),sa.Column('kind',sa.String(24),nullable=False),sa.Column('data',sa.JSON(),nullable=False))
    op.create_index('ix_attractions_emirate','attractions',['emirate'])
def downgrade():
    op.drop_index('ix_attractions_emirate',table_name='attractions')
    op.drop_table('attractions')
