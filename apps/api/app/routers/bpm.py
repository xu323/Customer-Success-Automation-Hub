"""BPM (Business Process Management) router.

Mirrors the typical Microsoft Dataverse / Power Automate approval flow:
    Draft -> Submitted -> Approved/Rejected -> Completed (and synced to BC).
"""
from __future__ import annotations

from datetime import UTC, datetime
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.audit import record_event
from app.database import get_db
from app.schemas import (
    ApprovalDecisionBody,
    BPMRequestCreate,
    BPMRequestOut,
)
from app.services.business_central_client import get_bc_client
from app.services.workflow_engine import dispatch_event

router = APIRouter(prefix="/api/bpm", tags=["BPM"])


def _ensure_request(db: Session, request_id: int) -> models.BPMRequest:
    req = db.get(models.BPMRequest, request_id)
    if req is None:
        raise HTTPException(status_code=404, detail="BPM request not found")
    return req


@router.get("/requests", response_model=list[BPMRequestOut])
def list_requests(db: Session = Depends(get_db)) -> list[models.BPMRequest]:
    return db.query(models.BPMRequest).order_by(models.BPMRequest.id.desc()).all()


@router.post("/requests", response_model=BPMRequestOut, status_code=status.HTTP_201_CREATED)
def create_request(body: BPMRequestCreate, db: Session = Depends(get_db)) -> models.BPMRequest:
    req = models.BPMRequest(
        request_number=f"REQ-{uuid4().hex[:8].upper()}",
        request_type=body.request_type,
        title=body.title,
        requester=body.requester,
        amount=body.amount,
        currency=body.currency,
        payload=body.payload,
        status=models.ApprovalStatus.Draft,
    )
    db.add(req)
    db.flush()

    approvers = body.approvers or ["manager@partner.com", "finance@partner.com"]
    for idx, approver in enumerate(approvers, start=1):
        db.add(
            models.ApprovalStep(
                request_id=req.id,
                sequence=idx,
                approver=approver,
                role="Manager" if idx == 1 else "Finance",
                decision=models.ApprovalStatus.Submitted,
            )
        )

    record_event(
        db,
        actor=req.requester,
        action_type="bpm.request.created",
        entity_type="BPMRequest",
        entity_id=req.id,
        message=f"BPM request {req.request_number} drafted",
    )
    db.commit()
    db.refresh(req)
    return req


@router.post("/requests/{request_id}/submit", response_model=BPMRequestOut)
def submit_request(request_id: int, db: Session = Depends(get_db)) -> models.BPMRequest:
    req = _ensure_request(db, request_id)
    if req.status != models.ApprovalStatus.Draft:
        raise HTTPException(status_code=409, detail=f"Cannot submit request in status {req.status}")
    req.status = models.ApprovalStatus.Submitted
    record_event(
        db,
        actor=req.requester,
        action_type="bpm.request.submitted",
        entity_type="BPMRequest",
        entity_id=req.id,
        message=f"BPM request {req.request_number} submitted",
    )
    db.commit()
    db.refresh(req)
    return req


def _next_pending_step(req: models.BPMRequest) -> models.ApprovalStep | None:
    for step in req.steps:
        if step.decision == models.ApprovalStatus.Submitted:
            return step
    return None


@router.post("/requests/{request_id}/approve", response_model=BPMRequestOut)
def approve_request(request_id: int, body: ApprovalDecisionBody, db: Session = Depends(get_db)) -> models.BPMRequest:
    req = _ensure_request(db, request_id)
    if req.status != models.ApprovalStatus.Submitted:
        raise HTTPException(status_code=409, detail="Request is not currently awaiting approval")
    step = _next_pending_step(req)
    if step is None:
        raise HTTPException(status_code=409, detail="No pending approval step")
    if step.approver != body.approver:
        raise HTTPException(status_code=403, detail=f"Approver mismatch: expected {step.approver}")
    step.decision = models.ApprovalStatus.Approved
    step.decided_at = datetime.now(UTC)
    step.comment = body.comment

    if _next_pending_step(req) is None:
        req.status = models.ApprovalStatus.Approved

    record_event(
        db,
        actor=body.approver,
        action_type="bpm.request.approved",
        entity_type="BPMRequest",
        entity_id=req.id,
        message=f"Step {step.sequence} approved by {body.approver}",
    )
    db.commit()
    db.refresh(req)
    return req


@router.post("/requests/{request_id}/reject", response_model=BPMRequestOut)
def reject_request(request_id: int, body: ApprovalDecisionBody, db: Session = Depends(get_db)) -> models.BPMRequest:
    req = _ensure_request(db, request_id)
    step = _next_pending_step(req)
    if step is None or req.status != models.ApprovalStatus.Submitted:
        raise HTTPException(status_code=409, detail="No active approval step to reject")
    if step.approver != body.approver:
        raise HTTPException(status_code=403, detail=f"Approver mismatch: expected {step.approver}")
    step.decision = models.ApprovalStatus.Rejected
    step.decided_at = datetime.now(UTC)
    step.comment = body.comment
    req.status = models.ApprovalStatus.Rejected
    record_event(
        db,
        actor=body.approver,
        action_type="bpm.request.rejected",
        entity_type="BPMRequest",
        entity_id=req.id,
        message=f"Request rejected by {body.approver}",
    )
    db.commit()
    db.refresh(req)
    return req


@router.post("/requests/{request_id}/sync-to-bc", response_model=BPMRequestOut)
def sync_to_bc(request_id: int, db: Session = Depends(get_db)) -> models.BPMRequest:
    req = _ensure_request(db, request_id)
    if req.status != models.ApprovalStatus.Approved:
        raise HTTPException(status_code=409, detail="Only approved requests can be synced to Business Central")

    bc = get_bc_client()
    body = {
        "request_number": req.request_number,
        "title": req.title,
        "amount": req.amount,
        "currency": req.currency,
        "requester": req.requester,
        "payload": req.payload,
    }
    if req.request_type == models.BPMRequestType.VendorPayment:
        result = bc.push_vendor_payment(body)
    elif req.request_type == models.BPMRequestType.EmployeePayment:
        result = bc.push_employee_payment(body)
    else:
        result = bc.push_travel_request(body)

    req.status = models.ApprovalStatus.Completed
    req.bc_sync_status = "ok" if result.ok else "failed"
    req.bc_sync_reference = result.bc_document_id

    record_event(
        db,
        actor="system",
        action_type="bpm.request.synced_to_bc",
        entity_type="BPMRequest",
        entity_id=req.id,
        message=f"Synced to BC document {result.bc_document_id}",
        payload={"bc_document_id": result.bc_document_id, "synced_at": result.synced_at.isoformat()},
    )

    dispatch_event(
        db,
        "bpm.request.synced_to_bc",
        {
            "request_id": req.id,
            "request_type": req.request_type.value,
            "amount": req.amount,
            "currency": req.currency,
            "title": req.title,
            "requester": req.requester,
        },
    )

    db.commit()
    db.refresh(req)
    return req
