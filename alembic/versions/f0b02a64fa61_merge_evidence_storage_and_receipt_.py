"""merge evidence storage and receipt migrations

Revision ID: f0b02a64fa61
Revises: 20261028_evidence_s3, 20261029_receipts
Create Date: 2026-10-30 00:31:50.353211

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'f0b02a64fa61'
down_revision: Union[str, Sequence[str], None] = ('20261028_evidence_s3', '20261029_receipts')
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    pass


def downgrade() -> None:
    """Downgrade schema."""
    pass
