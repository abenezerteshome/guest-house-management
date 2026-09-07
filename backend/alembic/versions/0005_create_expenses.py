"""create expenses table

Revision ID: 0005_expenses
Revises: 0004_charges_payments
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0005_expenses"
down_revision: str | None = "0004_charges_payments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.create_table(
		"expenses",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("category", sa.String(length=50), nullable=False),
		sa.Column("description", sa.Text(), nullable=False),
		sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
		sa.Column("payment_method", sa.String(length=30), nullable=False, server_default="CASH"),
		sa.Column("expense_date", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("recorded_by", sa.Integer(), nullable=True),
		sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.CheckConstraint("amount > 0", name="ck_expenses_amount_positive"),
		sa.CheckConstraint(
			"category IN ('CLEANING', 'ELECTRICITY', 'WATER', 'MAINTENANCE', 'FOOD', 'SALARY', 'TRANSPORTATION', 'SUPPLIES', 'OTHER')",
			name="ck_expenses_category",
		),
		sa.CheckConstraint(
			"payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'OTHER')",
			name="ck_expenses_payment_method",
		),
		sa.ForeignKeyConstraint(["recorded_by"], ["users.id"]),
		sa.PrimaryKeyConstraint("id"),
	)
	op.create_index("ix_expenses_category", "expenses", ["category"], unique=False)
	op.create_index("ix_expenses_expense_date", "expenses", ["expense_date"], unique=False)


def downgrade() -> None:
	op.drop_index("ix_expenses_expense_date", table_name="expenses")
	op.drop_index("ix_expenses_category", table_name="expenses")
	op.drop_table("expenses")
