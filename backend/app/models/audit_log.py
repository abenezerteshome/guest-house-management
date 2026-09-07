from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AuditLog(Base):
	__tablename__ = "audit_logs"

	id: Mapped[int] = mapped_column(primary_key=True)
	user_id: Mapped[int | None] = mapped_column(ForeignKey("users.id"), nullable=True, index=True)
	action: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
	entity_type: Mapped[str] = mapped_column(String(50), nullable=False, index=True)
	entity_id: Mapped[int] = mapped_column(nullable=False, index=True)
	timestamp: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), index=True
	)
	details: Mapped[str | None] = mapped_column(Text, nullable=True)
