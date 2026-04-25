"""Audit log router."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.schemas import AuditLogOut

router = APIRouter(prefix="/api/audit-logs", tags=["Audit"])


@router.get("", response_model=list[AuditLogOut])
def list_audit_logs(
    entity_type: str | None = None,
    action_type: str | None = None,
    status: str | None = None,
    limit: int = 200,
    db: Session = Depends(get_db),
) -> list[models.AuditLog]:
    q = db.query(models.AuditLog).order_by(models.AuditLog.id.desc())
    if entity_type:
        q = q.filter(models.AuditLog.entity_type == entity_type)
    if action_type:
        q = q.filter(models.AuditLog.action_type == action_type)
    if status:
        q = q.filter(models.AuditLog.status == status)
    return q.limit(limit).all()
