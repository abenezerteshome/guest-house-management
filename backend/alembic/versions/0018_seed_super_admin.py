"""seed super admin user

Revision ID: 0018_seed_super_admin
Revises: 0017_add_properties_tenancy
"""

from collections.abc import Sequence
from alembic import op
import sqlalchemy as sa
from app.core.security import hash_password


revision: str = "0018_seed_super_admin"
down_revision: str | None = "0017_add_properties_tenancy"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	superadmin_hash = hash_password("super-password-123")
	bind = op.get_bind()

	# 1. Upsert Super Admin user
	bind.execute(
		sa.text(
			"""
			INSERT INTO users (full_name, username, password_hash, role, email, is_active, property_id)
			VALUES ('Platform Super Administrator', 'superadmin', :hash, 'SUPER_ADMIN', 'superadmin@platform.local', true, NULL)
			ON CONFLICT (username) DO UPDATE 
			SET role = 'SUPER_ADMIN', password_hash = :hash, is_active = true, property_id = NULL;
			"""
		),
		{"hash": superadmin_hash},
	)


def downgrade() -> None:
	op.execute("DELETE FROM users WHERE username = 'superadmin';")
