"""add phone to users table

Revision ID: 0019_add_user_phone
Revises: 0018_seed_super_admin
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0019_add_user_phone"
down_revision: str | None = "0018_seed_super_admin"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.add_column("users", sa.Column("phone", sa.String(length=50), nullable=True))
	op.create_index("ix_users_phone", "users", ["phone"], unique=False)


def downgrade() -> None:
	op.drop_index("ix_users_phone", table_name="users")
	op.drop_column("users", "phone")
