"""Automation / workflow definitions router."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.audit import record_event
from app.database import get_db
from app.schemas import (
    WorkflowDefinitionCreate,
    WorkflowDefinitionOut,
    WorkflowRunBody,
    WorkflowRunOut,
)
from app.services.workflow_engine import execute_workflow

router = APIRouter(prefix="/api/automation", tags=["Automation"])


@router.get("/workflows", response_model=list[WorkflowDefinitionOut])
def list_workflows(db: Session = Depends(get_db)) -> list[models.WorkflowDefinition]:
    return db.query(models.WorkflowDefinition).order_by(models.WorkflowDefinition.id.desc()).all()


@router.post("/workflows", response_model=WorkflowDefinitionOut, status_code=status.HTTP_201_CREATED)
def create_workflow(body: WorkflowDefinitionCreate, db: Session = Depends(get_db)) -> models.WorkflowDefinition:
    if db.query(models.WorkflowDefinition).filter(models.WorkflowDefinition.name == body.name).first():
        raise HTTPException(status_code=409, detail="Workflow with this name already exists")
    wf = models.WorkflowDefinition(**body.model_dump())
    db.add(wf)
    db.flush()
    record_event(
        db,
        action_type="workflow.created",
        entity_type="WorkflowDefinition",
        entity_id=wf.id,
        message=f"Workflow '{wf.name}' created",
    )
    db.commit()
    db.refresh(wf)
    return wf


@router.post("/workflows/{workflow_id}/run", response_model=WorkflowRunOut)
def run_workflow(workflow_id: int, body: WorkflowRunBody, db: Session = Depends(get_db)) -> models.WorkflowRun:
    wf = db.get(models.WorkflowDefinition, workflow_id)
    if wf is None:
        raise HTTPException(status_code=404, detail="Workflow not found")
    run = execute_workflow(db, wf, triggered_by=body.triggered_by, input_payload=body.input_payload)
    db.commit()
    db.refresh(run)
    return run


@router.get("/runs", response_model=list[WorkflowRunOut])
def list_runs(limit: int = 50, db: Session = Depends(get_db)) -> list[models.WorkflowRun]:
    return (
        db.query(models.WorkflowRun)
        .order_by(models.WorkflowRun.id.desc())
        .limit(limit)
        .all()
    )
