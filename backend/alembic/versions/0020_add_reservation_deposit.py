"""add reservation deposit fields

Revision ID: 0020_add_reservation_deposit
Revises: 0019_add_user_phone
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0020_add_reservation_deposit"
down_revision: str | None = "0019_add_user_phone"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("reservations")}
	if "deposit_amount" not in columns:
		op.add_column(
			"reservations",
			sa.Column("deposit_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
		)
	if "deposit_method" not in columns:
		op.add_column(
			"reservations",
			sa.Column("deposit_method", sa.String(30), nullable=True),
		)
	if "deposit_reference" not in columns:
		op.add_column(
			"reservations",
			sa.Column("deposit_reference", sa.String(200), nullable=True),
		)
	if "deposit_paid_at" not in columns:
		op.add_column(
			"reservations",
			sa.Column("deposit_paid_at", sa.DateTime(timezone=True), nullable=True),
		)


def downgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("reservations")}
	if "deposit_paid_at" in columns:
		op.drop_column("reservations", "deposit_paid_at")
	if "deposit_reference" in columns:
		op.drop_column("reservations", "deposit_reference")
	if "deposit_method" in columns:
		op.drop_column("reservations", "deposit_method")
	if "deposit_amount" in columns:
		op.drop_column("reservations", "deposit_amount")
