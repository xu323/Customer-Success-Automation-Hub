"""SQLAlchemy ORM models.

The schema is intentionally a slightly-simplified mirror of the entities you
would find in Microsoft Dynamics 365 Sales / Dataverse + Business Central +
Power Automate. The goal is to be familiar to a Microsoft Business
Application practitioner while staying portable enough to run on plain
SQLite for a quick demo.
"""
from __future__ import annotations

import enum
from datetime import UTC, datetime

from sqlalchemy import (
    JSON,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy import (
    Enum as SAEnum,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


def _utcnow() -> datetime:
    return datetime.now(UTC)


# ---------------------------------------------------------------------------
# Enums
# ---------------------------------------------------------------------------


class LeadStatus(str, enum.Enum):
    new = "new"
    contacted = "contacted"
    qualified = "qualified"
    disqualified = "disqualified"


class OpportunityStage(str, enum.Enum):
    prospecting = "prospecting"
    qualification = "qualification"
    proposal = "proposal"
    negotiation = "negotiation"
    won = "won"
    lost = "lost"


class QuoteStatus(str, enum.Enum):
    draft = "draft"
    sent = "sent"
    accepted = "accepted"
    rejected = "rejected"


class OnboardingStatus(str, enum.Enum):
    planning = "planning"
    in_progress = "in_progress"
    on_hold = "on_hold"
    completed = "completed"


class TaskStatus(str, enum.Enum):
    todo = "todo"
    in_progress = "in_progress"
    done = "done"
    blocked = "blocked"


class RiskLevel(str, enum.Enum):
    low = "low"
    medium = "medium"
    high = "high"


class BPMRequestType(str, enum.Enum):
    VendorPayment = "VendorPayment"
    EmployeePayment = "EmployeePayment"
    TravelRequest = "TravelRequest"


class ApprovalStatus(str, enum.Enum):
    Draft = "Draft"
    Submitted = "Submitted"
    Approved = "Approved"
    Rejected = "Rejected"
    Completed = "Completed"


class WorkflowRunStatus(str, enum.Enum):
    pending = "pending"
    running = "running"
    succeeded = "succeeded"
    failed = "failed"


class TicketStatus(str, enum.Enum):
    open = "open"
    in_progress = "in_progress"
    resolved = "resolved"
    closed = "closed"


class IncidentSeverity(str, enum.Enum):
    sev1 = "sev1"
    sev2 = "sev2"
    sev3 = "sev3"
    sev4 = "sev4"


class SLAStatus(str, enum.Enum):
    within_sla = "within_sla"
    at_risk = "at_risk"
    breached = "breached"


# ---------------------------------------------------------------------------
# CRM
# ---------------------------------------------------------------------------


class Account(Base):
    __tablename__ = "accounts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False, index=True)
    industry: Mapped[str | None] = mapped_column(String(100))
    annual_revenue: Mapped[float | None] = mapped_column(Float)
    region: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    contacts: Mapped[list[Contact]] = relationship(back_populates="account", cascade="all, delete-orphan")
    opportunities: Mapped[list[Opportunity]] = relationship(back_populates="account")


class Contact(Base):
    __tablename__ = "contacts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"))
    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(50))
    title: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    account: Mapped[Account | None] = relationship(back_populates="contacts")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    company: Mapped[str] = mapped_column(String(200), nullable=False)
    contact_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str | None] = mapped_column(String(200))
    phone: Mapped[str | None] = mapped_column(String(50))
    source: Mapped[str | None] = mapped_column(String(100))
    estimated_value: Mapped[float | None] = mapped_column(Float)
    status: Mapped[LeadStatus] = mapped_column(SAEnum(LeadStatus), default=LeadStatus.new, index=True)
    notes: Mapped[str | None] = mapped_column(Text)
    qualified_opportunity_id: Mapped[int | None] = mapped_column(ForeignKey("opportunities.id"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


class Opportunity(Base):
    __tablename__ = "opportunities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"))
    stage: Mapped[OpportunityStage] = mapped_column(SAEnum(OpportunityStage), default=OpportunityStage.prospecting, index=True)
    amount: Mapped[float] = mapped_column(Float, default=0.0)
    probability: Mapped[float] = mapped_column(Float, default=0.1)
    expected_close_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    owner: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    account: Mapped[Account | None] = relationship(back_populates="opportunities")
    quotes: Mapped[list[Quote]] = relationship(back_populates="opportunity", cascade="all, delete-orphan")


class Quote(Base):
    __tablename__ = "quotes"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    opportunity_id: Mapped[int] = mapped_column(ForeignKey("opportunities.id"), nullable=False)
    quote_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    status: Mapped[QuoteStatus] = mapped_column(SAEnum(QuoteStatus), default=QuoteStatus.draft, index=True)
    total_amount: Mapped[float] = mapped_column(Float, default=0.0)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    line_items: Mapped[list | None] = mapped_column(JSON)
    valid_until: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    opportunity: Mapped[Opportunity] = relationship(back_populates="quotes")


# ---------------------------------------------------------------------------
# Customer Success
# ---------------------------------------------------------------------------


class CustomerOnboardingProject(Base):
    __tablename__ = "onboarding_projects"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"))
    project_name: Mapped[str] = mapped_column(String(200), nullable=False)
    status: Mapped[OnboardingStatus] = mapped_column(SAEnum(OnboardingStatus), default=OnboardingStatus.planning, index=True)
    target_go_live: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    health_score: Mapped[float] = mapped_column(Float, default=80.0)
    owner: Mapped[str | None] = mapped_column(String(120))
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    account: Mapped[Account | None] = relationship()
    tasks: Mapped[list[OnboardingTask]] = relationship(back_populates="project", cascade="all, delete-orphan")
    risks: Mapped[list[RiskAlert]] = relationship(back_populates="project", cascade="all, delete-orphan")


class OnboardingTask(Base):
    __tablename__ = "onboarding_tasks"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int] = mapped_column(ForeignKey("onboarding_projects.id"), nullable=False)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    status: Mapped[TaskStatus] = mapped_column(SAEnum(TaskStatus), default=TaskStatus.todo, index=True)
    due_date: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    assignee: Mapped[str | None] = mapped_column(String(120))
    sequence: Mapped[int] = mapped_column(Integer, default=0)

    project: Mapped[CustomerOnboardingProject] = relationship(back_populates="tasks")


class CustomerHealthScore(Base):
    __tablename__ = "customer_health_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    account_id: Mapped[int] = mapped_column(ForeignKey("accounts.id"), nullable=False)
    score: Mapped[float] = mapped_column(Float, default=80.0)
    captured_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    notes: Mapped[str | None] = mapped_column(Text)


class RiskAlert(Base):
    __tablename__ = "risk_alerts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    project_id: Mapped[int | None] = mapped_column(ForeignKey("onboarding_projects.id"))
    level: Mapped[RiskLevel] = mapped_column(SAEnum(RiskLevel), default=RiskLevel.medium, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    resolved: Mapped[bool] = mapped_column(default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    project: Mapped[CustomerOnboardingProject | None] = relationship(back_populates="risks")


# ---------------------------------------------------------------------------
# BPM
# ---------------------------------------------------------------------------


class BPMRequest(Base):
    __tablename__ = "bpm_requests"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    request_type: Mapped[BPMRequestType] = mapped_column(SAEnum(BPMRequestType), index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    requester: Mapped[str] = mapped_column(String(120), nullable=False)
    status: Mapped[ApprovalStatus] = mapped_column(SAEnum(ApprovalStatus), default=ApprovalStatus.Draft, index=True)
    amount: Mapped[float | None] = mapped_column(Float)
    currency: Mapped[str] = mapped_column(String(10), default="USD")
    payload: Mapped[dict | None] = mapped_column(JSON)
    bc_sync_status: Mapped[str | None] = mapped_column(String(40))
    bc_sync_reference: Mapped[str | None] = mapped_column(String(100))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    steps: Mapped[list[ApprovalStep]] = relationship(back_populates="request", cascade="all, delete-orphan", order_by="ApprovalStep.sequence")


class ApprovalStep(Base):
    __tablename__ = "approval_steps"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    request_id: Mapped[int] = mapped_column(ForeignKey("bpm_requests.id"), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    approver: Mapped[str] = mapped_column(String(120), nullable=False)
    role: Mapped[str | None] = mapped_column(String(80))
    decision: Mapped[ApprovalStatus] = mapped_column(SAEnum(ApprovalStatus), default=ApprovalStatus.Submitted)
    decided_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    comment: Mapped[str | None] = mapped_column(Text)

    request: Mapped[BPMRequest] = relationship(back_populates="steps")


# ---------------------------------------------------------------------------
# Automation
# ---------------------------------------------------------------------------


class WorkflowDefinition(Base):
    __tablename__ = "workflow_definitions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    name: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    description: Mapped[str | None] = mapped_column(Text)
    trigger: Mapped[dict] = mapped_column(JSON)  # {type: "event", event: "quote.won"}
    conditions: Mapped[list | None] = mapped_column(JSON)
    actions: Mapped[list] = mapped_column(JSON)  # [{type: "create_onboarding_project", ...}]
    enabled: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)

    runs: Mapped[list[WorkflowRun]] = relationship(back_populates="workflow", cascade="all, delete-orphan")


class WorkflowRun(Base):
    __tablename__ = "workflow_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    workflow_id: Mapped[int] = mapped_column(ForeignKey("workflow_definitions.id"), nullable=False)
    status: Mapped[WorkflowRunStatus] = mapped_column(SAEnum(WorkflowRunStatus), default=WorkflowRunStatus.pending)
    triggered_by: Mapped[str] = mapped_column(String(120), default="manual")
    input_payload: Mapped[dict | None] = mapped_column(JSON)
    result: Mapped[dict | None] = mapped_column(JSON)
    error_message: Mapped[str | None] = mapped_column(Text)
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    finished_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    workflow: Mapped[WorkflowDefinition] = relationship(back_populates="runs")
    action_logs: Mapped[list[WorkflowActionLog]] = relationship(back_populates="run", cascade="all, delete-orphan", order_by="WorkflowActionLog.sequence")


class WorkflowActionLog(Base):
    __tablename__ = "workflow_action_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    run_id: Mapped[int] = mapped_column(ForeignKey("workflow_runs.id"), nullable=False)
    sequence: Mapped[int] = mapped_column(Integer, default=0)
    action_type: Mapped[str] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(40), default="ok")
    message: Mapped[str | None] = mapped_column(Text)
    output: Mapped[dict | None] = mapped_column(JSON)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)

    run: Mapped[WorkflowRun] = relationship(back_populates="action_logs")


# ---------------------------------------------------------------------------
# IT Operation
# ---------------------------------------------------------------------------


class Ticket(Base):
    __tablename__ = "tickets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    ticket_number: Mapped[str] = mapped_column(String(50), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    severity: Mapped[IncidentSeverity] = mapped_column(SAEnum(IncidentSeverity), default=IncidentSeverity.sev3, index=True)
    status: Mapped[TicketStatus] = mapped_column(SAEnum(TicketStatus), default=TicketStatus.open, index=True)
    sla_status: Mapped[SLAStatus] = mapped_column(SAEnum(SLAStatus), default=SLAStatus.within_sla, index=True)
    requested_by: Mapped[str | None] = mapped_column(String(120))
    assignee: Mapped[str | None] = mapped_column(String(120))
    related_account_id: Mapped[int | None] = mapped_column(ForeignKey("accounts.id"))
    sla_due_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
    updated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, onupdate=_utcnow)


# ---------------------------------------------------------------------------
# Audit
# ---------------------------------------------------------------------------


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow, index=True)
    actor: Mapped[str] = mapped_column(String(120), default="system")
    action_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_type: Mapped[str] = mapped_column(String(80), index=True)
    entity_id: Mapped[str | None] = mapped_column(String(80))
    status: Mapped[str] = mapped_column(String(40), default="ok")
    message: Mapped[str | None] = mapped_column(Text)
    error_message: Mapped[str | None] = mapped_column(Text)
    payload: Mapped[dict | None] = mapped_column(JSON)


# ---------------------------------------------------------------------------
# AI
# ---------------------------------------------------------------------------


class AIInsight(Base):
    __tablename__ = "ai_insights"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    insight_type: Mapped[str] = mapped_column(String(80), index=True)
    target_entity_type: Mapped[str] = mapped_column(String(80))
    target_entity_id: Mapped[str | None] = mapped_column(String(80))
    summary: Mapped[str] = mapped_column(Text)
    details: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)


class AIRecommendation(Base):
    __tablename__ = "ai_recommendations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    title: Mapped[str] = mapped_column(String(200), nullable=False)
    body: Mapped[str] = mapped_column(Text)
    target_entity_type: Mapped[str] = mapped_column(String(80))
    target_entity_id: Mapped[str | None] = mapped_column(String(80))
    confidence: Mapped[float] = mapped_column(Float, default=0.7)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_utcnow)
