"""add properties table and multi-tenant scoping

Revision ID: 0017_add_properties_tenancy
Revises: 0016_add_user_google_auth
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0017_add_properties_tenancy"
down_revision: str | None = "0016_add_user_google_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	# 1. Create properties table
	op.create_table(
		"properties",
		sa.Column("id", sa.Integer(), autoincrement=True, nullable=False),
		sa.Column("name", sa.String(length=200), nullable=False),
		sa.Column("code", sa.String(length=50), nullable=False),
		sa.Column("contact_phone", sa.String(length=50), nullable=True),
		sa.Column("contact_email", sa.String(length=255), nullable=True),
		sa.Column("address", sa.String(length=300), nullable=True),
		sa.Column("currency", sa.String(length=10), nullable=False, server_default="ETB"),
		sa.Column("checkout_deadline_hour", sa.Integer(), nullable=False, server_default="4"),
		sa.Column("checkout_deadline_minute", sa.Integer(), nullable=False, server_default="0"),
		sa.Column("late_checkout_penalty", sa.Numeric(precision=10, scale=2), nullable=False, server_default="600.00"),
		sa.Column("is_active", sa.Boolean(), nullable=False, server_default=sa.true()),
		sa.Column("notes", sa.Text(), nullable=True),
		sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
		sa.CheckConstraint("length(trim(name)) > 0", name="ck_properties_name_not_empty"),
		sa.CheckConstraint("length(trim(code)) > 0", name="ck_properties_code_not_empty"),
		sa.CheckConstraint("checkout_deadline_hour >= 0 AND checkout_deadline_hour <= 23", name="ck_properties_deadline_hour"),
		sa.CheckConstraint("checkout_deadline_minute >= 0 AND checkout_deadline_minute <= 59", name="ck_properties_deadline_minute"),
		sa.CheckConstraint("late_checkout_penalty >= 0", name="ck_properties_late_penalty_nonnegative"),
		sa.PrimaryKeyConstraint("id"),
		sa.UniqueConstraint("code"),
	)
	op.create_index("ix_properties_code", "properties", ["code"], unique=False)

	# 2. Insert default property for existing data backfill
	op.execute(
		"INSERT INTO properties (name, code, currency, checkout_deadline_hour, checkout_deadline_minute, late_checkout_penalty, is_active) "
		"VALUES ('Family Guest House', 'MAIN', 'ETB', 4, 0, 600.00, true) "
		"ON CONFLICT (code) DO NOTHING;"
	)

	# 3. Add property_id column to users, rooms, guests, reservations, stays, charges, payments, expenses, audit_logs
	all_tables = ["users", "rooms", "guests", "reservations", "stays", "charges", "payments", "expenses", "audit_logs"]
	for tbl in all_tables:
		op.add_column(tbl, sa.Column("property_id", sa.Integer(), nullable=True))
		op.create_index(f"ix_{tbl}_property_id", tbl, ["property_id"], unique=False)
		op.execute(f"UPDATE {tbl} SET property_id = (SELECT id FROM properties WHERE code = 'MAIN') WHERE property_id IS NULL;")

	# 4. Make property_id non-nullable for operational tables (users and audit_logs allow null for platform-wide actions)
	strict_tables = ["rooms", "guests", "reservations", "stays", "charges", "payments", "expenses"]
	for tbl in strict_tables:
		op.alter_column(tbl, "property_id", nullable=False)

	# 5. Add foreign key constraints
	op.create_foreign_key("fk_users_property_id", "users", "properties", ["property_id"], ["id"], ondelete="RESTRICT")
	for tbl in ["rooms", "guests", "reservations", "stays", "charges", "payments", "expenses", "audit_logs"]:
		op.create_foreign_key(f"fk_{tbl}_property_id", tbl, "properties", ["property_id"], ["id"], ondelete="CASCADE")

	# 6. Update user role check constraint to include SUPER_ADMIN
	op.drop_constraint("ck_users_role", "users", type_="check")
	op.create_check_constraint(
		"ck_users_role", "users", "role IN ('SUPER_ADMIN', 'ADMIN', 'RECEPTION')"
	)

	# 7. Convert rooms.room_number unique constraint to composite unique(property_id, room_number)
	# Drop previous single-column unique constraint and unique index
	op.execute("ALTER TABLE rooms DROP CONSTRAINT IF EXISTS rooms_room_number_key;")
	op.execute("DROP INDEX IF EXISTS ix_rooms_room_number;")
	op.execute("CREATE INDEX IF NOT EXISTS ix_rooms_room_number ON rooms (room_number);")
	op.create_unique_constraint("uq_rooms_property_room_number", "rooms", ["property_id", "room_number"])


def downgrade() -> None:
	# 1. Revert rooms unique constraint
	op.drop_constraint("uq_rooms_property_room_number", "rooms", type_="unique")
	op.create_unique_constraint("rooms_room_number_key", "rooms", ["room_number"])

	# 2. Revert user role check constraint
	op.drop_constraint("ck_users_role", "users", type_="check")
	op.create_check_constraint("ck_users_role", "users", "role IN ('ADMIN', 'RECEPTION')")

	# 3. Drop foreign keys and columns
	op.drop_constraint("fk_users_property_id", "users", type_="foreignkey")
	all_tables = ["users", "rooms", "guests", "reservations", "stays", "charges", "payments", "expenses", "audit_logs"]
	for tbl in ["rooms", "guests", "reservations", "stays", "charges", "payments", "expenses", "audit_logs"]:
		op.drop_constraint(f"fk_{tbl}_property_id", tbl, type_="foreignkey")

	for tbl in all_tables:
		op.drop_index(f"ix_{tbl}_property_id", table_name=tbl)
		op.drop_column(tbl, "property_id")

	# 4. Drop properties table
	op.drop_index("ix_properties_code", table_name="properties")
	op.drop_table("properties")
