"""clear cleaning and turnaround rooms

Revision ID: 0011_clear_cleaning
Revises: 0010_add_guest_id_photo
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0011_clear_cleaning"
down_revision: str | None = "0010_add_guest_id_photo"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.execute(
		sa.text("UPDATE rooms SET status = 'AVAILABLE', available_after = NULL WHERE status = 'CLEANING' OR available_after IS NOT NULL")
	)


def downgrade() -> None:
	pass
