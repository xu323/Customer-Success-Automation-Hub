"""Customer Onboarding router."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import models
from app.audit import record_event
from app.database import get_db
from app.schemas import (
    OnboardingProjectCreate,
    OnboardingProjectOut,
    RiskAlertOut,
)
from app.services.workflow_engine import dispatch_event

router = APIRouter(prefix="/api/onboarding", tags=["Onboarding"])


@router.get("/projects", response_model=list[OnboardingProjectOut])
def list_projects(db: Session = Depends(get_db)) -> list[models.CustomerOnboardingProject]:
    return db.query(models.CustomerOnboardingProject).order_by(models.CustomerOnboardingProject.id.desc()).all()


@router.post("/projects", response_model=OnboardingProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(body: OnboardingProjectCreate, db: Session = Depends(get_db)) -> models.CustomerOnboardingProject:
    project = models.CustomerOnboardingProject(
        project_name=body.project_name,
        account_id=body.account_id,
        target_go_live=body.target_go_live or datetime.now(UTC) + timedelta(days=60),
        owner=body.owner,
        description=body.description,
        status=models.OnboardingStatus.planning,
        health_score=85.0,
    )
    db.add(project)
    db.flush()

    if body.tasks:
        for t in body.tasks:
            db.add(
                models.OnboardingTask(
                    project_id=project.id,
                    title=t.title,
                    description=t.description,
                    due_date=t.due_date,
                    assignee=t.assignee,
                    sequence=t.sequence,
                    status=models.TaskStatus.todo,
                )
            )

    record_event(
        db,
        action_type="onboarding.project.created",
        entity_type="CustomerOnboardingProject",
        entity_id=project.id,
        message=f"Onboarding project '{project.project_name}' created",
    )
    db.commit()
    db.refresh(project)
    return project


@router.post("/projects/{project_id}/complete-task", response_model=OnboardingProjectOut)
def complete_task(project_id: int, task_id: int, db: Session = Depends(get_db)) -> models.CustomerOnboardingProject:
    project = db.get(models.CustomerOnboardingProject, project_id)
    if project is None:
        raise HTTPException(status_code=404, detail="Project not found")

    task = db.get(models.OnboardingTask, task_id)
    if task is None or task.project_id != project_id:
        raise HTTPException(status_code=404, detail="Task not found in this project")

    task.status = models.TaskStatus.done
    task.completed_at = datetime.now(UTC)

    if all(t.status == models.TaskStatus.done for t in project.tasks):
        project.status = models.OnboardingStatus.completed
        project.health_score = max(project.health_score, 95.0)
    else:
        project.status = models.OnboardingStatus.in_progress

    record_event(
        db,
        action_type="onboarding.task.completed",
        entity_type="OnboardingTask",
        entity_id=task.id,
        message=f"Task '{task.title}' completed",
    )

    # If project is overdue, fire risk-detection workflow.
    overdue = [t for t in project.tasks if t.status != models.TaskStatus.done and t.due_date and t.due_date < datetime.now(UTC)]
    if overdue:
        dispatch_event(
            db,
            "onboarding.task.overdue",
            {"project_id": project.id, "overdue_tasks": [t.id for t in overdue]},
        )

    db.commit()
    db.refresh(project)
    return project


@router.get("/risks", response_model=list[RiskAlertOut])
def list_risks(db: Session = Depends(get_db)) -> list[models.RiskAlert]:
    return db.query(models.RiskAlert).order_by(models.RiskAlert.id.desc()).all()
