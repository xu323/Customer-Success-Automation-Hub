"""Workflow engine: condition evaluation + action execution."""
from app import models
from app.database import SessionLocal
from app.services.workflow_engine import execute_workflow


def _make_workflow(db, *, conditions=None, actions=None):
    wf = models.WorkflowDefinition(
        name="test-wf",
        trigger={"type": "manual"},
        conditions=conditions or [],
        actions=actions or [],
        enabled=True,
    )
    db.add(wf)
    db.flush()
    return wf


def test_workflow_skips_when_condition_fails():
    with SessionLocal() as db:
        wf = _make_workflow(
            db,
            conditions=[{"path": "amount", "op": ">=", "value": 1000}],
            actions=[{"type": "send_notification", "params": {"to": "x@y.com"}}],
        )
        run = execute_workflow(db, wf, input_payload={"amount": 100})
        db.commit()
        assert run.status == models.WorkflowRunStatus.succeeded
        assert run.result and run.result.get("skipped") is True


def test_workflow_creates_onboarding_project():
    with SessionLocal() as db:
        wf = _make_workflow(
            db,
            actions=[{"type": "create_onboarding_project", "params": {"target_days": 30}}],
        )
        run = execute_workflow(db, wf, input_payload={"account_name": "DemoCo"})
        db.commit()
        assert run.status == models.WorkflowRunStatus.succeeded
        assert db.query(models.CustomerOnboardingProject).count() == 1


def test_workflow_unknown_action_fails():
    with SessionLocal() as db:
        wf = _make_workflow(db, actions=[{"type": "definitely_not_a_real_action"}])
        run = execute_workflow(db, wf, input_payload={})
        db.commit()
        assert run.status == models.WorkflowRunStatus.failed
        assert "Unknown action type" in (run.error_message or "")
