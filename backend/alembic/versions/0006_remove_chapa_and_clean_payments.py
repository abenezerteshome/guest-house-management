"""restrict payments to manual processing and remove legacy gateway fields

Revision ID: 0006_clean_payments
Revises: 0005_expenses
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0006_clean_payments"
down_revision: str | None = "0005_expenses"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	# Drop constraints before removing the legacy gateway fields.
	op.drop_constraint("ck_payments_provider", "payments", type_="check")
	op.drop_constraint("ck_payments_method", "payments", type_="check")
	op.drop_constraint("ck_payments_status", "payments", type_="check")

	op.drop_index("ix_payments_provider", table_name="payments")
	op.drop_index("ix_payments_tx_ref", table_name="payments")

	op.drop_column("payments", "provider")
	op.drop_column("payments", "provider_transaction_id")
	op.drop_column("payments", "tx_ref")
	op.drop_column("payments", "metadata")

	op.create_check_constraint(
		"ck_payments_method",
		"payments",
		"payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CREDIT')",
	)
	op.create_check_constraint(
		"ck_payments_status",
		"payments",
		"status IN ('SUCCESS', 'CANCELLED', 'REVERSED', 'REFUNDED')",
	)


def downgrade() -> None:
	op.drop_constraint("ck_payments_status", "payments", type_="check")
	op.drop_constraint("ck_payments_method", "payments", type_="check")

	op.add_column("payments", sa.Column("metadata", sa.JSON(), nullable=True))
	op.add_column("payments", sa.Column("tx_ref", sa.String(length=200), nullable=True))
	op.add_column("payments", sa.Column("provider_transaction_id", sa.String(length=200), nullable=True))
	op.add_column("payments", sa.Column("provider", sa.String(length=20), nullable=False, server_default="MANUAL"))

	op.create_index("ix_payments_tx_ref", "payments", ["tx_ref"], unique=False)
	op.create_index("ix_payments_provider", "payments", ["provider"], unique=False)

	op.create_check_constraint(
		"ck_payments_provider",
		"payments",
		"provider IN ('MANUAL', 'CHAPA')",
	)
	op.create_check_constraint(
		"ck_payments_status",
		"payments",
		"status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED')",
	)
	op.create_check_constraint(
		"ck_payments_method",
		"payments",
		"payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CHAPA')",
	)
