"""Pydantic schemas (request / response DTOs)."""
from __future__ import annotations

from datetime import datetime
from typing import Any

from pydantic import BaseModel, ConfigDict, Field

from app.models import (
    ApprovalStatus,
    BPMRequestType,
    IncidentSeverity,
    LeadStatus,
    OnboardingStatus,
    OpportunityStage,
    QuoteStatus,
    RiskLevel,
    SLAStatus,
    TaskStatus,
    TicketStatus,
    WorkflowRunStatus,
)


class ORMBase(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)


# ---- CRM ----

class LeadCreate(BaseModel):
    company: str
    contact_name: str
    email: str | None = None
    phone: str | None = None
    source: str | None = None
    estimated_value: float | None = None
    notes: str | None = None


class LeadOut(ORMBase):
    id: int
    company: str
    contact_name: str
    email: str | None
    phone: str | None
    source: str | None
    estimated_value: float | None
    status: LeadStatus
    notes: str | None
    qualified_opportunity_id: int | None
    created_at: datetime
    updated_at: datetime


class OpportunityCreate(BaseModel):
    name: str
    account_id: int | None = None
    amount: float = 0.0
    probability: float = 0.1
    expected_close_date: datetime | None = None
    owner: str | None = None
    description: str | None = None
    stage: OpportunityStage = OpportunityStage.prospecting


class OpportunityOut(ORMBase):
    id: int
    name: str
    account_id: int | None
    stage: OpportunityStage
    amount: float
    probability: float
    expected_close_date: datetime | None
    owner: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime


class QuoteLineItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0.0


class QuoteCreate(BaseModel):
    opportunity_id: int
    total_amount: float
    currency: str = "USD"
    line_items: list[QuoteLineItem] = Field(default_factory=list)
    valid_until: datetime | None = None


class QuoteOut(ORMBase):
    id: int
    opportunity_id: int
    quote_number: str
    status: QuoteStatus
    total_amount: float
    currency: str
    line_items: list[Any] | None
    valid_until: datetime | None
    created_at: datetime


# ---- Onboarding ----

class OnboardingTaskCreate(BaseModel):
    title: str
    description: str | None = None
    due_date: datetime | None = None
    assignee: str | None = None
    sequence: int = 0


class OnboardingTaskOut(ORMBase):
    id: int
    project_id: int
    title: str
    description: str | None
    status: TaskStatus
    due_date: datetime | None
    completed_at: datetime | None
    assignee: str | None
    sequence: int


class OnboardingProjectCreate(BaseModel):
    project_name: str
    account_id: int | None = None
    target_go_live: datetime | None = None
    owner: str | None = None
    description: str | None = None
    tasks: list[OnboardingTaskCreate] = Field(default_factory=list)


class OnboardingProjectOut(ORMBase):
    id: int
    account_id: int | None
    project_name: str
    status: OnboardingStatus
    target_go_live: datetime | None
    health_score: float
    owner: str | None
    description: str | None
    created_at: datetime
    updated_at: datetime
    tasks: list[OnboardingTaskOut] = []


class CompleteTaskBody(BaseModel):
    task_id: int


class RiskAlertOut(ORMBase):
    id: int
    project_id: int | None
    level: RiskLevel
    title: str
    description: str | None
    resolved: bool
    created_at: datetime


# ---- BPM ----

class BPMRequestCreate(BaseModel):
    request_type: BPMRequestType
    title: str
    requester: str
    amount: float | None = None
    currency: str = "USD"
    payload: dict | None = None
    approvers: list[str] = Field(default_factory=list)


class ApprovalStepOut(ORMBase):
    id: int
    sequence: int
    approver: str
    role: str | None
    decision: ApprovalStatus
    decided_at: datetime | None
    comment: str | None


class BPMRequestOut(ORMBase):
    id: int
    request_number: str
    request_type: BPMRequestType
    title: str
    requester: str
    status: ApprovalStatus
    amount: float | None
    currency: str
    payload: dict | None
    bc_sync_status: str | None
    bc_sync_reference: str | None
    created_at: datetime
    updated_at: datetime
    steps: list[ApprovalStepOut] = []


class ApprovalDecisionBody(BaseModel):
    approver: str
    comment: str | None = None


# ---- Automation ----

class WorkflowDefinitionCreate(BaseModel):
    name: str
    description: str | None = None
    trigger: dict
    conditions: list[dict] | None = None
    actions: list[dict]
    enabled: bool = True


class WorkflowDefinitionOut(ORMBase):
    id: int
    name: str
    description: str | None
    trigger: dict
    conditions: list[dict] | None
    actions: list[dict]
    enabled: bool
    created_at: datetime
    updated_at: datetime


class WorkflowRunBody(BaseModel):
    triggered_by: str = "manual"
    input_payload: dict = Field(default_factory=dict)


class WorkflowActionLogOut(ORMBase):
    id: int
    sequence: int
    action_type: str
    status: str
    message: str | None
    output: dict | None
    timestamp: datetime


class WorkflowRunOut(ORMBase):
    id: int
    workflow_id: int
    status: WorkflowRunStatus
    triggered_by: str
    input_payload: dict | None
    result: dict | None
    error_message: str | None
    started_at: datetime
    finished_at: datetime | None
    action_logs: list[WorkflowActionLogOut] = []


# ---- Tickets ----

class TicketCreate(BaseModel):
    title: str
    description: str | None = None
    severity: IncidentSeverity = IncidentSeverity.sev3
    requested_by: str | None = None
    assignee: str | None = None
    related_account_id: int | None = None
    sla_due_at: datetime | None = None


class TicketOut(ORMBase):
    id: int
    ticket_number: str
    title: str
    description: str | None
    severity: IncidentSeverity
    status: TicketStatus
    sla_status: SLAStatus
    requested_by: str | None
    assignee: str | None
    related_account_id: int | None
    sla_due_at: datetime | None
    resolved_at: datetime | None
    created_at: datetime
    updated_at: datetime


class TicketResolveBody(BaseModel):
    resolution_note: str | None = None


# ---- AI ----

class CustomerSummaryRequest(BaseModel):
    account_id: int


class NextBestActionRequest(BaseModel):
    account_id: int


class MeetingNotesRequest(BaseModel):
    notes: str
    project_id: int | None = None


class RiskExplanationRequest(BaseModel):
    project_id: int


class AIResponse(BaseModel):
    title: str
    summary: str
    bullet_points: list[str] = []
    confidence: float = 0.8
    suggested_tasks: list[str] = []


# ---- Audit ----

class AuditLogOut(ORMBase):
    id: int
    timestamp: datetime
    actor: str
    action_type: str
    entity_type: str
    entity_id: str | None
    status: str
    message: str | None
    error_message: str | None
    payload: dict | None


# ---- Dashboard ----

class DashboardSummary(BaseModel):
    crm_pipeline_value: float
    open_opportunities: int
    leads_to_qualify: int
    quotes_pending: int
    active_onboarding_projects: int
    onboarding_at_risk: int
    pending_approvals: int
    automation_success_rate: float
    open_tickets: int
    breached_tickets: int
    risk_alerts: int
    recent_audit_events: list[AuditLogOut] = []
