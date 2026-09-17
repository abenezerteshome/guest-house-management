"""add email and google_sub to users table

Revision ID: 0016_add_user_google_auth
Revises: 0015_add_voided_stay_status
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0016_add_user_google_auth"
down_revision: str | None = "0015_add_voided_stay_status"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	op.add_column("users", sa.Column("email", sa.String(length=255), nullable=True))
	op.add_column("users", sa.Column("google_sub", sa.String(length=255), nullable=True))
	op.create_index("ix_users_email", "users", ["email"], unique=True)
	op.create_index("ix_users_google_sub", "users", ["google_sub"], unique=True)


def downgrade() -> None:
	op.drop_index("ix_users_google_sub", table_name="users")
	op.drop_index("ix_users_email", table_name="users")
	op.drop_column("users", "google_sub")
	op.drop_column("users", "email")
