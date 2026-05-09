import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Audit, Automation, BPM, Dashboard, Onboarding, Tickets } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, useStatusLabel } from "@/components/Badge";
import { ErrorState } from "@/components/StateMessages";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { TimeRangeSwitcher, rangeDays, type TimeRange } from "@/components/TimeRangeSwitcher";
import { Sparkline } from "@/components/Sparkline";
import { TrendIndicator } from "@/components/TrendIndicator";
import { SkeletonKPIs, Skeleton } from "@/components/Skeleton";
import { EmptyState } from "@/components/StateMessages";
import { Avatar } from "@/components/Avatar";
import { formatCurrency, formatRelative, pct } from "@/lib/format";
import { dailyBuckets, mockTrend, periodOverPeriod } from "@/lib/timeseries";
import type { AuditLog } from "@/types";

// ----------------------------------------------------------------------
// Tier-1 KPI card (large, with sparkline + trend)
// ----------------------------------------------------------------------
function PrimaryKPI({
  label,
  value,
  hint,
  trend,
  inverse,
  spark,
  tone = "info",
}: {
  label: string;
  value: string;
  hint?: string;
  trend: number | null;
  inverse?: boolean;
  spark: number[];
  tone?: "info" | "warning" | "success" | "danger";
}) {
  const { t } = useTranslation();
  const accent =
    tone === "success" ? "from-emerald-500/15 border-emerald-500/30"
    : tone === "warning" ? "from-amber-500/15 border-amber-500/30"
    : tone === "danger" ? "from-rose-500/15 border-rose-500/30"
    : "from-sky-500/15 border-sky-500/30";
  const sparkColor =
    tone === "success" ? "#34d399"
    : tone === "warning" ? "#f59e0b"
    : tone === "danger" ? "#fb7185"
    : "#0078d4";
  return (
    <div className={`rounded-xl border bg-gradient-to-br to-transparent p-5 ${accent}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="text-xs uppercase tracking-wide text-ms-muted">{label}</div>
        <Sparkline values={spark} stroke={sparkColor} fill={`${sparkColor}22`} />
      </div>
      <div className="mt-2 text-3xl font-semibold tabular-nums">{value}</div>
      <div className="mt-1 flex items-center gap-2 text-xs">
        <TrendIndicator delta={trend} inverse={inverse} />
        <span className="text-ms-muted">{t("time.vsPrevious")}</span>
        {hint && <span className="text-ms-muted truncate">· {hint}</span>}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Tier-2 KPI card (small, single-line)
// ----------------------------------------------------------------------
function SecondaryKPI({
  label,
  value,
  hint,
  trend,
  inverse,
  tone = "info",
}: {
  label: string;
  value: string;
  hint?: string;
  trend: number | null;
  inverse?: boolean;
  tone?: "info" | "warning" | "success" | "danger" | "neutral";
}) {
  const dotTone =
    tone === "success" ? "bg-emerald-400"
    : tone === "warning" ? "bg-amber-400"
    : tone === "danger" ? "bg-rose-400"
    : tone === "neutral" ? "bg-slate-400"
    : "bg-sky-400";
  return (
    <div className="rounded-lg border border-ms-line bg-white/[0.02] p-3 flex flex-col">
      <div className="flex items-center gap-2 text-[11px] uppercase tracking-wide text-ms-muted">
        <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${dotTone}`} />
        <span className="truncate">{label}</span>
      </div>
      <div className="mt-1 text-xl font-semibold tabular-nums">{value}</div>
      <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-ms-muted">
        <TrendIndicator delta={trend} inverse={inverse} />
        {hint && <span className="truncate">{hint}</span>}
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// Activity feed item (timeline-style)
// ----------------------------------------------------------------------
function ActivityIcon({ entity, status }: { entity: string; status: string }) {
  const tone =
    status === "error" ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
    : status === "ok" ? "bg-sky-500/20 text-sky-300 border-sky-500/40"
    : "bg-slate-500/20 text-slate-300 border-slate-500/40";
  const initial = entity.slice(0, 1).toUpperCase();
  return (
    <span className={`inline-flex w-6 h-6 rounded-full border items-center justify-center text-[10px] font-bold ${tone}`}>
      {initial}
    </span>
  );
}

// ----------------------------------------------------------------------
// Page
// ----------------------------------------------------------------------
export function DashboardPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const [range, setRange] = useState<TimeRange>("30d");

  const summaryQ = useQuery({ queryKey: ["dashboard"], queryFn: Dashboard.summary });
  const auditQ = useQuery({
    queryKey: ["audit", "dashboard", range],
    queryFn: () => Audit.list({ limit: 500 }),
  });
  const onboardingQ = useQuery({ queryKey: ["onboarding"], queryFn: Onboarding.listProjects });
  const bpmQ = useQuery({ queryKey: ["bpm"], queryFn: BPM.listRequests });
  const runsQ = useQuery({ queryKey: ["runs"], queryFn: Automation.listRuns });
  const ticketsQ = useQuery({ queryKey: ["tickets"], queryFn: Tickets.list });

  const days = rangeDays(range);
  const isLoading = summaryQ.isLoading || auditQ.isLoading;

  const handleRefresh = () => {
    void qc.invalidateQueries();
  };
  const lastUpdated = Math.max(
    summaryQ.dataUpdatedAt ?? 0,
    auditQ.dataUpdatedAt ?? 0,
  );

  // ---- spark + trend (derived from audit logs) ----
  const audit = auditQ.data ?? [];
  const pipelineBuckets = useMemo(
    () => dailyBuckets(audit, days, (l) => l.timestamp, (l) => l.action_type.startsWith("opportunity") || l.action_type.startsWith("lead.qualified")),
    [audit, days],
  );
  const onboardingBuckets = useMemo(
    () => dailyBuckets(audit, days, (l) => l.timestamp, (l) => l.action_type.startsWith("onboarding")),
    [audit, days],
  );
  const automationBuckets = useMemo(
    () => dailyBuckets(audit, days, (l) => l.timestamp, (l) => l.action_type.startsWith("workflow.run")),
    [audit, days],
  );

  const pipelineDelta = mockTrend("pipeline-" + days, [-8, 22]);
  const onboardingDelta = mockTrend("onboarding-" + days, [-12, 18]);
  const automationDelta = useMemo(() => {
    const total = (runsQ.data ?? []).length;
    if (total === 0) return null;
    const ok = (runsQ.data ?? []).filter((r) => r.status === "succeeded").length;
    const baseline = 90;
    return ((ok / total) * 100) - baseline;
  }, [runsQ.data]);
  const leadsDelta = mockTrend("leads-" + days, [-15, 24]);
  const approvalsDelta = mockTrend("approvals-" + days, [-10, 16]);
  const ticketsPoP = useMemo(
    () => periodOverPeriod(audit, days, (l) => l.timestamp, (l) => l.action_type === "ticket.created"),
    [audit, days],
  );

  // ---- automation success ratio (last N days) ----
  const automationStats = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const recent = (runsQ.data ?? []).filter(
      (r) => new Date(r.started_at).getTime() >= cutoff,
    );
    if (recent.length === 0) return { rate: null as number | null, total: 0 };
    const ok = recent.filter((r) => r.status === "succeeded").length;
    return { rate: (ok / recent.length) * 100, total: recent.length };
  }, [runsQ.data, days]);

  // ---- focus panel data ----
  const atRiskProjects = useMemo(() => {
    const all = onboardingQ.data ?? [];
    return all
      .filter((p) => p.health_score < 70 && p.status !== "completed")
      .sort((a, b) => a.health_score - b.health_score);
  }, [onboardingQ.data]);
  const stuckBpm = useMemo(() => {
    return (bpmQ.data ?? []).filter((r) => r.status === "Submitted");
  }, [bpmQ.data]);
  const failedRuns = useMemo(() => {
    const cutoff = Date.now() - 24 * 60 * 60 * 1000;
    return (runsQ.data ?? []).filter(
      (r) => r.status === "failed" && new Date(r.started_at).getTime() >= cutoff,
    );
  }, [runsQ.data]);

  if (summaryQ.isError) return <ErrorState error={summaryQ.error} />;

  const summary = summaryQ.data;
  const ticketsP1 = (ticketsQ.data ?? []).filter(
    (t) => t.severity === "sev1" && t.status !== "resolved" && t.status !== "closed",
  ).length;
  const ticketsP2 = (ticketsQ.data ?? []).filter(
    (t) => t.severity === "sev2" && t.status !== "resolved" && t.status !== "closed",
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("dashboard.title")}
        subtitle={t("dashboard.subtitle")}
        info={t("dashboard.info")}
        right={
          <>
            <TimeRangeSwitcher value={range} onChange={setRange} />
            <RefreshButton
              isFetching={summaryQ.isFetching || auditQ.isFetching}
              lastUpdated={lastUpdated}
              onRefresh={handleRefresh}
            />
          </>
        }
      />

      {/* ----- Tier 1: 3 primary KPIs ----- */}
      {isLoading || !summary ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="rounded-xl border border-ms-line bg-white/[0.02] p-5 space-y-3">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-9 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <PrimaryKPI
            label={t("dashboard.tier1.pipeline")}
            value={formatCurrency(summary.crm_pipeline_value)}
            hint={t("dashboard.tier1.pipelineHint", { count: summary.open_opportunities })}
            trend={pipelineDelta}
            spark={pipelineBuckets.map((b) => b.count)}
            tone="info"
          />
          <PrimaryKPI
            label={t("dashboard.tier1.onboarding")}
            value={String(summary.active_onboarding_projects)}
            hint={t("dashboard.tier1.onboardingHint", { count: summary.onboarding_at_risk })}
            trend={onboardingDelta}
            spark={onboardingBuckets.map((b) => b.count)}
            tone={summary.onboarding_at_risk > 0 ? "warning" : "success"}
          />
          <PrimaryKPI
            label={t("dashboard.tier1.automation")}
            value={automationStats.rate === null ? "—" : pct(automationStats.rate, 0)}
            hint={t("dashboard.tier1.automationHint", { count: automationStats.total, days })}
            trend={automationDelta}
            spark={automationBuckets.map((b) => b.count)}
            tone={automationStats.rate !== null && automationStats.rate >= 95 ? "success" : "warning"}
          />
        </div>
      )}

      {/* ----- Tier 2: 4 secondary KPIs ----- */}
      {isLoading || !summary ? (
        <SkeletonKPIs count={4} />
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <SecondaryKPI
            label={t("dashboard.tier2.leadsToQualify")}
            value={String(summary.leads_to_qualify)}
            hint={t("dashboard.tier2.leadsHint", { count: summary.quotes_pending })}
            trend={leadsDelta}
            tone="neutral"
          />
          <SecondaryKPI
            label={t("dashboard.tier2.pendingApprovals")}
            value={String(summary.pending_approvals)}
            hint={t("dashboard.tier2.pendingApprovalsHint", { count: stuckBpm.length })}
            trend={approvalsDelta}
            tone={summary.pending_approvals > 0 ? "info" : "neutral"}
          />
          <SecondaryKPI
            label={t("dashboard.tier2.openTickets")}
            value={String(summary.open_tickets)}
            hint={t("dashboard.tier2.openTicketsHint", { p1: ticketsP1, p2: ticketsP2 })}
            trend={ticketsPoP.delta}
            inverse
            tone={ticketsP1 > 0 ? "danger" : summary.open_tickets > 0 ? "warning" : "success"}
          />
          <SecondaryKPI
            label={t("dashboard.tier2.slaBreached")}
            value={String(summary.breached_tickets)}
            hint={t("dashboard.tier2.slaBreachedHint")}
            trend={null}
            inverse
            tone={summary.breached_tickets > 0 ? "danger" : "success"}
          />
        </div>
      )}

      {/* ----- Two-column main area ----- */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT 2/3: focus panel */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader title={t("dashboard.focus.title")} subtitle={t("dashboard.focus.subtitle")} />
            <CardBody className="p-0">
              {atRiskProjects.length === 0 && stuckBpm.length === 0 && failedRuns.length === 0 ? (
                <EmptyState
                  illustration="success"
                  title={t("dashboard.focus.empty")}
                  description={t("dashboard.focus.emptyDesc")}
                />
              ) : (
                <div className="divide-y divide-ms-line/60">
                  {/* At-risk onboardings */}
                  <FocusSection
                    label={t("dashboard.focus.atRisk")}
                    desc={t("dashboard.focus.atRiskDesc")}
                    count={atRiskProjects.length}
                    tone="warning"
                  >
                    {atRiskProjects.slice(0, 3).map((p) => (
                      <FocusRow
                        key={p.id}
                        title={p.project_name}
                        subtitle={t("dashboard.focus.itemAtRisk", {
                          score: p.health_score.toFixed(0),
                          owner: p.owner ?? "—",
                        })}
                        right={
                          <Badge tone={p.health_score >= 60 ? "warning" : "danger"}>
                            {p.health_score.toFixed(0)}
                          </Badge>
                        }
                      />
                    ))}
                  </FocusSection>
                  {/* Stuck BPM */}
                  <FocusSection
                    label={t("dashboard.focus.stuckBpm")}
                    desc={t("dashboard.focus.stuckBpmDesc")}
                    count={stuckBpm.length}
                    tone="info"
                  >
                    {stuckBpm.slice(0, 3).map((r) => (
                      <FocusRow
                        key={r.id}
                        title={r.title}
                        subtitle={t("dashboard.focus.itemBpm", {
                          requester: r.requester,
                          type: t(`bpm.types.${r.request_type}` as const),
                          amount: formatCurrency(r.amount ?? 0, r.currency),
                        })}
                        right={<Avatar name={r.requester} size="xs" />}
                      />
                    ))}
                  </FocusSection>
                  {/* Failed runs */}
                  <FocusSection
                    label={t("dashboard.focus.failedRuns")}
                    desc={t("dashboard.focus.failedRunsDesc")}
                    count={failedRuns.length}
                    tone="danger"
                  >
                    {failedRuns.slice(0, 3).map((r) => (
                      <FocusRow
                        key={r.id}
                        title={r.error_message ?? "Workflow run failed"}
                        subtitle={t("dashboard.focus.itemRun", {
                          wfId: r.workflow_id,
                          when: formatRelative(r.started_at),
                        })}
                        right={<Badge tone="danger">{labelOf("failed")}</Badge>}
                      />
                    ))}
                  </FocusSection>
                </div>
              )}
            </CardBody>
          </Card>
        </div>

        {/* RIGHT 1/3: activity feed */}
        <div className="space-y-4">
          <Card>
            <CardHeader title={t("dashboard.activity.title")} subtitle={t("dashboard.activity.subtitle")} />
            <CardBody className="p-0">
              {auditQ.isLoading ? (
                <div className="p-4 space-y-3">
                  {[0, 1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex items-start gap-3">
                      <Skeleton className="w-6 h-6 rounded-full" />
                      <div className="flex-1 space-y-1">
                        <Skeleton className="h-3 w-full" />
                        <Skeleton className="h-2 w-20" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (audit.length === 0 ? (
                <EmptyState
                  illustration="inbox"
                  title={t("dashboard.activity.empty")}
                  description={t("dashboard.activity.emptyDesc")}
                />
              ) : (
                <ActivityTimeline events={audit.slice(0, 20)} />
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
function FocusSection({
  label,
  desc,
  count,
  tone,
  children,
}: {
  label: string;
  desc: string;
  count: number;
  tone: "info" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const { t } = useTranslation();
  if (count === 0) return null;
  const dotTone =
    tone === "danger" ? "bg-rose-400"
    : tone === "warning" ? "bg-amber-400"
    : "bg-sky-400";
  return (
    <section>
      <header className="flex items-center justify-between px-5 py-3 bg-white/[0.02]">
        <div className="flex items-center gap-2 min-w-0">
          <span aria-hidden className={`w-1.5 h-1.5 rounded-full ${dotTone}`} />
          <h3 className="text-sm font-semibold">{label}</h3>
          <span className="text-xs text-ms-muted truncate">— {desc}</span>
        </div>
        <Badge tone={tone === "danger" ? "danger" : tone === "warning" ? "warning" : "info"}>
          {count}
        </Badge>
      </header>
      <ul className="divide-y divide-ms-line/40">{children}</ul>
      {count > 3 && (
        <div className="px-5 py-2 text-right">
          <a className="text-xs text-ms-blue hover:underline" href="#">
            {t("common.viewAll", { count })}
          </a>
        </div>
      )}
    </section>
  );
}

function FocusRow({
  title,
  subtitle,
  right,
}: {
  title: string;
  subtitle: string;
  right?: React.ReactNode;
}) {
  return (
    <li className="px-5 py-2.5 flex items-center gap-3 hover:bg-white/[0.03] transition-colors cursor-pointer">
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{title}</div>
        <div className="text-xs text-ms-muted truncate">{subtitle}</div>
      </div>
      {right && <div className="shrink-0">{right}</div>}
    </li>
  );
}

function ActivityTimeline({ events }: { events: AuditLog[] }) {
  return (
    <ol className="relative">
      {events.map((e, i) => {
        const isLast = i === events.length - 1;
        return (
          <li key={e.id} className="relative pl-12 pr-5 py-2.5 hover:bg-white/[0.03] transition-colors">
            {!isLast && <span className="absolute left-[26px] top-9 bottom-0 w-px bg-ms-line/60" aria-hidden />}
            <div className="absolute left-4 top-3">
              <ActivityIcon entity={e.entity_type} status={e.status} />
            </div>
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-medium truncate">{e.action_type}</div>
              <span className="text-[10px] text-ms-muted whitespace-nowrap">
                {formatRelative(e.timestamp)}
              </span>
            </div>
            <div className="text-xs text-ms-muted truncate">
              {e.entity_type}
              {e.entity_id ? ` · #${e.entity_id}` : ""}
              {e.actor && e.actor !== "system" ? ` · ${e.actor}` : ""}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
