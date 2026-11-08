"""Persist booking outcomes and confirmation events.

Revision ID: 93b1e7c4a602
Revises: 8f7e4b1d2c90
"""
from alembic import op
import sqlalchemy as sa

revision = "93b1e7c4a602"
down_revision = "8f7e4b1d2c90"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "booking_operations",
        sa.Column("id", sa.String(36), primary_key=True),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("kind", sa.String(16), nullable=False),
        sa.Column("source_key", sa.String(512), nullable=False),
        sa.Column("request_digest", sa.String(64), nullable=False),
        sa.Column("context_key", sa.String(255)),
        sa.Column("trip_id", sa.Integer()),
        sa.Column("legacy_booking_id", sa.Integer()),
        sa.Column("status", sa.String(24), nullable=False),
        sa.Column("environment", sa.String(16), nullable=False),
        sa.Column("provider_reference", sa.String(255)),
        sa.Column("result", sa.JSON()),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(timezone=True)),
        sa.UniqueConstraint("user_id", "kind", "source_key", name="uq_booking_operation_source"),
    )
    op.create_index("ix_booking_operations_user_id", "booking_operations", ["user_id"])


def downgrade():
    op.drop_index("ix_booking_operations_user_id", table_name="booking_operations")
    op.drop_table("booking_operations")
