import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Audit, Tickets } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, EmptyState } from "@/components/StateMessages";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { TimeRangeSwitcher, type TimeRange, rangeDays } from "@/components/TimeRangeSwitcher";
import { TrendIndicator } from "@/components/TrendIndicator";
import { Avatar } from "@/components/Avatar";
import { SkeletonRow } from "@/components/Skeleton";
import { mockTrend, dailyBuckets } from "@/lib/timeseries";
import type { Ticket } from "@/types";

const SERVICE_KEYS = [
  "api",
  "database",
  "auth",
  "crmSync",
  "bpmEngine",
  "workflowEngine",
  "erpBridge",
  "notifications",
] as const;

// Deterministic synthetic uptime per service so the demo looks alive.
function syntheticUptime(svc: string): number {
  let h = 0;
  for (let i = 0; i < svc.length; i++) h = (h * 31 + svc.charCodeAt(i)) | 0;
  const bucket = Math.abs(h) % 100;
  if (bucket < 70) return 99.9 + (bucket % 10) / 100;
  if (bucket < 90) return 99 + (bucket % 9) / 10;
  return 96 + (bucket % 30) / 10;
}

function uptimeBand(value: number): "healthy" | "degraded" | "down" {
  if (value >= 99.5) return "healthy";
  if (value >= 98) return "degraded";
  return "down";
}

function severityToP(sev: string): string {
  if (sev === "sev1") return "p1";
  if (sev === "sev2") return "p2";
  if (sev === "sev3") return "p3";
  return "p4";
}

function severityRowAccent(sev: string): string {
  if (sev === "sev1") return "border-l-4 border-rose-500";
  if (sev === "sev2") return "border-l-4 border-amber-500";
  if (sev === "sev3") return "border-l-4 border-sky-500";
  return "border-l-4 border-slate-500";
}

function formatAge(createdAt: string, lng: string): string {
  const ms = Date.now() - new Date(createdAt).getTime();
  const minutes = Math.floor(ms / 60_000);
  const hours = Math.floor(ms / 3_600_000);
  const days = Math.floor(ms / 86_400_000);
  if (lng === "ja") {
    if (days >= 1) return `${days} 日`;
    if (hours >= 1) return `${hours} 時間`;
    return `${minutes} 分`;
  }
  if (lng === "zh-TW") {
    if (days >= 1) return `${days} 天`;
    if (hours >= 1) return `${hours} 小時`;
    return `${minutes} 分`;
  }
  if (days >= 1) return `${days}d`;
  if (hours >= 1) return `${hours}h`;
  return `${minutes}m`;
}

export function TicketsPage() {
  const { t, i18n } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const [range, setRange] = useState<TimeRange>("7d");

  const ticketsQ = useQuery({ queryKey: ["tickets"], queryFn: Tickets.list });
  const auditQ = useQuery({
    queryKey: ["audit", "tickets"],
    queryFn: () => Audit.list({ entity_type: "Ticket", limit: 200 }),
  });

  const resolve = useMutation({
    mutationFn: (id: number) => Tickets.resolve(id, "Resolved via console"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const tickets = ticketsQ.data ?? [];
  const open = tickets.filter((t) => t.status !== "resolved" && t.status !== "closed");
  const p1 = open.filter((t) => t.severity === "sev1").length;
  const p2 = open.filter((t) => t.severity === "sev2").length;
  const p3 = open.filter((t) => t.severity === "sev3").length;

  const resolved = tickets.filter((t) => t.status === "resolved" || t.status === "closed");
  const mttr = useMemo(() => {
    if (resolved.length === 0) return 0;
    const total = resolved.reduce((acc, t) => {
      const start = new Date(t.created_at).getTime();
      const end = t.resolved_at ? new Date(t.resolved_at).getTime() : start;
      return acc + Math.max(0, end - start);
    }, 0);
    return Math.round(total / resolved.length / 60_000);
  }, [resolved]);

  const slaCompliance = useMemo(() => {
    if (tickets.length === 0) return 100;
    const breached = tickets.filter((t) => t.sla_status === "breached").length;
    return Math.max(0, ((tickets.length - breached) / tickets.length) * 100);
  }, [tickets]);

  const days = rangeDays(range);
  const trendBuckets = useMemo(() => {
    return dailyBuckets(
      auditQ.data ?? [],
      days,
      (l) => l.timestamp,
      (l) => l.action_type === "ticket.created",
    );
  }, [auditQ.data, days]);

  const distribution = useMemo(() => {
    const map = new Map<string, number>();
    for (const svc of SERVICE_KEYS) map.set(svc, 0);
    // Synthetic distribution from ticket title heuristic
    for (const t of tickets) {
      const title = (t.title ?? "").toLowerCase();
      const desc = (t.description ?? "").toLowerCase();
      const blob = `${title} ${desc}`;
      let bucket: string = "api";
      if (blob.includes("power automate") || blob.includes("workflow")) bucket = "workflowEngine";
      else if (blob.includes("business central") || blob.includes("erp")) bucket = "erpBridge";
      else if (blob.includes("crm") || blob.includes("dataverse")) bucket = "crmSync";
      else if (blob.includes("auth") || blob.includes("login")) bucket = "auth";
      else if (blob.includes("db") || blob.includes("database")) bucket = "database";
      else if (blob.includes("bpm") || blob.includes("approval")) bucket = "bpmEngine";
      map.set(bucket, (map.get(bucket) ?? 0) + 1);
    }
    return SERVICE_KEYS.map((s) => ({ key: s, count: map.get(s) ?? 0 }));
  }, [tickets]);

  const handleRefresh = () => {
    void qc.invalidateQueries({ queryKey: ["tickets"] });
    void qc.invalidateQueries({ queryKey: ["audit", "tickets"] });
  };

  if (ticketsQ.isError) return <ErrorState error={ticketsQ.error} />;

  const maxBucket = Math.max(1, ...trendBuckets.map((b) => b.count));
  const maxDistribution = Math.max(1, ...distribution.map((d) => d.count));

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("tickets.title")}
        subtitle={t("tickets.subtitle")}
        info={t("tickets.info")}
        right={
          <>
            <TimeRangeSwitcher value={range} onChange={setRange} />
            <RefreshButton
              isFetching={ticketsQ.isFetching}
              lastUpdated={ticketsQ.dataUpdatedAt}
              onRefresh={handleRefresh}
            />
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPICard
          label={t("tickets.kpi.open")}
          value={String(open.length)}
          hint={t("tickets.kpi.breakdown", { p1, p2, p3 })}
          trend={mockTrend("tk-open-" + range, [-12, 8])}
          inverse
          tone={p1 > 0 ? "danger" : open.length > 0 ? "warning" : "success"}
        />
        <KPICard
          label={t("tickets.kpi.mttr")}
          value={t("tickets.kpi.mttrUnit", { value: mttr })}
          hint={t("time.vsPrevious")}
          trend={mockTrend("tk-mttr-" + range, [-15, 6])}
          inverse
          tone="info"
        />
        <KPICard
          label={t("tickets.kpi.slaCompliance")}
          value={`${slaCompliance.toFixed(1)}%`}
          hint={t("time.vsPrevious")}
          trend={mockTrend("tk-sla-" + range, [-3, 6])}
          tone={slaCompliance >= 95 ? "success" : slaCompliance >= 90 ? "warning" : "danger"}
        />
        <OnCallCard />
      </div>

      {/* Main two-column area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2/3 — incidents table */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title={t("tickets.activeIncidents.title")} />
            <CardBody className="p-0">
              {ticketsQ.isLoading ? (
                <div className="p-3 space-y-2">
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                  <SkeletonRow cols={6} />
                </div>
              ) : open.length === 0 ? (
                <EmptyState
                  illustration="success"
                  title={t("tickets.tableNew.empty")}
                  description={t("tickets.tableNew.emptyDesc")}
                />
              ) : (
                <div className="overflow-x-auto scrollbar-soft">
                  <table className="w-full text-sm min-w-[800px]">
                    <thead className="text-xs text-ms-muted uppercase tracking-wider bg-white/[0.02] border-b border-ms-line">
                      <tr>
                        <th className="text-left px-4 py-2 font-medium">{t("tickets.tableNew.severity")}</th>
                        <th className="text-left px-4 py-2 font-medium">{t("tickets.tableNew.title")}</th>
                        <th className="text-left px-4 py-2 font-medium">{t("tickets.tableNew.assignee")}</th>
                        <th className="text-left px-4 py-2 font-medium">{t("tickets.tableNew.age")}</th>
                        <th className="text-left px-4 py-2 font-medium">{t("tickets.tableNew.sla")}</th>
                        <th className="text-right px-4 py-2 font-medium"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {open.map((tk) => {
                        const accent = severityRowAccent(tk.severity);
                        return (
                          <tr
                            key={tk.id}
                            className={`border-b border-ms-line/60 hover:bg-white/[0.03] transition-colors ${accent}`}
                          >
                            <td className="px-4 py-2.5 align-middle">
                              <SeverityChip severity={tk.severity} />
                            </td>
                            <td className="px-4 py-2.5 align-middle">
                              <div className="font-mono text-[10px] text-ms-muted">
                                {tk.ticket_number}
                              </div>
                              <div className="text-sm truncate" title={tk.title}>
                                {tk.title}
                              </div>
                            </td>
                            <td className="px-4 py-2.5 align-middle">
                              {tk.assignee ? (
                                <div className="flex items-center gap-2">
                                  <Avatar name={tk.assignee} size="xs" />
                                  <span className="text-xs text-ms-muted truncate">{tk.assignee}</span>
                                </div>
                              ) : (
                                <span className="text-xs text-ms-muted">—</span>
                              )}
                            </td>
                            <td className="px-4 py-2.5 align-middle text-xs text-ms-muted whitespace-nowrap">
                              {formatAge(tk.created_at, i18n.language)}
                            </td>
                            <td className="px-4 py-2.5 align-middle">
                              <Badge tone={statusTone(tk.sla_status)}>
                                {labelOf(tk.sla_status)}
                              </Badge>
                            </td>
                            <td className="px-4 py-2.5 align-middle text-right">
                              <Button
                                variant="primary"
                                onClick={() => resolve.mutate(tk.id)}
                                disabled={resolve.isPending}
                              >
                                {t("tickets.table.resolveBtn")}
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* RIGHT 1/3 — service health */}
        <Card>
          <CardHeader
            title={t("tickets.serviceHealth.title")}
            subtitle={t("tickets.serviceHealth.subtitle")}
          />
          <CardBody className="p-3">
            <ul className="grid grid-cols-2 gap-2">
              {SERVICE_KEYS.map((svc) => {
                const uptime = syntheticUptime(svc);
                const band = uptimeBand(uptime);
                const dot =
                  band === "healthy" ? "bg-emerald-400"
                  : band === "degraded" ? "bg-amber-400"
                  : "bg-rose-400";
                return (
                  <li
                    key={svc}
                    className="rounded border border-ms-line/60 bg-white/[0.02] p-2.5"
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span aria-hidden className={`w-2 h-2 rounded-full ${dot}`} />
                      <span className="text-xs font-medium truncate">
                        {t(`tickets.services.${svc}` as const)}
                      </span>
                    </div>
                    <div className="text-[10px] text-ms-muted tabular-nums">
                      {t("tickets.serviceHealth.uptime", { value: uptime.toFixed(2) })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>

      {/* Bottom: trend + distribution */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader
            title={t("tickets.trend.title")}
            subtitle={t("tickets.trend.subtitle")}
          />
          <CardBody>
            <div className="flex items-end gap-1.5 h-32">
              {trendBuckets.map((b, i) => {
                const heightPct = (b.count / maxBucket) * 100;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div className="w-full flex flex-col justify-end h-full">
                      <div
                        className="bg-rose-400/40 rounded-t"
                        style={{ height: `${heightPct}%`, minHeight: b.count > 0 ? "4px" : "0px" }}
                        title={`${b.date}: ${b.count}`}
                      />
                    </div>
                    <div className="text-[10px] text-ms-muted">
                      {b.date.slice(5)}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardBody>
        </Card>
        <Card>
          <CardHeader
            title={t("tickets.distribution.title")}
            subtitle={t("tickets.distribution.subtitle")}
          />
          <CardBody>
            <ul className="space-y-2">
              {distribution.map((d) => {
                const widthPct = (d.count / maxDistribution) * 100;
                return (
                  <li key={d.key} className="text-xs">
                    <div className="flex items-center justify-between mb-1">
                      <span>{t(`tickets.services.${d.key}` as const)}</span>
                      <span className="tabular-nums text-ms-muted">{d.count}</span>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-ms-blue/60"
                        style={{ width: `${widthPct}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function KPICard({
  label,
  value,
  hint,
  trend,
  inverse,
  tone,
}: {
  label: string;
  value: string;
  hint?: string;
  trend: number | null;
  inverse?: boolean;
  tone: "info" | "warning" | "success" | "danger";
}) {
  const dot =
    tone === "success" ? "bg-emerald-400"
    : tone === "warning" ? "bg-amber-400"
    : tone === "danger" ? "bg-rose-400"
    : "bg-sky-400";
  return (
    <div className="rounded-lg border border-ms-line bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-ms-muted">
        <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {label}
      </div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ms-muted">
        <TrendIndicator delta={trend} inverse={inverse} />
        {hint && <span className="truncate">{hint}</span>}
      </div>
    </div>
  );
}

function OnCallCard() {
  const { t } = useTranslation();
  const name = t("tickets.kpi.onCallName");
  return (
    <div className="rounded-lg border border-ms-line bg-white/[0.02] p-4">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-ms-muted">
        <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-violet-400" />
        {t("tickets.kpi.onCallNow")}
      </div>
      <div className="mt-2 flex items-center gap-2">
        <Avatar name="Ops Engineer" size="md" />
        <div className="min-w-0">
          <div className="text-sm font-medium truncate">{name}</div>
          <div className="text-[11px] text-ms-muted">ops.engineer@partner.com</div>
        </div>
      </div>
    </div>
  );
}

function SeverityChip({ severity }: { severity: string }) {
  const { t } = useTranslation();
  const code = severityToP(severity);
  const tone =
    code === "p1" ? "bg-rose-500/30 text-rose-200 ring-rose-500/60"
    : code === "p2" ? "bg-amber-500/30 text-amber-200 ring-amber-500/60"
    : code === "p3" ? "bg-sky-500/30 text-sky-200 ring-sky-500/60"
    : "bg-slate-500/30 text-slate-200 ring-slate-500/60";
  return (
    <span
      className={`inline-flex items-center justify-center w-9 h-7 rounded text-xs font-bold ring-1 ${tone}`}
    >
      {t(`tickets.severityP.${code}` as const)}
    </span>
  );
}

// Avoid unused-import lint: surface the imported list helper.
export type _Tickets = Ticket[];
