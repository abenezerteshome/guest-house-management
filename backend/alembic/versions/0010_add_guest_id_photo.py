"""add id_photo_url to guests

Revision ID: 0010_add_guest_id_photo
Revises: 0009_room_available_after
"""

from collections.abc import Sequence

from alembic import op
import sqlalchemy as sa


revision: str = "0010_add_guest_id_photo"
down_revision: str | None = "0009_room_available_after"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("guests")}
	if "id_photo_url" not in columns:
		op.add_column(
			"guests",
			sa.Column("id_photo_url", sa.Text(), nullable=True),
		)


def downgrade() -> None:
	bind = op.get_bind()
	columns = {column["name"] for column in sa.inspect(bind).get_columns("guests")}
	if "id_photo_url" in columns:
		op.drop_column("guests", "id_photo_url")
