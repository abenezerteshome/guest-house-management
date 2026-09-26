import builtins
from datetime import datetime
from enum import StrEnum

from sqlalchemy import Boolean, CheckConstraint, DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class UserRole(StrEnum):
	SUPER_ADMIN = "SUPER_ADMIN"
	ADMIN = "ADMIN"
	RECEPTION = "RECEPTION"


class User(Base):
	__tablename__ = "users"
	__table_args__ = (
		CheckConstraint("role IN ('SUPER_ADMIN', 'ADMIN', 'RECEPTION')", name="ck_users_role"),
	)

	id: Mapped[int] = mapped_column(primary_key=True)
	property_id: Mapped[int | None] = mapped_column(
		ForeignKey("properties.id", ondelete="RESTRICT"), nullable=True, index=True
	)
	property: Mapped["Property | None"] = relationship("Property", lazy="selectin")

	@builtins.property
	def property_name(self) -> str | None:
		return self.property.name if self.property else None
	full_name: Mapped[str] = mapped_column(String(200), nullable=False)
	username: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
	password_hash: Mapped[str] = mapped_column(String(255), nullable=False)
	role: Mapped[str] = mapped_column(String(20), nullable=False)
	email: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
	google_sub: Mapped[str | None] = mapped_column(String(255), unique=True, index=True, nullable=True)
	is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
	)
