import { useQuery } from "@tanstack/react-query";
import { Dashboard } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone } from "@/components/Badge";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatCurrency, formatDate, pct } from "@/lib/format";

function KPI({
  label,
  value,
  hint,
  tone = "info",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "info" | "warning" | "success" | "danger" | "neutral";
}) {
  const toneBg: Record<string, string> = {
    info: "from-sky-500/15 to-sky-500/5 border-sky-500/30",
    warning: "from-amber-500/15 to-amber-500/5 border-amber-500/30",
    success: "from-emerald-500/15 to-emerald-500/5 border-emerald-500/30",
    danger: "from-rose-500/15 to-rose-500/5 border-rose-500/30",
    neutral: "from-slate-500/15 to-slate-500/5 border-slate-500/30",
  };
  return (
    <div
      className={`rounded-xl border bg-gradient-to-br p-4 ${toneBg[tone]}`}
    >
      <div className="text-xs uppercase tracking-wide text-ms-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-ms-muted mt-1">{hint}</div>}
    </div>
  );
}

export function DashboardPage() {
  const q = useQuery({ queryKey: ["dashboard"], queryFn: Dashboard.summary });

  if (q.isLoading) return <LoadingState label="Loading executive dashboard…" />;
  if (q.isError) return <ErrorState error={q.error} />;
  const d = q.data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Executive Dashboard</h1>
        <p className="text-sm text-ms-muted">
          一頁掌握 CRM、Customer Success、BPM、Automation 與 IT Operation 的健康狀況。
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI label="CRM Pipeline (Weighted)" value={formatCurrency(d.crm_pipeline_value)} hint={`${d.open_opportunities} open opps`} tone="info" />
        <KPI label="Leads to qualify" value={String(d.leads_to_qualify)} hint={`${d.quotes_pending} quotes pending`} tone="neutral" />
        <KPI label="Active onboardings" value={String(d.active_onboarding_projects)} hint={`${d.onboarding_at_risk} at risk`} tone={d.onboarding_at_risk > 0 ? "warning" : "success"} />
        <KPI label="Pending approvals" value={String(d.pending_approvals)} tone="info" />
        <KPI label="Automation success" value={pct(d.automation_success_rate, 1)} hint="Workflow runs" tone={d.automation_success_rate >= 95 ? "success" : "warning"} />
        <KPI label="Open tickets" value={String(d.open_tickets)} hint={`${d.breached_tickets} SLA breached`} tone={d.breached_tickets > 0 ? "danger" : "info"} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Recent audit events" subtitle="最近 15 筆系統事件 (CRM / BPM / Automation / Tickets)" />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
                <tr>
                  <th className="text-left font-medium px-4 py-2">When</th>
                  <th className="text-left font-medium px-4 py-2">Action</th>
                  <th className="text-left font-medium px-4 py-2">Entity</th>
                  <th className="text-left font-medium px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {d.recent_audit_events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-ms-muted">
                      No events yet — try creating a Lead or BPM request.
                    </td>
                  </tr>
                )}
                {d.recent_audit_events.map((e) => (
                  <tr key={e.id} className="border-b border-ms-line/60 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-xs text-ms-muted">{formatDate(e.timestamp)}</td>
                    <td className="px-4 py-2">{e.action_type}</td>
                    <td className="px-4 py-2 text-ms-muted">{e.entity_type}{e.entity_id ? ` #${e.entity_id}` : ""}</td>
                    <td className="px-4 py-2"><Badge tone={statusTone(e.status)}>{e.status}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Risk panel" subtitle="客戶風險警示與系統訊號" />
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div>Open risk alerts</div>
              <Badge tone={d.risk_alerts > 0 ? "warning" : "success"}>{d.risk_alerts}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>SLA breached tickets</div>
              <Badge tone={d.breached_tickets > 0 ? "danger" : "success"}>{d.breached_tickets}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>Onboarding projects at risk</div>
              <Badge tone={d.onboarding_at_risk > 0 ? "warning" : "success"}>{d.onboarding_at_risk}</Badge>
            </div>
            <div className="text-xs text-ms-muted pt-2 border-t border-ms-line">
              Tip: 在 Automation Flows 頁手動觸發 "Won opportunity → Onboarding" workflow，
              可即時看到 Audit Logs 與 Onboarding 頁面同步更新。
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
