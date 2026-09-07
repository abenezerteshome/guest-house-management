from datetime import datetime

from pydantic import BaseModel


class AuditLogRead(BaseModel):
	id: int
	user_id: int | None
	actor_name: str | None
	action: str
	entity_type: str
	entity_id: int
	timestamp: datetime
	details: str | None
