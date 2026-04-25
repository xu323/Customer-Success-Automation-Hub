"""AI Assistant router."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.audit import record_event
from app.database import get_db
from app.schemas import (
    AIResponse,
    CustomerSummaryRequest,
    MeetingNotesRequest,
    NextBestActionRequest,
    RiskExplanationRequest,
)
from app.services.ai_assistant import get_ai_provider

router = APIRouter(prefix="/api/ai", tags=["AI"])


@router.post("/customer-summary", response_model=AIResponse)
def customer_summary(body: CustomerSummaryRequest, db: Session = Depends(get_db)) -> AIResponse:
    result = get_ai_provider().customer_summary(db, body.account_id)
    record_event(db, action_type="ai.customer_summary", entity_type="Account", entity_id=body.account_id)
    db.commit()
    return AIResponse(**result.to_dict())


@router.post("/next-best-action", response_model=AIResponse)
def next_best_action(body: NextBestActionRequest, db: Session = Depends(get_db)) -> AIResponse:
    result = get_ai_provider().next_best_action(db, body.account_id)
    record_event(db, action_type="ai.next_best_action", entity_type="Account", entity_id=body.account_id)
    db.commit()
    return AIResponse(**result.to_dict())


@router.post("/meeting-notes-to-tasks", response_model=AIResponse)
def meeting_notes_to_tasks(body: MeetingNotesRequest, db: Session = Depends(get_db)) -> AIResponse:
    result = get_ai_provider().meeting_notes_to_tasks(body.notes, body.project_id)
    record_event(
        db,
        action_type="ai.meeting_notes_to_tasks",
        entity_type="OnboardingProject",
        entity_id=body.project_id,
    )
    db.commit()
    return AIResponse(**result.to_dict())


@router.post("/risk-explanation", response_model=AIResponse)
def risk_explanation(body: RiskExplanationRequest, db: Session = Depends(get_db)) -> AIResponse:
    result = get_ai_provider().risk_explanation(db, body.project_id)
    record_event(
        db,
        action_type="ai.risk_explanation",
        entity_type="OnboardingProject",
        entity_id=body.project_id,
    )
    db.commit()
    return AIResponse(**result.to_dict())
