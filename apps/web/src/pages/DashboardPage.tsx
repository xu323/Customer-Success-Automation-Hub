import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Dashboard } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
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
    <div className={`rounded-xl border bg-gradient-to-br p-4 ${toneBg[tone]}`}>
      <div className="text-xs uppercase tracking-wide text-ms-muted">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-ms-muted mt-1">{hint}</div>}
    </div>
  );
}

export function DashboardPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const q = useQuery({ queryKey: ["dashboard"], queryFn: Dashboard.summary });

  if (q.isLoading) return <LoadingState label={t("common.loadingDashboard")} />;
  if (q.isError) return <ErrorState error={q.error} />;
  const d = q.data!;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("dashboard.title")}</h1>
        <p className="text-sm text-ms-muted">{t("dashboard.subtitle")}</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <KPI
          label={t("dashboard.kpi.pipeline")}
          value={formatCurrency(d.crm_pipeline_value)}
          hint={t("dashboard.kpi.pipelineHint", { count: d.open_opportunities })}
          tone="info"
        />
        <KPI
          label={t("dashboard.kpi.leads")}
          value={String(d.leads_to_qualify)}
          hint={t("dashboard.kpi.leadsHint", { count: d.quotes_pending })}
          tone="neutral"
        />
        <KPI
          label={t("dashboard.kpi.onboarding")}
          value={String(d.active_onboarding_projects)}
          hint={t("dashboard.kpi.onboardingHint", { count: d.onboarding_at_risk })}
          tone={d.onboarding_at_risk > 0 ? "warning" : "success"}
        />
        <KPI label={t("dashboard.kpi.approvals")} value={String(d.pending_approvals)} tone="info" />
        <KPI
          label={t("dashboard.kpi.automation")}
          value={pct(d.automation_success_rate, 1)}
          hint={t("dashboard.kpi.automationHint")}
          tone={d.automation_success_rate >= 95 ? "success" : "warning"}
        />
        <KPI
          label={t("dashboard.kpi.tickets")}
          value={String(d.open_tickets)}
          hint={t("dashboard.kpi.ticketsHint", { count: d.breached_tickets })}
          tone={d.breached_tickets > 0 ? "danger" : "info"}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title={t("dashboard.recent.title")} subtitle={t("dashboard.recent.subtitle")} />
          <CardBody className="p-0">
            <table className="w-full text-sm">
              <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
                <tr>
                  <th className="text-left font-medium px-4 py-2">{t("dashboard.recent.when")}</th>
                  <th className="text-left font-medium px-4 py-2">{t("dashboard.recent.action")}</th>
                  <th className="text-left font-medium px-4 py-2">{t("dashboard.recent.entity")}</th>
                  <th className="text-left font-medium px-4 py-2">{t("dashboard.recent.status")}</th>
                </tr>
              </thead>
              <tbody>
                {d.recent_audit_events.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-4 py-6 text-center text-ms-muted">
                      {t("dashboard.recent.empty")}
                    </td>
                  </tr>
                )}
                {d.recent_audit_events.map((e) => (
                  <tr key={e.id} className="border-b border-ms-line/60 hover:bg-white/[0.02]">
                    <td className="px-4 py-2 text-xs text-ms-muted">{formatDate(e.timestamp)}</td>
                    <td className="px-4 py-2">{e.action_type}</td>
                    <td className="px-4 py-2 text-ms-muted">
                      {e.entity_type}
                      {e.entity_id ? ` #${e.entity_id}` : ""}
                    </td>
                    <td className="px-4 py-2">
                      <Badge tone={statusTone(e.status)}>{labelOf(e.status)}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("dashboard.risk.title")} subtitle={t("dashboard.risk.subtitle")} />
          <CardBody className="space-y-3">
            <div className="flex items-center justify-between">
              <div>{t("dashboard.risk.openAlerts")}</div>
              <Badge tone={d.risk_alerts > 0 ? "warning" : "success"}>{d.risk_alerts}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>{t("dashboard.risk.slaBreached")}</div>
              <Badge tone={d.breached_tickets > 0 ? "danger" : "success"}>{d.breached_tickets}</Badge>
            </div>
            <div className="flex items-center justify-between">
              <div>{t("dashboard.risk.atRisk")}</div>
              <Badge tone={d.onboarding_at_risk > 0 ? "warning" : "success"}>
                {d.onboarding_at_risk}
              </Badge>
            </div>
            <div className="text-xs text-ms-muted pt-2 border-t border-ms-line">
              {t("dashboard.risk.tip")}
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
