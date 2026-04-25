export type LeadStatus = "new" | "contacted" | "qualified" | "disqualified";
export type OpportunityStage =
  | "prospecting"
  | "qualification"
  | "proposal"
  | "negotiation"
  | "won"
  | "lost";
export type QuoteStatus = "draft" | "sent" | "accepted" | "rejected";
export type OnboardingStatus = "planning" | "in_progress" | "on_hold" | "completed";
export type TaskStatus = "todo" | "in_progress" | "done" | "blocked";
export type RiskLevel = "low" | "medium" | "high";
export type BPMRequestType = "VendorPayment" | "EmployeePayment" | "TravelRequest";
export type ApprovalStatus = "Draft" | "Submitted" | "Approved" | "Rejected" | "Completed";
export type WorkflowRunStatus = "pending" | "running" | "succeeded" | "failed";
export type TicketStatus = "open" | "in_progress" | "resolved" | "closed";
export type IncidentSeverity = "sev1" | "sev2" | "sev3" | "sev4";
export type SLAStatus = "within_sla" | "at_risk" | "breached";

export interface Lead {
  id: number;
  company: string;
  contact_name: string;
  email?: string | null;
  phone?: string | null;
  source?: string | null;
  estimated_value?: number | null;
  status: LeadStatus;
  notes?: string | null;
  qualified_opportunity_id?: number | null;
  created_at: string;
  updated_at: string;
}

export interface Opportunity {
  id: number;
  name: string;
  account_id?: number | null;
  stage: OpportunityStage;
  amount: number;
  probability: number;
  expected_close_date?: string | null;
  owner?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
}

export interface Quote {
  id: number;
  opportunity_id: number;
  quote_number: string;
  status: QuoteStatus;
  total_amount: number;
  currency: string;
  line_items?: Array<{ description: string; quantity: number; unit_price: number }>;
  valid_until?: string | null;
  created_at: string;
}

export interface OnboardingTask {
  id: number;
  project_id: number;
  title: string;
  description?: string | null;
  status: TaskStatus;
  due_date?: string | null;
  completed_at?: string | null;
  assignee?: string | null;
  sequence: number;
}

export interface OnboardingProject {
  id: number;
  account_id?: number | null;
  project_name: string;
  status: OnboardingStatus;
  target_go_live?: string | null;
  health_score: number;
  owner?: string | null;
  description?: string | null;
  created_at: string;
  updated_at: string;
  tasks: OnboardingTask[];
}

export interface RiskAlert {
  id: number;
  project_id?: number | null;
  level: RiskLevel;
  title: string;
  description?: string | null;
  resolved: boolean;
  created_at: string;
}

export interface ApprovalStep {
  id: number;
  sequence: number;
  approver: string;
  role?: string | null;
  decision: ApprovalStatus;
  decided_at?: string | null;
  comment?: string | null;
}

export interface BPMRequest {
  id: number;
  request_number: string;
  request_type: BPMRequestType;
  title: string;
  requester: string;
  status: ApprovalStatus;
  amount?: number | null;
  currency: string;
  payload?: Record<string, any> | null;
  bc_sync_status?: string | null;
  bc_sync_reference?: string | null;
  created_at: string;
  updated_at: string;
  steps: ApprovalStep[];
}

export interface WorkflowDefinition {
  id: number;
  name: string;
  description?: string | null;
  trigger: Record<string, any>;
  conditions?: Array<Record<string, any>> | null;
  actions: Array<Record<string, any>>;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface WorkflowActionLog {
  id: number;
  sequence: number;
  action_type: string;
  status: string;
  message?: string | null;
  output?: Record<string, any> | null;
  timestamp: string;
}

export interface WorkflowRun {
  id: number;
  workflow_id: number;
  status: WorkflowRunStatus;
  triggered_by: string;
  input_payload?: Record<string, any> | null;
  result?: Record<string, any> | null;
  error_message?: string | null;
  started_at: string;
  finished_at?: string | null;
  action_logs: WorkflowActionLog[];
}

export interface Ticket {
  id: number;
  ticket_number: string;
  title: string;
  description?: string | null;
  severity: IncidentSeverity;
  status: TicketStatus;
  sla_status: SLAStatus;
  requested_by?: string | null;
  assignee?: string | null;
  related_account_id?: number | null;
  sla_due_at?: string | null;
  resolved_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  timestamp: string;
  actor: string;
  action_type: string;
  entity_type: string;
  entity_id?: string | null;
  status: string;
  message?: string | null;
  error_message?: string | null;
  payload?: Record<string, any> | null;
}

export interface DashboardSummary {
  crm_pipeline_value: number;
  open_opportunities: number;
  leads_to_qualify: number;
  quotes_pending: number;
  active_onboarding_projects: number;
  onboarding_at_risk: number;
  pending_approvals: number;
  automation_success_rate: number;
  open_tickets: number;
  breached_tickets: number;
  risk_alerts: number;
  recent_audit_events: AuditLog[];
}

export interface AIResponse {
  title: string;
  summary: string;
  bullet_points: string[];
  confidence: number;
  suggested_tasks: string[];
}
