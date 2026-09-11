"""remove maintenance status and reset rooms

Revision ID: 0012_remove_maintenance
Revises: 0011_clear_cleaning
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0012_remove_maintenance"
down_revision: str | None = "0011_clear_cleaning"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.execute(
		sa.text("UPDATE rooms SET status = 'AVAILABLE' WHERE status = 'MAINTENANCE'")
	)


def downgrade() -> None:
	pass
