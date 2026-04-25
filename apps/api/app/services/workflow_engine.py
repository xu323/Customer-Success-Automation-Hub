"""JSON-driven workflow engine (mock Power Automate).

A workflow is a JSON document with:
    {
        "trigger":   {"type": "event", "event": "quote.won"} | {"type": "manual"},
        "conditions": [ {"path": "amount", "op": ">=", "value": 10000}, ... ],
        "actions":   [ {"type": "create_onboarding_project", "params": {...}}, ... ]
    }

The engine evaluates conditions against the input payload and then
executes the action list. Each action emits an audit log entry and a
WorkflowActionLog row, so the front-end can render a timeline.

Supported actions (extendable):
    - create_onboarding_project
    - create_risk_alert
    - create_ticket
    - sync_to_business_central
    - send_notification
    - call_power_automate_flow
    - http_post  (only logs - useful for "imagine it called Microsoft Graph")
"""
from __future__ import annotations

from collections.abc import Callable
from datetime import UTC, datetime, timedelta
from typing import Any

from sqlalchemy.orm import Session

from app import models
from app.audit import record_event
from app.services.business_central_client import get_bc_client
from app.services.power_automate_client import get_power_automate_client

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _resolve_path(payload: dict[str, Any], path: str) -> Any:
    """Walk a dotted path inside a payload (e.g. "opportunity.amount")."""
    cur: Any = payload
    for part in path.split("."):
        if cur is None:
            return None
        cur = cur.get(part) if isinstance(cur, dict) else getattr(cur, part, None)
    return cur


def _evaluate_condition(payload: dict[str, Any], condition: dict[str, Any]) -> bool:
    op = condition.get("op", "==")
    actual = _resolve_path(payload, condition["path"])
    expected = condition.get("value")
    if op == "==":
        return actual == expected
    if op == "!=":
        return actual != expected
    if op == ">":
        return actual is not None and actual > expected
    if op == ">=":
        return actual is not None and actual >= expected
    if op == "<":
        return actual is not None and actual < expected
    if op == "<=":
        return actual is not None and actual <= expected
    if op == "in":
        return actual in (expected or [])
    if op == "contains":
        return expected in (actual or "")
    if op == "exists":
        return actual is not None
    raise ValueError(f"Unsupported condition operator: {op}")


# ---------------------------------------------------------------------------
# Action handlers
# ---------------------------------------------------------------------------

ActionHandler = Callable[[Session, dict[str, Any], dict[str, Any]], dict[str, Any]]


def _action_create_onboarding_project(db: Session, params: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    project_name = params.get("project_name") or f"Onboarding for {_resolve_path(payload, 'account_name') or 'New Customer'}"
    target_days = int(params.get("target_days", 60))
    project = models.CustomerOnboardingProject(
        project_name=project_name,
        account_id=_resolve_path(payload, "account_id"),
        target_go_live=datetime.now(UTC) + timedelta(days=target_days),
        owner=params.get("owner") or "delivery@partner.com",
        status=models.OnboardingStatus.planning,
        description=params.get("description") or "Auto-created from won opportunity.",
    )
    db.add(project)
    db.flush()

    template_tasks = params.get("tasks") or [
        {"title": "Kickoff Meeting", "sequence": 1, "due_in_days": 3},
        {"title": "Requirement Workshop", "sequence": 2, "due_in_days": 10},
        {"title": "Solution Design Review", "sequence": 3, "due_in_days": 20},
        {"title": "Configuration & Customisation", "sequence": 4, "due_in_days": 35},
        {"title": "User Acceptance Testing", "sequence": 5, "due_in_days": 50},
        {"title": "Go Live & Hypercare", "sequence": 6, "due_in_days": 60},
    ]
    for t in template_tasks:
        db.add(
            models.OnboardingTask(
                project_id=project.id,
                title=t["title"],
                sequence=t.get("sequence", 0),
                due_date=datetime.now(UTC) + timedelta(days=int(t.get("due_in_days", 7))),
                status=models.TaskStatus.todo,
            )
        )
    db.flush()
    return {"project_id": project.id, "tasks_created": len(template_tasks)}


def _action_create_risk_alert(db: Session, params: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    alert = models.RiskAlert(
        project_id=params.get("project_id") or _resolve_path(payload, "project_id"),
        level=models.RiskLevel(params.get("level", "medium")),
        title=params.get("title") or "Auto-detected onboarding risk",
        description=params.get("description") or "An automation rule flagged this project as needing attention.",
    )
    db.add(alert)
    db.flush()
    return {"risk_alert_id": alert.id}


def _action_create_ticket(db: Session, params: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    from uuid import uuid4

    ticket = models.Ticket(
        ticket_number=f"INC-{uuid4().hex[:8].upper()}",
        title=params.get("title") or "Auto-generated incident",
        description=params.get("description") or "Created automatically by workflow engine.",
        severity=models.IncidentSeverity(params.get("severity", "sev3")),
        status=models.TicketStatus.open,
        sla_status=models.SLAStatus.within_sla,
        sla_due_at=datetime.now(UTC) + timedelta(hours=int(params.get("sla_hours", 24))),
        related_account_id=_resolve_path(payload, "account_id"),
        requested_by=params.get("requested_by", "system"),
    )
    db.add(ticket)
    db.flush()
    return {"ticket_id": ticket.id, "ticket_number": ticket.ticket_number}


def _action_sync_to_business_central(db: Session, params: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    bc = get_bc_client()
    request_type = params.get("request_type") or _resolve_path(payload, "request_type") or "VendorPayment"
    body = {
        "title": _resolve_path(payload, "title"),
        "amount": _resolve_path(payload, "amount"),
        "currency": _resolve_path(payload, "currency") or "USD",
        "requester": _resolve_path(payload, "requester"),
        **(params.get("extra") or {}),
    }
    if request_type == "VendorPayment":
        result = bc.push_vendor_payment(body)
    elif request_type == "EmployeePayment":
        result = bc.push_employee_payment(body)
    else:
        result = bc.push_travel_request(body)
    return {"bc_document_id": result.bc_document_id, "synced_at": result.synced_at.isoformat()}


def _action_send_notification(_: Session, params: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    return {
        "channel": params.get("channel", "email"),
        "to": params.get("to", "delivery@partner.com"),
        "subject": params.get("subject", "Customer Success Hub notification"),
        "rendered_body": (params.get("body") or "Notification body").format(**(payload or {})) if params.get("body") else "Notification dispatched (mock)",
    }


def _action_call_power_automate_flow(_: Session, params: dict[str, Any], payload: dict[str, Any]) -> dict[str, Any]:
    pa = get_power_automate_client()
    result = pa.invoke_flow(params.get("flow_name", "Generic Flow"), payload)
    return {"run_id": result.run_id, "started_at": result.started_at.isoformat()}


def _action_http_post(_: Session, params: dict[str, Any], __: dict[str, Any]) -> dict[str, Any]:
    # Don't actually call the network in tests/demo - just describe the call.
    return {
        "would_call": params.get("url"),
        "headers": params.get("headers"),
        "body_preview": str(params.get("body"))[:500],
        "note": "Mocked - replace with httpx.post in live mode.",
    }


ACTION_REGISTRY: dict[str, ActionHandler] = {
    "create_onboarding_project": _action_create_onboarding_project,
    "create_risk_alert": _action_create_risk_alert,
    "create_ticket": _action_create_ticket,
    "sync_to_business_central": _action_sync_to_business_central,
    "send_notification": _action_send_notification,
    "call_power_automate_flow": _action_call_power_automate_flow,
    "http_post": _action_http_post,
}


# ---------------------------------------------------------------------------
# Engine entry point
# ---------------------------------------------------------------------------


def execute_workflow(
    db: Session,
    workflow: models.WorkflowDefinition,
    *,
    triggered_by: str = "manual",
    input_payload: dict[str, Any] | None = None,
) -> models.WorkflowRun:
    payload = dict(input_payload or {})
    run = models.WorkflowRun(
        workflow_id=workflow.id,
        status=models.WorkflowRunStatus.running,
        triggered_by=triggered_by,
        input_payload=payload,
    )
    db.add(run)
    db.flush()

    record_event(
        db,
        actor=triggered_by,
        action_type="workflow.run.started",
        entity_type="workflow_run",
        entity_id=run.id,
        message=f"Workflow '{workflow.name}' started",
    )

    # ---- Conditions ----
    for cond in workflow.conditions or []:
        if not _evaluate_condition(payload, cond):
            run.status = models.WorkflowRunStatus.succeeded
            run.finished_at = datetime.now(UTC)
            run.result = {"skipped": True, "reason": f"Condition failed: {cond}"}
            db.add(
                models.WorkflowActionLog(
                    run_id=run.id,
                    sequence=0,
                    action_type="condition_skip",
                    status="skipped",
                    message=f"Condition not met: {cond}",
                    output={"condition": cond},
                )
            )
            db.flush()
            return run

    # ---- Actions ----
    outputs: list[dict[str, Any]] = []
    try:
        for idx, action in enumerate(workflow.actions, start=1):
            atype = action["type"]
            handler = ACTION_REGISTRY.get(atype)
            if handler is None:
                raise ValueError(f"Unknown action type: {atype}")
            params = action.get("params", {})
            output = handler(db, params, payload)
            outputs.append({"action": atype, "output": output})
            db.add(
                models.WorkflowActionLog(
                    run_id=run.id,
                    sequence=idx,
                    action_type=atype,
                    status="ok",
                    message=f"Action {atype} executed",
                    output=output,
                )
            )
            # Make the output available to subsequent actions via the payload.
            payload.setdefault("_results", []).append({"action": atype, "output": output})
            db.flush()
        run.status = models.WorkflowRunStatus.succeeded
        run.result = {"actions": outputs}
    except Exception as exc:  # noqa: BLE001
        run.status = models.WorkflowRunStatus.failed
        run.error_message = str(exc)
        record_event(
            db,
            actor=triggered_by,
            action_type="workflow.run.failed",
            entity_type="workflow_run",
            entity_id=run.id,
            status="error",
            error_message=str(exc),
        )
    finally:
        run.finished_at = datetime.now(UTC)
        record_event(
            db,
            actor=triggered_by,
            action_type="workflow.run.finished",
            entity_type="workflow_run",
            entity_id=run.id,
            status=run.status.value if hasattr(run.status, "value") else str(run.status),
            payload={"workflow_name": workflow.name},
        )
    return run


# ---------------------------------------------------------------------------
# Event dispatch
# ---------------------------------------------------------------------------


def dispatch_event(db: Session, event_name: str, payload: dict[str, Any] | None = None) -> list[models.WorkflowRun]:
    """Run every enabled workflow whose trigger matches `event_name`."""
    matched = (
        db.query(models.WorkflowDefinition)
        .filter(models.WorkflowDefinition.enabled.is_(True))
        .all()
    )
    runs: list[models.WorkflowRun] = []
    for wf in matched:
        trig = wf.trigger or {}
        if trig.get("type") == "event" and trig.get("event") == event_name:
            runs.append(execute_workflow(db, wf, triggered_by=f"event:{event_name}", input_payload=payload))
    return runs
