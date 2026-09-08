"""add hourly_price to rooms

Revision ID: 0008_room_hourly_price
Revises: 0007_reservation_details
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0008_room_hourly_price"
down_revision: str | None = "0007_reservation_details"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("rooms")}
	if "hourly_price" not in columns:
		op.add_column(
			"rooms",
			sa.Column("hourly_price", sa.Numeric(10, 2), nullable=True),
		)


def downgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("rooms")}
	if "hourly_price" in columns:
		op.drop_column("rooms", "hourly_price")
