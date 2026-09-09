"""add available_after to rooms

Revision ID: 0009_room_available_after
Revises: 0008_room_hourly_price
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0009_room_available_after"
down_revision: str | None = "0008_room_hourly_price"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("rooms")}
	if "available_after" not in columns:
		op.add_column(
			"rooms",
			sa.Column("available_after", sa.DateTime(timezone=True), nullable=True),
		)


def downgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("rooms")}
	if "available_after" in columns:
		op.drop_column("rooms", "available_after")
