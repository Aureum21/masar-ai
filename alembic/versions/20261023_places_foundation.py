"""Canonical attraction identities; no changes to existing trip/user columns.

Trip dates/lifecycle/revision initially live in versioned itinerary JSON so the
running app remains compatible before this optional catalogue migration.
"""
from alembic import op
import sqlalchemy as sa

revision = "20261023_places"
down_revision = "4ca5b00ba069"
branch_labels = None
depends_on = None


def upgrade():
    table = op.create_table(
        "places", sa.Column("id", sa.String(), primary_key=True),
        sa.Column("name", sa.String(), nullable=False),
        sa.Column("aliases", sa.JSON(), nullable=False),
    )
    # Frozen seed: future catalogue edits must not change this migration.
    op.bulk_insert(table, [{'id': 'burj-khalifa', 'name': 'Burj Khalifa', 'aliases': ['burj']}, {'id': 'museum-of-the-future', 'name': 'Museum of the Future', 'aliases': ['future']}, {'id': 'sheikh-zayed-grand-mosque', 'name': 'Sheikh Zayed Grand Mosque', 'aliases': ['mosque', 'grand-mosque', 'sheikh-zayed-mosque']}, {'id': 'al-fahidi', 'name': 'Al Fahidi Historical Neighbourhood', 'aliases': []}, {'id': 'burj-al-arab', 'name': 'Burj Al Arab', 'aliases': []}, {'id': 'al-noor-mosque', 'name': 'Al Noor Mosque', 'aliases': ['al-noor']}, {'id': 'jebel-jais', 'name': 'Jebel Jais', 'aliases': []}])


def downgrade():
    op.drop_table("places")
