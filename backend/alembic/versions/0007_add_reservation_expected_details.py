"""add expected reservation amount and reason

Revision ID: 0007_reservation_expected_details
Revises: 0006_clean_payments
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0007_reservation_details"
down_revision: str | None = "0006_clean_payments"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("reservations")}
	if "expected_amount" not in columns:
		op.add_column(
			"reservations",
			sa.Column("expected_amount", sa.Numeric(12, 2), nullable=False, server_default="0.00"),
		)
	if "reason" not in columns:
		op.add_column("reservations", sa.Column("reason", sa.Text(), nullable=True))


def downgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("reservations")}
	if "reason" in columns:
		op.drop_column("reservations", "reason")
	if "expected_amount" in columns:
		op.drop_column("reservations", "expected_amount")
