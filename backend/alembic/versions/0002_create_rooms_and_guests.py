"""create rooms and guests tables

Revision ID: 0002_create_rooms_and_guests
Revises: 0001_create_users
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0002_create_rooms_and_guests"
down_revision: str | None = "0001_create_users"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	room_statuses = "'AVAILABLE', 'OCCUPIED', 'EXPECTED', 'CLEANING', 'MAINTENANCE'"
	op.create_table(
		"rooms",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("room_number", sa.String(length=30), nullable=False),
		sa.Column("room_type", sa.String(length=100), nullable=False),
		sa.Column("price", sa.Numeric(precision=10, scale=2), nullable=False),
		sa.Column("status", sa.String(length=20), nullable=False, server_default="AVAILABLE"),
		sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
		sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
	sa.CheckConstraint("length(trim(room_number)) > 0", name="ck_rooms_room_number_not_empty"),
	sa.CheckConstraint("length(trim(room_type)) > 0", name="ck_rooms_room_type_not_empty"),
	sa.CheckConstraint("price >= 0", name="ck_rooms_price_nonnegative"),
	sa.CheckConstraint(f"status IN ({room_statuses})", name="ck_rooms_status"),
	sa.PrimaryKeyConstraint("id"),
	sa.UniqueConstraint("room_number"),
	)
	op.create_index("ix_rooms_room_number", "rooms", ["room_number"], unique=False)

	op.create_table(
		"guests",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("full_name", sa.String(length=200), nullable=False),
		sa.Column("id_number", sa.String(length=100), nullable=False),
		sa.Column("phone", sa.String(length=50), nullable=False),
		sa.Column("address", sa.String(length=300), nullable=True),
		sa.Column("nationality", sa.String(length=100), nullable=True),
		sa.Column("notes", sa.Text(), nullable=True),
		sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
	sa.PrimaryKeyConstraint("id"),
	)
	op.create_index("ix_guests_full_name", "guests", ["full_name"], unique=False)
	op.create_index("ix_guests_id_number", "guests", ["id_number"], unique=False)
	op.create_index("ix_guests_phone", "guests", ["phone"], unique=False)


def downgrade() -> None:
	op.drop_index("ix_guests_phone", table_name="guests")
	op.drop_index("ix_guests_id_number", table_name="guests")
	op.drop_index("ix_guests_full_name", table_name="guests")
	op.drop_table("guests")
	op.drop_index("ix_rooms_room_number", table_name="rooms")
	op.drop_table("rooms")