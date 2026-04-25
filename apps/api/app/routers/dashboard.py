"""Executive Dashboard summary router."""
from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app import models
from app.database import get_db
from app.schemas import AuditLogOut, DashboardSummary

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/summary", response_model=DashboardSummary)
def summary(db: Session = Depends(get_db)) -> DashboardSummary:
    opps = db.query(models.Opportunity).all()
    open_opps = [o for o in opps if o.stage not in (models.OpportunityStage.won, models.OpportunityStage.lost)]
    pipeline_value = sum(o.amount * (o.probability or 0) for o in open_opps)

    leads = db.query(models.Lead).all()
    leads_to_qualify = sum(
        1 for lead in leads if lead.status in (models.LeadStatus.new, models.LeadStatus.contacted)
    )

    quotes_pending = db.query(models.Quote).filter(
        models.Quote.status.in_([models.QuoteStatus.draft, models.QuoteStatus.sent])
    ).count()

    projects = db.query(models.CustomerOnboardingProject).all()
    active_projects = [p for p in projects if p.status in (models.OnboardingStatus.planning, models.OnboardingStatus.in_progress, models.OnboardingStatus.on_hold)]
    onboarding_at_risk = sum(1 for p in active_projects if p.health_score < 70)

    pending_approvals = db.query(models.BPMRequest).filter(
        models.BPMRequest.status == models.ApprovalStatus.Submitted
    ).count()

    runs = db.query(models.WorkflowRun).all()
    if runs:
        success_rate = sum(1 for r in runs if r.status == models.WorkflowRunStatus.succeeded) / len(runs) * 100.0
    else:
        success_rate = 100.0

    open_tickets = db.query(models.Ticket).filter(
        models.Ticket.status.in_([models.TicketStatus.open, models.TicketStatus.in_progress])
    ).count()
    breached_tickets = db.query(models.Ticket).filter(
        models.Ticket.sla_status == models.SLAStatus.breached,
        models.Ticket.status != models.TicketStatus.closed,
    ).count()

    risk_alerts = db.query(models.RiskAlert).filter(models.RiskAlert.resolved.is_(False)).count()

    recent_audit = (
        db.query(models.AuditLog)
        .order_by(models.AuditLog.id.desc())
        .limit(15)
        .all()
    )

    return DashboardSummary(
        crm_pipeline_value=round(pipeline_value, 2),
        open_opportunities=len(open_opps),
        leads_to_qualify=leads_to_qualify,
        quotes_pending=quotes_pending,
        active_onboarding_projects=len(active_projects),
        onboarding_at_risk=onboarding_at_risk,
        pending_approvals=pending_approvals,
        automation_success_rate=round(success_rate, 1),
        open_tickets=open_tickets,
        breached_tickets=breached_tickets,
        risk_alerts=risk_alerts,
        recent_audit_events=[AuditLogOut.model_validate(a) for a in recent_audit],
    )
