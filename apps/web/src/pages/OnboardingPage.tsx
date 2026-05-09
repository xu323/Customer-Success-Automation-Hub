import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Audit, Onboarding } from "@/api/endpoints";
import { Card, CardBody } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { ErrorState, EmptyState } from "@/components/StateMessages";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { TimeRangeSwitcher, type TimeRange } from "@/components/TimeRangeSwitcher";
import { TrendIndicator } from "@/components/TrendIndicator";
import { Avatar } from "@/components/Avatar";
import { SkeletonRow } from "@/components/Skeleton";
import { formatDate, formatRelative } from "@/lib/format";
import { mockTrend } from "@/lib/timeseries";
import type { OnboardingProject, OnboardingTask } from "@/types";

const STAGES = ["planning", "in_progress", "on_hold", "completed"] as const;

function HealthBar({ score }: { score: number }) {
  const tone =
    score >= 80 ? "bg-emerald-400/70"
    : score >= 60 ? "bg-amber-400/70"
    : "bg-rose-400/70";
  const labelTone =
    score >= 80 ? "text-emerald-300"
    : score >= 60 ? "text-amber-300"
    : "text-rose-300";
  return (
    <div className="flex items-center gap-2 min-w-0">
      <div className="flex-1 max-w-[80px] h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${Math.max(0, Math.min(100, score))}%` }} />
      </div>
      <span className={`text-xs tabular-nums font-medium ${labelTone}`}>{score.toFixed(0)}</span>
    </div>
  );
}

function StageProgress({ stage, totalTasks, doneTasks }: { stage: string; totalTasks: number; doneTasks: number }) {
  const stageIdx = STAGES.indexOf(stage as typeof STAGES[number]);
  const stageNum = stageIdx === -1 ? 1 : stageIdx + 1;
  const taskRatio = totalTasks > 0 ? doneTasks / totalTasks : 0;
  return (
    <div className="flex flex-col gap-1 min-w-[80px]">
      <div className="flex items-center gap-0.5">
        {STAGES.map((_, i) => (
          <div
            key={i}
            className={`flex-1 h-1 rounded-full ${
              i < stageNum ? "bg-ms-blue" : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <span className="text-[10px] text-ms-muted tabular-nums">
        {stageNum} / {STAGES.length} · {doneTasks}/{totalTasks} ({(taskRatio * 100).toFixed(0)}%)
      </span>
    </div>
  );
}

function RiskFlagChips({
  flags,
}: {
  flags: { kind: "overdueTask" | "lowEngagement" | "missedKickoff" | "slipping" }[];
}) {
  const { t } = useTranslation();
  if (flags.length === 0) return <span className="text-xs text-ms-muted">—</span>;
  return (
    <div className="flex items-center gap-1 flex-wrap">
      {flags.map((f, i) => {
        const label = t(`onboarding.flags.${f.kind}` as const);
        const tone =
          f.kind === "overdueTask" ? "danger"
          : f.kind === "missedKickoff" ? "danger"
          : f.kind === "slipping" ? "warning"
          : "warning";
        return (
          <Badge key={i} tone={tone}>
            {label}
          </Badge>
        );
      })}
    </div>
  );
}

function evaluateFlags(p: OnboardingProject): { kind: "overdueTask" | "lowEngagement" | "missedKickoff" | "slipping" }[] {
  const flags: { kind: "overdueTask" | "lowEngagement" | "missedKickoff" | "slipping" }[] = [];
  const now = Date.now();
  const overdue = p.tasks.some(
    (t) => t.status !== "done" && t.due_date && new Date(t.due_date).getTime() < now,
  );
  if (overdue) flags.push({ kind: "overdueTask" });
  const kickoff = p.tasks.find((t) => t.title.toLowerCase().includes("kickoff"));
  if (kickoff && kickoff.status !== "done") flags.push({ kind: "missedKickoff" });
  if (p.health_score < 70) flags.push({ kind: "slipping" });
  return flags;
}

export function OnboardingPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const [range, setRange] = useState<TimeRange>("30d");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const projectsQ = useQuery({ queryKey: ["onboarding"], queryFn: Onboarding.listProjects });
  const auditQ = useQuery({
    queryKey: ["audit", "onboarding"],
    queryFn: () => Audit.list({ limit: 200 }),
  });

  const completeTask = useMutation({
    mutationFn: ({ projectId, taskId }: { projectId: number; taskId: number }) =>
      Onboarding.completeTask(projectId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const projects = projectsQ.data ?? [];
  const active = projects.filter((p) => p.status !== "completed");
  const atRisk = active.filter((p) => p.health_score < 70);
  const onTrackPct = active.length > 0
    ? ((active.length - atRisk.length) / active.length) * 100
    : 100;

  // Mock avg time-to-value: derive from target_go_live diff to created_at
  const avgTtv = useMemo(() => {
    const completed = projects.filter((p) => p.status === "completed");
    if (completed.length === 0) return 60; // sensible default
    const totalDays = completed.reduce((acc, p) => {
      const start = new Date(p.created_at).getTime();
      const end = p.target_go_live ? new Date(p.target_go_live).getTime() : start;
      return acc + Math.max(0, (end - start) / 86400000);
    }, 0);
    return totalDays / completed.length;
  }, [projects]);

  const handleRefresh = () => {
    void qc.invalidateQueries({ queryKey: ["onboarding"] });
    void qc.invalidateQueries({ queryKey: ["risks"] });
  };
  const lastUpdated = projectsQ.dataUpdatedAt;

  if (projectsQ.isError) return <ErrorState error={projectsQ.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("onboarding.title")}
        subtitle={t("onboarding.subtitle")}
        info={t("onboarding.info")}
        right={
          <>
            <TimeRangeSwitcher value={range} onChange={setRange} />
            <RefreshButton
              isFetching={projectsQ.isFetching}
              lastUpdated={lastUpdated}
              onRefresh={handleRefresh}
            />
          </>
        }
      />

      {/* KPI strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <KPI
          label={t("onboarding.kpi.activeCount")}
          value={String(active.length)}
          hint={t("onboarding.kpi.activeHint")}
          trend={mockTrend("ob-active-" + range, [-5, 12])}
          tone="info"
        />
        <KPI
          label={t("onboarding.kpi.atRiskCount")}
          value={String(atRisk.length)}
          hint={t("onboarding.kpi.atRiskHint")}
          trend={mockTrend("ob-risk-" + range, [-12, 8])}
          inverse
          tone={atRisk.length > 0 ? "danger" : "success"}
        />
        <KPI
          label={t("onboarding.kpi.avgTtv")}
          value={t("onboarding.kpi.avgTtvUnit", { count: Math.round(avgTtv) })}
          hint={t("onboarding.kpi.activeHint")}
          trend={mockTrend("ob-ttv-" + range, [-6, 4])}
          inverse
          tone="info"
        />
        <KPI
          label={t("onboarding.kpi.onTrack")}
          value={`${onTrackPct.toFixed(0)}%`}
          hint={t("onboarding.kpi.onTrackHint")}
          trend={mockTrend("ob-track-" + range, [-4, 10])}
          tone={onTrackPct >= 80 ? "success" : "warning"}
        />
      </div>

      {/* Customer health table */}
      <Card>
        <CardBody className="p-0">
          {projectsQ.isLoading ? (
            <div className="p-3 space-y-2">
              <SkeletonRow cols={6} />
              <SkeletonRow cols={6} />
              <SkeletonRow cols={6} />
            </div>
          ) : projects.length === 0 ? (
            <EmptyState
              illustration="default"
              title={t("onboarding.emptyState.title")}
              description={t("onboarding.emptyState.description")}
            />
          ) : (
            <div className="overflow-x-auto scrollbar-soft">
              <table className="w-full text-sm min-w-[1000px]">
                <thead className="text-xs text-ms-muted uppercase tracking-wider bg-white/[0.02] border-b border-ms-line">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">{t("onboarding.table.customer")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("onboarding.table.health")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("onboarding.table.stageProgress")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("onboarding.table.csm")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("onboarding.table.lastActivity")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("onboarding.table.riskFlags")}</th>
                    <th className="px-4 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {projects.map((p) => {
                    const flags = evaluateFlags(p);
                    const totalTasks = p.tasks.length;
                    const doneTasks = p.tasks.filter((t) => t.status === "done").length;
                    const lastActivity = (auditQ.data ?? []).find(
                      (l) =>
                        l.entity_type === "OnboardingTask" ||
                        (l.entity_type === "CustomerOnboardingProject" &&
                          l.entity_id === String(p.id)),
                    );
                    const isExpanded = expandedId === p.id;
                    return (
                      <OnboardingRow
                        key={p.id}
                        project={p}
                        flags={flags}
                        totalTasks={totalTasks}
                        doneTasks={doneTasks}
                        lastActivityWhen={lastActivity?.timestamp}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedId(isExpanded ? null : p.id)}
                        onCompleteTask={(taskId) =>
                          completeTask.mutate({ projectId: p.id, taskId })
                        }
                        labelOf={labelOf}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function KPI({
  label,
  value,
  hint,
  trend,
  inverse,
  tone,
}: {
  label: string;
  value: string;
  hint: string;
  trend: number;
  inverse?: boolean;
  tone: "info" | "warning" | "success" | "danger";
}) {
  const { t } = useTranslation();
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
        <span>{t("time.vsPrevious")}</span>
        <span className="truncate">· {hint}</span>
      </div>
    </div>
  );
}

function OnboardingRow({
  project,
  flags,
  totalTasks,
  doneTasks,
  lastActivityWhen,
  isExpanded,
  onToggle,
  onCompleteTask,
  labelOf,
}: {
  project: OnboardingProject;
  flags: { kind: "overdueTask" | "lowEngagement" | "missedKickoff" | "slipping" }[];
  totalTasks: number;
  doneTasks: number;
  lastActivityWhen?: string;
  isExpanded: boolean;
  onToggle: () => void;
  onCompleteTask: (taskId: number) => void;
  labelOf: (key: string) => string;
}) {
  const { t } = useTranslation();
  const accountName = project.project_name.split(" - ")[0];
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-ms-line/60 cursor-pointer transition-colors ${
          isExpanded ? "bg-ms-blue/[0.06]" : "hover:bg-white/[0.03]"
        }`}
      >
        <td className="px-4 py-3 align-middle">
          <div className="flex items-center gap-2.5 min-w-0">
            <Avatar name={accountName} size="md" />
            <div className="min-w-0">
              <div className="font-medium text-sm truncate">{project.project_name}</div>
              <div className="text-[11px] text-ms-muted truncate">
                <Badge tone={statusTone(project.status)} className="mr-1">
                  {labelOf(project.status)}
                </Badge>
                {project.target_go_live && (
                  <span>{t("onboarding.project.target")}: {formatDate(project.target_go_live)}</span>
                )}
              </div>
            </div>
          </div>
        </td>
        <td className="px-4 py-3 align-middle">
          <HealthBar score={project.health_score} />
        </td>
        <td className="px-4 py-3 align-middle">
          <StageProgress
            stage={project.status}
            totalTasks={totalTasks}
            doneTasks={doneTasks}
          />
        </td>
        <td className="px-4 py-3 align-middle">
          <div className="flex items-center gap-2">
            <Avatar name={project.owner ?? "Unassigned"} size="xs" />
            <span className="text-xs text-ms-muted truncate">{project.owner ?? "—"}</span>
          </div>
        </td>
        <td className="px-4 py-3 align-middle text-xs text-ms-muted">
          {lastActivityWhen ? formatRelative(lastActivityWhen) : t("onboarding.table.noActivity")}
        </td>
        <td className="px-4 py-3 align-middle">
          <RiskFlagChips flags={flags} />
        </td>
        <td className="px-4 py-3 align-middle text-right">
          <span aria-hidden className={`text-xs transition-transform inline-block ${isExpanded ? "rotate-90" : ""}`}>
            ▶
          </span>
        </td>
      </tr>
      {/* Expanded detail row */}
      <tr className="border-b border-ms-line/60">
        <td colSpan={7} className="p-0">
          <div
            className="grid transition-all duration-200 ease-out"
            style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-5 bg-white/[0.02] border-t border-ms-line/40">
                {/* Tasks */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-ms-muted mb-2">
                    {t("onboarding.expandedDetail.tasks")}
                  </div>
                  {project.tasks.length === 0 ? (
                    <div className="text-xs text-ms-muted italic">
                      {t("onboarding.expandedDetail.noTasks")}
                    </div>
                  ) : (
                    <ul className="space-y-1.5">
                      {project.tasks.map((task) => (
                        <TaskRow key={task.id} task={task} onComplete={() => onCompleteTask(task.id)} />
                      ))}
                    </ul>
                  )}
                </div>
                {/* Activity */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-ms-muted mb-2">
                    {t("onboarding.expandedDetail.activity")}
                  </div>
                  <div className="text-xs text-ms-muted italic">
                    {lastActivityWhen
                      ? formatRelative(lastActivityWhen)
                      : t("onboarding.expandedDetail.noActivity")}
                  </div>
                </div>
                {/* Automation */}
                <div>
                  <div className="text-xs uppercase tracking-wider text-ms-muted mb-2">
                    {t("onboarding.expandedDetail.automation")}
                  </div>
                  <div className="text-xs text-ms-muted italic">
                    {t("onboarding.expandedDetail.noAutomation")}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

function TaskRow({ task, onComplete }: { task: OnboardingTask; onComplete: () => void }) {
  const { t } = useTranslation();
  const isDone = task.status === "done";
  const isOverdue =
    task.due_date && task.status !== "done" && new Date(task.due_date).getTime() < Date.now();
  return (
    <li className="flex items-center justify-between gap-2 text-xs">
      <div className="flex items-center gap-2 min-w-0">
        <span
          className={`w-3 h-3 rounded border ${
            isDone
              ? "bg-emerald-400/70 border-emerald-400/70"
              : isOverdue
              ? "border-rose-400/70"
              : "border-ms-line"
          } flex items-center justify-center`}
          aria-hidden
        >
          {isDone && <span className="text-[10px] text-white">✓</span>}
        </span>
        <span className={`truncate ${isDone ? "text-ms-muted line-through" : ""}`}>
          {task.title}
        </span>
        {isOverdue && (
          <Badge tone="danger" className="ml-1">
            {t("onboarding.expandedDetail.taskOverdue")}
          </Badge>
        )}
      </div>
      {!isDone && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onComplete();
          }}
          className="text-[10px] text-ms-blue hover:underline"
        >
          ✓
        </button>
      )}
    </li>
  );
}
