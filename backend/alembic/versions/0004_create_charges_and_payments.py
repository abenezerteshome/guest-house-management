"""create charges and payments tables

Revision ID: 0004_charges_payments
Revises: 0003_reservations_stays_audit
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0004_charges_payments"
down_revision: str | None = "0003_reservations_stays_audit"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.create_table(
		"charges",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("stay_id", sa.Integer(), nullable=False),
		sa.Column("charge_type", sa.String(length=30), nullable=False),
		sa.Column("description", sa.Text(), nullable=False),
		sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
		sa.Column("quantity", sa.Integer(), nullable=False, server_default="1"),
		sa.Column("charged_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("created_by", sa.Integer(), nullable=True),
		sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
	sa.CheckConstraint("amount > 0", name="ck_charges_amount_positive"),
	sa.CheckConstraint("quantity > 0", name="ck_charges_quantity_positive"),
	sa.CheckConstraint("charge_type IN ('ROOM', 'LATE_CHECKOUT_PENALTY', 'OTHER')", name="ck_charges_type"),
	sa.ForeignKeyConstraint(["stay_id"], ["stays.id"]),
	sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
	sa.PrimaryKeyConstraint("id"),
	)
	op.create_index("ix_charges_stay_id", "charges", ["stay_id"], unique=False)
	op.create_index("ix_charges_charge_type", "charges", ["charge_type"], unique=False)
	op.create_index("ix_charges_charged_at", "charges", ["charged_at"], unique=False)

	op.create_table(
		"payments",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("stay_id", sa.Integer(), nullable=False),
		sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=False),
		sa.Column("payment_method", sa.String(length=30), nullable=False),
		sa.Column("status", sa.String(length=20), nullable=False),
		sa.Column("reference", sa.String(length=200), nullable=True),
		sa.Column("provider", sa.String(length=20), nullable=False),
		sa.Column("provider_transaction_id", sa.String(length=200), nullable=True),
		sa.Column("tx_ref", sa.String(length=200), nullable=True),
		sa.Column("paid_at", sa.DateTime(timezone=True), nullable=True),
		sa.Column("created_by", sa.Integer(), nullable=True),
		sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("metadata", sa.JSON(), nullable=True),
	sa.CheckConstraint("amount > 0", name="ck_payments_amount_positive"),
	sa.CheckConstraint("payment_method IN ('CASH', 'TELEBIRR', 'CBE_BIRR', 'BANK_TRANSFER', 'CHAPA')", name="ck_payments_method"),
	sa.CheckConstraint("status IN ('PENDING', 'SUCCESS', 'FAILED', 'CANCELLED', 'REVERSED', 'REFUNDED')", name="ck_payments_status"),
	sa.CheckConstraint("provider IN ('MANUAL', 'CHAPA')", name="ck_payments_provider"),
	sa.ForeignKeyConstraint(["stay_id"], ["stays.id"]),
	sa.ForeignKeyConstraint(["created_by"], ["users.id"]),
	sa.PrimaryKeyConstraint("id"),
	sa.UniqueConstraint("tx_ref"),
	)
	op.create_index("ix_payments_stay_id", "payments", ["stay_id"], unique=False)
	op.create_index("ix_payments_status", "payments", ["status"], unique=False)
	op.create_index("ix_payments_provider", "payments", ["provider"], unique=False)
	op.create_index("ix_payments_created_at", "payments", ["created_at"], unique=False)


def downgrade() -> None:
	for name in ("ix_payments_created_at", "ix_payments_provider", "ix_payments_status", "ix_payments_stay_id"):
		op.drop_index(name, table_name="payments")
	op.drop_table("payments")
	for name in ("ix_charges_charged_at", "ix_charges_charge_type", "ix_charges_stay_id"):
		op.drop_index(name, table_name="charges")
	op.drop_table("charges")