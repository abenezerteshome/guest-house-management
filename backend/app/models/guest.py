from datetime import datetime

from sqlalchemy import DateTime, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Guest(Base):
	__tablename__ = "guests"

	id: Mapped[int] = mapped_column(primary_key=True)
	full_name: Mapped[str] = mapped_column(String(200), index=True, nullable=False)
	id_number: Mapped[str] = mapped_column(String(100), index=True, nullable=False)
	phone: Mapped[str] = mapped_column(String(50), index=True, nullable=False)
	address: Mapped[str | None] = mapped_column(String(300), nullable=True)
	nationality: Mapped[str | None] = mapped_column(String(100), nullable=True)
	notes: Mapped[str | None] = mapped_column(Text, nullable=True)
	created_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now()
	)
	updated_at: Mapped[datetime] = mapped_column(
		DateTime(timezone=True), nullable=False, server_default=func.now(), onupdate=func.now()
	)