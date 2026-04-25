"""Seed deterministic demo data so the UI looks alive on first launch."""
from __future__ import annotations

from datetime import UTC, datetime, timedelta

from sqlalchemy.orm import Session

from app import models


def _utc(days: int = 0, hours: int = 0) -> datetime:
    return datetime.now(UTC) + timedelta(days=days, hours=hours)


def seed_if_empty(db: Session) -> None:
    """Idempotent: only seeds when the DB is fresh."""
    if db.query(models.Account).count() > 0:
        return

    # ---- Accounts & Contacts ----
    contoso = models.Account(name="Contoso Manufacturing", industry="Manufacturing", region="APAC", annual_revenue=120_000_000)
    fabrikam = models.Account(name="Fabrikam Retail", industry="Retail", region="APAC", annual_revenue=45_000_000)
    northwind = models.Account(name="Northwind Logistics", industry="Logistics", region="EMEA", annual_revenue=210_000_000)
    db.add_all([contoso, fabrikam, northwind])
    db.flush()

    db.add_all([
        models.Contact(account_id=contoso.id, full_name="Alice Lin", email="alice@contoso.com", title="CIO"),
        models.Contact(account_id=fabrikam.id, full_name="Bryan Hsu", email="bryan@fabrikam.com", title="Operations Director"),
        models.Contact(account_id=northwind.id, full_name="Carol Tan", email="carol@northwind.com", title="VP Supply Chain"),
    ])

    # ---- Leads ----
    db.add_all([
        models.Lead(company="Adventure Works", contact_name="David Wu", email="david@adventureworks.com", source="LinkedIn", estimated_value=85_000, status=models.LeadStatus.new, notes="Interested in Business Central upgrade."),
        models.Lead(company="Tailspin Toys", contact_name="Emily Chen", email="emily@tailspin.com", source="Webinar", estimated_value=35_000, status=models.LeadStatus.contacted, notes="Asked for Power Automate demo."),
        models.Lead(company="Wide World Importers", contact_name="Frank Lee", email="frank@wwi.com", source="Referral", estimated_value=140_000, status=models.LeadStatus.qualified),
    ])

    # ---- Opportunities ----
    opp_contoso = models.Opportunity(
        name="Contoso - D365 BC Implementation",
        account_id=contoso.id,
        stage=models.OpportunityStage.proposal,
        amount=180_000,
        probability=0.6,
        expected_close_date=_utc(days=20),
        owner="sales@partner.com",
        description="Greenfield Business Central deployment with Power Automate add-ons.",
    )
    opp_fabrikam = models.Opportunity(
        name="Fabrikam - Dynamics CRM Sales Hub",
        account_id=fabrikam.id,
        stage=models.OpportunityStage.negotiation,
        amount=95_000,
        probability=0.75,
        expected_close_date=_utc(days=12),
        owner="sales@partner.com",
        description="Replace legacy CRM with Dynamics 365 Sales.",
    )
    opp_northwind = models.Opportunity(
        name="Northwind - Hybrid Cloud + RPA",
        account_id=northwind.id,
        stage=models.OpportunityStage.qualification,
        amount=240_000,
        probability=0.35,
        expected_close_date=_utc(days=45),
        owner="sales@partner.com",
        description="Logistics RPA and Azure hybrid landing zone.",
    )
    db.add_all([opp_contoso, opp_fabrikam, opp_northwind])
    db.flush()

    # ---- Quotes ----
    db.add_all([
        models.Quote(
            opportunity_id=opp_contoso.id,
            quote_number="Q-CONT01",
            status=models.QuoteStatus.sent,
            total_amount=180_000,
            currency="USD",
            line_items=[
                {"description": "Business Central licences x 25", "quantity": 25, "unit_price": 1200},
                {"description": "Implementation services", "quantity": 1, "unit_price": 150_000},
            ],
            valid_until=_utc(days=30),
        ),
        models.Quote(
            opportunity_id=opp_fabrikam.id,
            quote_number="Q-FAB01",
            status=models.QuoteStatus.draft,
            total_amount=95_000,
            currency="USD",
            line_items=[
                {"description": "Sales Hub licences x 30", "quantity": 30, "unit_price": 1500},
                {"description": "Migration services", "quantity": 1, "unit_price": 50_000},
            ],
            valid_until=_utc(days=30),
        ),
    ])

    # ---- Onboarding ----
    onboarding_fabrikam = models.CustomerOnboardingProject(
        project_name="Fabrikam - CRM Onboarding",
        account_id=fabrikam.id,
        status=models.OnboardingStatus.in_progress,
        target_go_live=_utc(days=42),
        health_score=72,
        owner="delivery@partner.com",
        description="Sales Hub rollout with bulk data migration and dashboards.",
    )
    db.add(onboarding_fabrikam)
    db.flush()
    base_seq = [
        ("Kickoff Meeting", -3, models.TaskStatus.done),
        ("Requirement Workshop", 4, models.TaskStatus.in_progress),
        ("Solution Design Review", 14, models.TaskStatus.todo),
        ("Configuration & Customisation", 25, models.TaskStatus.todo),
        ("User Acceptance Testing", 35, models.TaskStatus.todo),
        ("Go Live & Hypercare", 42, models.TaskStatus.todo),
    ]
    for idx, (title, days, status_) in enumerate(base_seq, start=1):
        db.add(models.OnboardingTask(
            project_id=onboarding_fabrikam.id,
            title=title,
            sequence=idx,
            due_date=_utc(days=days),
            status=status_,
            completed_at=_utc(days=days) if status_ == models.TaskStatus.done else None,
        ))

    db.add(models.RiskAlert(
        project_id=onboarding_fabrikam.id,
        level=models.RiskLevel.medium,
        title="Data migration team has not confirmed cutover window",
        description="Cutover playbook still pending sign-off.",
    ))

    # ---- BPM ----
    bpm = models.BPMRequest(
        request_number="REQ-DEMO001",
        request_type=models.BPMRequestType.VendorPayment,
        title="Vendor invoice - Azure consulting",
        requester="finance.user@partner.com",
        status=models.ApprovalStatus.Submitted,
        amount=24_500,
        currency="USD",
        payload={"vendor": "Cloud Pros Ltd", "po_number": "PO-1042"},
    )
    db.add(bpm)
    db.flush()
    db.add_all([
        models.ApprovalStep(request_id=bpm.id, sequence=1, approver="manager@partner.com", role="Manager", decision=models.ApprovalStatus.Submitted),
        models.ApprovalStep(request_id=bpm.id, sequence=2, approver="finance@partner.com", role="Finance", decision=models.ApprovalStatus.Submitted),
    ])

    # ---- Workflow definitions ----
    db.add_all([
        models.WorkflowDefinition(
            name="Won opportunity -> Onboarding project",
            description="When an opportunity is marked Won, automatically create an onboarding project.",
            trigger={"type": "event", "event": "opportunity.won"},
            conditions=[{"path": "amount", "op": ">=", "value": 50_000}],
            actions=[
                {"type": "create_onboarding_project", "params": {"target_days": 60}},
                {"type": "send_notification", "params": {"channel": "email", "to": "delivery@partner.com", "subject": "New onboarding project created"}},
            ],
            enabled=True,
        ),
        models.WorkflowDefinition(
            name="Approved BPM request -> Business Central",
            description="When a BPM request is approved, sync the document to Business Central.",
            trigger={"type": "event", "event": "bpm.request.synced_to_bc"},
            conditions=[],
            actions=[
                {"type": "send_notification", "params": {"channel": "email", "to": "finance@partner.com", "subject": "BC sync complete"}},
            ],
            enabled=True,
        ),
        models.WorkflowDefinition(
            name="Onboarding overdue -> Risk alert + Ticket",
            description="When an onboarding task becomes overdue, raise a risk alert and create a ticket.",
            trigger={"type": "event", "event": "onboarding.task.overdue"},
            conditions=[],
            actions=[
                {"type": "create_risk_alert", "params": {"level": "high", "title": "Onboarding tasks overdue"}},
                {"type": "create_ticket", "params": {"severity": "sev2", "title": "Investigate onboarding delay", "sla_hours": 8}},
            ],
            enabled=True,
        ),
    ])

    # ---- Tickets ----
    db.add_all([
        models.Ticket(
            ticket_number="INC-DEMO01",
            title="Power Automate flow failing intermittently",
            description="Customer reports retry storms.",
            severity=models.IncidentSeverity.sev2,
            status=models.TicketStatus.in_progress,
            sla_status=models.SLAStatus.at_risk,
            sla_due_at=_utc(hours=2),
            requested_by="customer@fabrikam.com",
            assignee="ops.engineer@partner.com",
            related_account_id=fabrikam.id,
        ),
        models.Ticket(
            ticket_number="INC-DEMO02",
            title="Business Central API throttled",
            description="HTTP 429 on bulk sync.",
            severity=models.IncidentSeverity.sev3,
            status=models.TicketStatus.open,
            sla_status=models.SLAStatus.within_sla,
            sla_due_at=_utc(hours=18),
            requested_by="customer@northwind.com",
            assignee="ops.engineer@partner.com",
            related_account_id=northwind.id,
        ),
    ])

    db.commit()
