from fastapi import APIRouter, Depends, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.dependencies import require_admin
from app.db.session import get_db
from app.models.audit_log import AuditLog
from app.models.user import User
from app.schemas.audit import AuditLogRead


router = APIRouter(prefix="/audit-logs", tags=["audit"])


@router.get("", response_model=list[AuditLogRead], dependencies=[Depends(require_admin)])
async def list_audit_logs(
	limit: int = Query(default=100, ge=1, le=500),
	session: AsyncSession = Depends(get_db),
) -> list[AuditLogRead]:
	query = (
		select(AuditLog, User.full_name)
		.outerjoin(User, User.id == AuditLog.user_id)
		.order_by(AuditLog.timestamp.desc(), AuditLog.id.desc())
		.limit(limit)
	)
	rows = (await session.execute(query)).all()
	return [
		AuditLogRead(
			id=log.id,
			user_id=log.user_id,
			actor_name=actor_name,
			action=log.action,
			entity_type=log.entity_type,
			entity_id=log.entity_id,
			timestamp=log.timestamp,
			details=log.details,
		)
		for log, actor_name in rows
	]
