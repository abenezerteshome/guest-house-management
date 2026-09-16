"""add VOIDED to stays status constraint

Revision ID: 0015_add_voided_stay_status
Revises: 0014_add_other_payment_method
"""

from collections.abc import Sequence

from alembic import op


revision: str = "0015_add_voided_stay_status"
down_revision: str | None = "0014_add_other_payment_method"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.drop_constraint("ck_stays_status", "stays", type_="check")
	op.create_check_constraint(
		"ck_stays_status",
		"stays",
		"status IN ('CHECKED_IN', 'CHECKED_OUT', 'VOIDED')",
	)


def downgrade() -> None:
	op.drop_constraint("ck_stays_status", "stays", type_="check")
	op.create_check_constraint(
		"ck_stays_status",
		"stays",
		"status IN ('CHECKED_IN', 'CHECKED_OUT')",
	)
