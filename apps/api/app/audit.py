"""Audit log helper.

Used everywhere a state change happens (CRM, BPM, automation, BC sync, ...).
Centralising the implementation makes it trivial to swap in a different
sink later (Azure Monitor, Application Insights, Dataverse audit table).
"""
from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from app.models import AuditLog


def record_event(
    db: Session,
    *,
    actor: str = "system",
    action_type: str,
    entity_type: str,
    entity_id: str | int | None = None,
    status: str = "ok",
    message: str | None = None,
    error_message: str | None = None,
    payload: dict[str, Any] | None = None,
) -> AuditLog:
    """Persist an audit log entry. Caller is responsible for committing."""
    log = AuditLog(
        actor=actor,
        action_type=action_type,
        entity_type=entity_type,
        entity_id=str(entity_id) if entity_id is not None else None,
        status=status,
        message=message,
        error_message=error_message,
        payload=payload,
    )
    db.add(log)
    db.flush()
    return log
