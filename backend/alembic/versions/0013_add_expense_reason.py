"""add structured expense reason

Revision ID: 0013_add_expense_reason
Revises: 0012_remove_maintenance
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0013_add_expense_reason"
down_revision: str | None = "0012_remove_maintenance"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.add_column("expenses", sa.Column("reason", sa.String(length=120), nullable=True))
	op.execute(sa.text("UPDATE expenses SET reason = description WHERE reason IS NULL"))
	with op.batch_alter_table("expenses") as batch_op:
		batch_op.alter_column("reason", existing_type=sa.String(length=120), nullable=False)


def downgrade() -> None:
	op.drop_column("expenses", "reason")
