import { api } from "./client";
import type {
  AIResponse,
  AuditLog,
  BPMRequest,
  DashboardSummary,
  Lead,
  OnboardingProject,
  Opportunity,
  Quote,
  RiskAlert,
  Ticket,
  WorkflowDefinition,
  WorkflowRun,
} from "@/types";

export const Dashboard = {
  summary: () => api.get<DashboardSummary>("/api/dashboard/summary"),
};

export const CRM = {
  listLeads: () => api.get<Lead[]>("/api/crm/leads"),
  createLead: (body: Partial<Lead>) => api.post<Lead>("/api/crm/leads", body),
  qualifyLead: (id: number) => api.post<Opportunity>(`/api/crm/leads/${id}/qualify`),
  listOpportunities: () => api.get<Opportunity[]>("/api/crm/opportunities"),
  createOpportunity: (body: {
    name: string;
    account_id?: number | null;
    amount?: number;
    probability?: number;
    expected_close_date?: string | null;
    owner?: string | null;
    description?: string | null;
    stage?: string;
  }) => api.post<Opportunity>("/api/crm/opportunities", body),
  markWon: (id: number) => api.post<Opportunity>(`/api/crm/opportunities/${id}/mark-won`),
  listQuotes: () => api.get<Quote[]>("/api/crm/quotes"),
  createQuote: (body: { opportunity_id: number; total_amount: number; currency?: string; line_items?: any[] }) =>
    api.post<Quote>("/api/crm/quotes", body),
};

export const Onboarding = {
  listProjects: () => api.get<OnboardingProject[]>("/api/onboarding/projects"),
  createProject: (body: any) => api.post<OnboardingProject>("/api/onboarding/projects", body),
  completeTask: (projectId: number, taskId: number) =>
    api.post<OnboardingProject>(`/api/onboarding/projects/${projectId}/complete-task?task_id=${taskId}`),
  listRisks: () => api.get<RiskAlert[]>("/api/onboarding/risks"),
};

export const BPM = {
  listRequests: () => api.get<BPMRequest[]>("/api/bpm/requests"),
  createRequest: (body: any) => api.post<BPMRequest>("/api/bpm/requests", body),
  submit: (id: number) => api.post<BPMRequest>(`/api/bpm/requests/${id}/submit`),
  approve: (id: number, approver: string, comment?: string) =>
    api.post<BPMRequest>(`/api/bpm/requests/${id}/approve`, { approver, comment }),
  reject: (id: number, approver: string, comment?: string) =>
    api.post<BPMRequest>(`/api/bpm/requests/${id}/reject`, { approver, comment }),
  syncToBC: (id: number) => api.post<BPMRequest>(`/api/bpm/requests/${id}/sync-to-bc`),
};

export const Automation = {
  listWorkflows: () => api.get<WorkflowDefinition[]>("/api/automation/workflows"),
  createWorkflow: (body: Partial<WorkflowDefinition>) =>
    api.post<WorkflowDefinition>("/api/automation/workflows", body),
  runWorkflow: (id: number, payload: Record<string, any> = {}) =>
    api.post<WorkflowRun>(`/api/automation/workflows/${id}/run`, {
      triggered_by: "manual",
      input_payload: payload,
    }),
  listRuns: () => api.get<WorkflowRun[]>("/api/automation/runs"),
};

export const Tickets = {
  list: () => api.get<Ticket[]>("/api/tickets"),
  create: (body: any) => api.post<Ticket>("/api/tickets", body),
  resolve: (id: number, note?: string) => api.post<Ticket>(`/api/tickets/${id}/resolve`, { resolution_note: note }),
};

export const AI = {
  customerSummary: (account_id: number) => api.post<AIResponse>("/api/ai/customer-summary", { account_id }),
  nextBestAction: (account_id: number) => api.post<AIResponse>("/api/ai/next-best-action", { account_id }),
  meetingNotesToTasks: (notes: string, project_id?: number) =>
    api.post<AIResponse>("/api/ai/meeting-notes-to-tasks", { notes, project_id }),
  riskExplanation: (project_id: number) => api.post<AIResponse>("/api/ai/risk-explanation", { project_id }),
};

export const Audit = {
  list: (params?: { entity_type?: string; action_type?: string; status?: string; limit?: number }) => {
    const qs = new URLSearchParams();
    if (params?.entity_type) qs.set("entity_type", params.entity_type);
    if (params?.action_type) qs.set("action_type", params.action_type);
    if (params?.status) qs.set("status", params.status);
    if (params?.limit) qs.set("limit", String(params.limit));
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    return api.get<AuditLog[]>(`/api/audit-logs${suffix}`);
  },
};
