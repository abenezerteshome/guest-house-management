"""add OTHER to payment methods constraint

Revision ID: 0014_add_other_payment_method
Revises: 0013_add_expense_reason
"""

from collections.abc import Sequence

from alembic import op


revision: str = "0014_add_other_payment_method"
down_revision: str | None = "0013_add_expense_reason"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.drop_constraint("ck_payments_method", "payments", type_="check")
	op.create_check_constraint(
		"ck_payments_method",
		"payments",
		"payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CREDIT', 'OTHER')",
	)


def downgrade() -> None:
	op.drop_constraint("ck_payments_method", "payments", type_="check")
	op.create_check_constraint(
		"ck_payments_method",
		"payments",
		"payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CREDIT')",
	)
