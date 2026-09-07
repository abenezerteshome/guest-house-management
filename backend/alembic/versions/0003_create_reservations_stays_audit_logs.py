"""create reservations, stays, and audit logs tables

Revision ID: 0003_reservations_stays_audit
Revises: 0002_create_rooms_and_guests
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0003_reservations_stays_audit"
down_revision: str | None = "0002_create_rooms_and_guests"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.create_table(
		"reservations",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("guest_id", sa.Integer(), nullable=False),
		sa.Column("room_id", sa.Integer(), nullable=False),
		sa.Column("status", sa.String(length=20), nullable=False, server_default="RESERVED"),
		sa.Column("expected_arrival", sa.DateTime(timezone=True), nullable=False),
		sa.Column("expected_checkout", sa.DateTime(timezone=True), nullable=False),
		sa.Column("notes", sa.Text(), nullable=True),
		sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
	sa.CheckConstraint(
		"status IN ('RESERVED', 'CHECKED_IN', 'CHECKED_OUT', 'CANCELLED', 'NO_SHOW')",
		name="ck_reservations_status",
	),
	sa.CheckConstraint("expected_checkout > expected_arrival", name="ck_reservations_dates"),
	sa.ForeignKeyConstraint(["guest_id"], ["guests.id"]),
	sa.ForeignKeyConstraint(["room_id"], ["rooms.id"]),
	sa.PrimaryKeyConstraint("id"),
	)
	op.create_index("ix_reservations_guest_id", "reservations", ["guest_id"], unique=False)
	op.create_index("ix_reservations_room_id", "reservations", ["room_id"], unique=False)
	op.create_index("ix_reservations_status", "reservations", ["status"], unique=False)
	op.create_index("ix_reservations_expected_arrival", "reservations", ["expected_arrival"], unique=False)
	op.create_index("ix_reservations_expected_checkout", "reservations", ["expected_checkout"], unique=False)

	op.create_table(
		"stays",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("reservation_id", sa.Integer(), nullable=False),
		sa.Column("guest_id", sa.Integer(), nullable=False),
		sa.Column("room_id", sa.Integer(), nullable=False),
		sa.Column("check_in_at", sa.DateTime(timezone=True), nullable=False),
		sa.Column("expected_checkout", sa.DateTime(timezone=True), nullable=False),
		sa.Column("actual_checkout_at", sa.DateTime(timezone=True), nullable=True),
		sa.Column("status", sa.String(length=20), nullable=False, server_default="CHECKED_IN"),
		sa.Column("notes", sa.Text(), nullable=True),
		sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
	sa.CheckConstraint("status IN ('CHECKED_IN', 'CHECKED_OUT')", name="ck_stays_status"),
	sa.ForeignKeyConstraint(["reservation_id"], ["reservations.id"]),
	sa.ForeignKeyConstraint(["guest_id"], ["guests.id"]),
	sa.ForeignKeyConstraint(["room_id"], ["rooms.id"]),
	sa.PrimaryKeyConstraint("id"),
	sa.UniqueConstraint("reservation_id"),
	)
	op.create_index("ix_stays_reservation_id", "stays", ["reservation_id"], unique=False)
	op.create_index("ix_stays_guest_id", "stays", ["guest_id"], unique=False)
	op.create_index("ix_stays_room_id", "stays", ["room_id"], unique=False)
	op.create_index("ix_stays_status", "stays", ["status"], unique=False)

	op.create_table(
		"audit_logs",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("user_id", sa.Integer(), nullable=True),
		sa.Column("action", sa.String(length=50), nullable=False),
		sa.Column("entity_type", sa.String(length=50), nullable=False),
		sa.Column("entity_id", sa.Integer(), nullable=False),
		sa.Column("timestamp", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("details", sa.Text(), nullable=True),
	sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
	sa.PrimaryKeyConstraint("id"),
	)
	op.create_index("ix_audit_logs_user_id", "audit_logs", ["user_id"], unique=False)
	op.create_index("ix_audit_logs_action", "audit_logs", ["action"], unique=False)
	op.create_index("ix_audit_logs_entity_type", "audit_logs", ["entity_type"], unique=False)
	op.create_index("ix_audit_logs_entity_id", "audit_logs", ["entity_id"], unique=False)
	op.create_index("ix_audit_logs_timestamp", "audit_logs", ["timestamp"], unique=False)


def downgrade() -> None:
	for index_name in (
		"ix_audit_logs_timestamp",
		"ix_audit_logs_entity_id",
		"ix_audit_logs_entity_type",
		"ix_audit_logs_action",
		"ix_audit_logs_user_id",
	):
		op.drop_index(index_name, table_name="audit_logs")
	op.drop_table("audit_logs")
	for index_name in ("ix_stays_status", "ix_stays_room_id", "ix_stays_guest_id", "ix_stays_reservation_id"):
		op.drop_index(index_name, table_name="stays")
	op.drop_table("stays")
	for index_name in (
		"ix_reservations_expected_checkout",
		"ix_reservations_expected_arrival",
		"ix_reservations_status",
		"ix_reservations_room_id",
		"ix_reservations_guest_id",
	):
		op.drop_index(index_name, table_name="reservations")
	op.drop_table("reservations")