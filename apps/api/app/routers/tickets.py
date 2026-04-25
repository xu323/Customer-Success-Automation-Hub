"""IT Operation tickets router."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.audit import record_event
from app.database import get_db
from app.schemas import TicketCreate, TicketOut, TicketResolveBody

router = APIRouter(prefix="/api/tickets", tags=["IT Operation"])


def _refresh_sla_status(ticket: models.Ticket) -> None:
    if ticket.status in (models.TicketStatus.resolved, models.TicketStatus.closed):
        return
    now = datetime.now(UTC)
    if ticket.sla_due_at is None:
        return
    if now >= ticket.sla_due_at:
        ticket.sla_status = models.SLAStatus.breached
    elif (ticket.sla_due_at - now) <= timedelta(hours=2):
        ticket.sla_status = models.SLAStatus.at_risk
    else:
        ticket.sla_status = models.SLAStatus.within_sla


@router.get("", response_model=list[TicketOut])
def list_tickets(db: Session = Depends(get_db)) -> list[models.Ticket]:
    tickets = db.query(models.Ticket).order_by(models.Ticket.id.desc()).all()
    for t in tickets:
        _refresh_sla_status(t)
    db.commit()
    return tickets


@router.post("", response_model=TicketOut, status_code=status.HTTP_201_CREATED)
def create_ticket(body: TicketCreate, db: Session = Depends(get_db)) -> models.Ticket:
    sla_due = body.sla_due_at or datetime.now(UTC) + timedelta(hours=24)
    ticket = models.Ticket(
        ticket_number=f"INC-{uuid4().hex[:8].upper()}",
        title=body.title,
        description=body.description,
        severity=body.severity,
        status=models.TicketStatus.open,
        sla_status=models.SLAStatus.within_sla,
        requested_by=body.requested_by,
        assignee=body.assignee,
        related_account_id=body.related_account_id,
        sla_due_at=sla_due,
    )
    db.add(ticket)
    db.flush()
    record_event(
        db,
        actor=ticket.requested_by or "system",
        action_type="ticket.created",
        entity_type="Ticket",
        entity_id=ticket.id,
        message=f"Ticket {ticket.ticket_number} opened ({ticket.severity.value})",
    )
    db.commit()
    db.refresh(ticket)
    return ticket


@router.post("/{ticket_id}/resolve", response_model=TicketOut)
def resolve_ticket(ticket_id: int, body: TicketResolveBody, db: Session = Depends(get_db)) -> models.Ticket:
    ticket = db.get(models.Ticket, ticket_id)
    if ticket is None:
        raise HTTPException(status_code=404, detail="Ticket not found")
    if ticket.status in (models.TicketStatus.resolved, models.TicketStatus.closed):
        return ticket
    ticket.status = models.TicketStatus.resolved
    ticket.resolved_at = datetime.now(UTC)
    record_event(
        db,
        action_type="ticket.resolved",
        entity_type="Ticket",
        entity_id=ticket.id,
        message=body.resolution_note or "Resolved",
    )
    db.commit()
    db.refresh(ticket)
    return ticket
