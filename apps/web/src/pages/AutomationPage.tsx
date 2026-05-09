import { useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Automation } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { Modal } from "@/components/Modal";
import { formatDate, formatRelative } from "@/lib/format";
import type { WorkflowDefinition, WorkflowRun } from "@/types";

// Trigger events the engine understands (keep in sync with workflow_engine.py).
const TRIGGER_EVENTS = [
  "manual",
  "opportunity.won",
  "bpm.request.synced_to_bc",
  "onboarding.task.overdue",
] as const;

// Action types and their default param payload, mirroring the backend
// ACTION_REGISTRY in workflow_engine.py.
const ACTION_DEFAULTS: Record<string, Record<string, unknown>> = {
  create_onboarding_project: { target_days: 60 },
  create_risk_alert: { level: "medium", title: "Auto-detected risk" },
  create_ticket: { severity: "sev3", title: "Auto-generated incident", sla_hours: 24 },
  sync_to_business_central: { request_type: "VendorPayment" },
  send_notification: {
    channel: "email",
    to: "delivery@partner.com",
    subject: "Workflow notification",
  },
  call_power_automate_flow: { flow_name: "Generic flow" },
  http_post: { url: "https://api.example.com/webhook" },
};
const ACTION_TYPES = Object.keys(ACTION_DEFAULTS);

const CONDITION_OPS = ["==", "!=", ">", ">=", "<", "<=", "in", "contains", "exists"] as const;

// Map seeded English workflow names to slug keys for i18n title/description
// lookup. User-created workflows fall through to the raw API name.
const SEED_SLUGS: Record<string, string> = {
  "Won opportunity -> Onboarding project": "wonOpportunity",
  "Approved BPM request -> Business Central": "approvedBpm",
  "Onboarding overdue -> Risk alert + Ticket": "onboardingOverdue",
};

const OP_SLUG: Record<string, string> = {
  "==": "eq",
  "!=": "neq",
  ">": "gt",
  ">=": "gte",
  "<": "lt",
  "<=": "lte",
  in: "in",
  contains: "contains",
  exists: "exists",
};

function eventLookupKey(raw?: string | null) {
  return (raw ?? "manual").replace(/\./g, "_");
}

// ----------------------------------------------------------------------
// TipsBar - small disclosure widget that replaces the old big intro card
// ----------------------------------------------------------------------
function TipsBar() {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-ms-line rounded-md bg-white/[0.02]">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="w-full flex items-center justify-between px-3 py-2 text-xs text-ms-muted hover:text-white transition-colors"
      >
        <span className="flex items-center gap-2">
          <span
            aria-hidden
            className="inline-flex items-center justify-center w-4 h-4 rounded-full bg-ms-blue/20 text-ms-blue text-[10px] font-bold"
          >
            i
          </span>
          {t("automation.intro.toggle_label")}
        </span>
        <span
          aria-hidden
          className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
          ▾
        </span>
      </button>
      <div
        className="grid transition-all duration-200 ease-out"
        style={{ gridTemplateRows: open ? "1fr" : "0fr" }}
      >
        <div className="overflow-hidden">
          <div className="px-3 pb-3 pt-2 border-t border-ms-line/60 text-sm">
            <p className="text-ms-muted">{t("automation.intro.body")}</p>
            <ul className="mt-2 space-y-1 text-xs text-ms-muted">
              <li>
                <span className="text-ms-text font-medium">
                  {t("automation.intro.legend_trigger")}
                </span>
                ：{t("automation.intro.legend_trigger_desc")}
              </li>
              <li>
                <span className="text-ms-text font-medium">
                  {t("automation.intro.legend_conditions")}
                </span>
                ：{t("automation.intro.legend_conditions_desc")}
              </li>
              <li>
                <span className="text-ms-text font-medium">
                  {t("automation.intro.legend_actions")}
                </span>
                ：{t("automation.intro.legend_actions_desc")}
              </li>
            </ul>
            <p className="mt-2 text-xs text-ms-muted">
              {t("automation.intro.legend_run")}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// StatusPill / SuccessBar / ActionsMenu  (small presentational pieces)
// ----------------------------------------------------------------------
function StatusPill({ enabled, label }: { enabled: boolean; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs whitespace-nowrap">
      <span
        aria-hidden
        className={`w-1.5 h-1.5 rounded-full ${enabled ? "bg-emerald-400" : "bg-slate-500"}`}
      />
      <span className={enabled ? "text-emerald-300" : "text-slate-400"}>{label}</span>
    </span>
  );
}

function SuccessBar({ percent, total }: { percent: number | null; total: number }) {
  if (percent === null || total === 0) {
    return <span className="text-xs text-ms-muted">—</span>;
  }
  const tone =
    percent >= 95 ? "bg-emerald-400/80"
    : percent >= 80 ? "bg-amber-400/80"
    : "bg-rose-400/80";
  return (
    <div className="flex items-center gap-2 min-w-0" title={`${total} runs`}>
      <div className="flex-1 max-w-[60px] h-1.5 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full ${tone}`} style={{ width: `${percent}%` }} />
      </div>
      <span className="text-xs text-ms-muted whitespace-nowrap tabular-nums">
        {percent.toFixed(0)}%
      </span>
    </div>
  );
}

function DemoMenuItem({
  label,
  tone = "default",
}: {
  label: string;
  tone?: "default" | "danger";
}) {
  const { t } = useTranslation();
  return (
    <div
      role="menuitem"
      aria-disabled
      title={t("automation.menu.demoOnly")}
      className={
        "px-3 py-2 text-sm cursor-not-allowed flex items-center justify-between gap-3 " +
        (tone === "danger" ? "text-rose-300/60" : "text-ms-muted")
      }
    >
      <span>{label}</span>
      <span className="text-[9px] uppercase tracking-wider text-ms-muted/70 px-1.5 py-0.5 rounded border border-ms-line/60">
        {t("automation.menu.demoOnly")}
      </span>
    </div>
  );
}

function ActionsMenu({ enabled }: { enabled: boolean }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const escHandler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    document.addEventListener("keydown", escHandler);
    return () => {
      document.removeEventListener("mousedown", handler);
      document.removeEventListener("keydown", escHandler);
    };
  }, [open]);

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
        title={t("automation.menu.more")}
        aria-haspopup="menu"
        aria-expanded={open}
        className="h-8 w-8 rounded-md text-ms-muted hover:text-white hover:bg-white/5 transition-colors flex items-center justify-center"
      >
        <span aria-hidden className="text-base leading-none">⋯</span>
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-1 z-30 min-w-[200px] rounded-md border border-ms-line bg-[#0e1730] shadow-xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          <DemoMenuItem label={t("automation.menu.edit")} />
          <DemoMenuItem
            label={enabled ? t("automation.menu.disable") : t("automation.menu.enable")}
          />
          <DemoMenuItem label={t("automation.menu.duplicate")} />
          <div className="border-t border-ms-line/60" />
          <DemoMenuItem label={t("automation.menu.delete")} tone="danger" />
        </div>
      )}
    </div>
  );
}

// ----------------------------------------------------------------------
// Main page
// ----------------------------------------------------------------------
export function AutomationPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const wfQ = useQuery({ queryKey: ["workflows"], queryFn: Automation.listWorkflows });
  const runsQ = useQuery({ queryKey: ["runs"], queryFn: Automation.listRuns });

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "enabled" | "disabled">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const run = useMutation({
    mutationFn: (id: number) =>
      Automation.runWorkflow(id, { account_name: "Manual demo trigger", amount: 100_000 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // ---- friendly label resolvers (with raw-name fallback) ----
  const eventLabel = (raw?: string | null) =>
    t(`automation.events.${eventLookupKey(raw)}`, { defaultValue: raw ?? "manual" });
  const actionLabel = (type: string) =>
    t(`automation.action_types.${type}`, { defaultValue: type });
  const pathLabel = (path: string) =>
    t(`automation.paths.${path}`, { defaultValue: path });
  const opLabel = (op: string) => {
    const slug = OP_SLUG[op];
    return slug ? t(`automation.ops.${slug}`, { defaultValue: op }) : op;
  };
  const workflowMeta = (name: string, fallbackDescription?: string | null) => {
    const slug = SEED_SLUGS[name];
    if (!slug) return { title: name, description: fallbackDescription ?? "" };
    return {
      title: t(`automation.workflows.${slug}.title`, { defaultValue: name }),
      description: t(`automation.workflows.${slug}.description`, {
        defaultValue: fallbackDescription ?? "",
      }),
    };
  };

  // ---- runs aggregation ----
  const runsByWorkflow = useMemo(() => {
    const map = new Map<number, WorkflowRun[]>();
    for (const r of runsQ.data ?? []) {
      const arr = map.get(r.workflow_id) ?? [];
      arr.push(r);
      map.set(r.workflow_id, arr);
    }
    map.forEach((arr) => arr.sort((a, b) => b.started_at.localeCompare(a.started_at)));
    return map;
  }, [runsQ.data]);

  const successRateFor = (wfId: number): { percent: number | null; total: number } => {
    const all = runsByWorkflow.get(wfId) ?? [];
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recent = all.filter((r) => new Date(r.started_at).getTime() >= cutoff);
    if (recent.length === 0) return { percent: null, total: 0 };
    const ok = recent.filter((r) => r.status === "succeeded").length;
    return { percent: (ok / recent.length) * 100, total: recent.length };
  };

  // ---- filtered list ----
  const filtered = useMemo(() => {
    const all = wfQ.data ?? [];
    const q = search.trim().toLowerCase();
    return all.filter((w) => {
      if (statusFilter === "enabled" && !w.enabled) return false;
      if (statusFilter === "disabled" && w.enabled) return false;
      if (!q) return true;
      const meta = workflowMeta(w.name, w.description);
      const hay =
        `${meta.title} ${w.name} ${meta.description} ${w.description ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
    // workflowMeta closes over t/i18n; recompute when language changes via that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wfQ.data, search, statusFilter, t]);

  const toggleExpand = (id: number) =>
    setExpandedId((prev) => (prev === id ? null : id));

  if (wfQ.isLoading || runsQ.isLoading) return <LoadingState />;
  if (wfQ.isError) return <ErrorState error={wfQ.error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("automation.title")}</h1>
        <p className="text-sm text-ms-muted">{t("automation.subtitle")}</p>
      </div>

      <TipsBar />

      <Card>
        <CardHeader title={t("automation.definitions.title")} />

        {/* Toolbar: search + status filter + new workflow */}
        <div className="px-5 py-3 border-b border-ms-line flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap min-w-0 flex-1">
            <div className="relative">
              <span
                aria-hidden
                className="absolute left-3 top-1/2 -translate-y-1/2 text-ms-muted text-xs"
              >
                ⌕
              </span>
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t("automation.toolbar.searchPlaceholder")}
                className="bg-white/5 border border-ms-line rounded-md pl-8 pr-3 py-1.5 text-sm w-64 max-w-full focus:outline-none focus:border-ms-blue/60"
              />
            </div>
            <div className="flex items-center gap-2 text-xs text-ms-muted">
              <span>{t("automation.toolbar.statusFilter")}:</span>
              <select
                value={statusFilter}
                onChange={(e) =>
                  setStatusFilter(e.target.value as "all" | "enabled" | "disabled")
                }
                className="bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-sm text-ms-text focus:outline-none focus:border-ms-blue/60"
              >
                <option value="all">{t("automation.toolbar.statusAll")}</option>
                <option value="enabled">{t("automation.toolbar.statusEnabled")}</option>
                <option value="disabled">{t("automation.toolbar.statusDisabled")}</option>
              </select>
            </div>
          </div>
          <Button
            variant="primary"
            onClick={() => setNewOpen(true)}
            className="shrink-0"
          >
            + {t("automation.toolbar.newWorkflow")}
          </Button>
        </div>

        {/* Table */}
        <CardBody className="p-0">
          <div className="overflow-x-auto scrollbar-soft">
            <table className="w-full text-sm table-fixed min-w-[1080px]">
              <colgroup>
                <col style={{ width: "40px" }} />
                <col style={{ width: "28%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "12%" }} />
                <col style={{ width: "14%" }} />
                <col style={{ width: "16%" }} />
                <col style={{ width: "14%" }} />
              </colgroup>
              <thead className="text-xs text-ms-muted uppercase tracking-wider">
                <tr>
                  <th className="sticky top-0 z-10 bg-[#0e1730] border-b border-ms-line px-2 py-2 text-left">
                    <span className="sr-only">{t("automation.table.expand")}</span>
                  </th>
                  <th className="sticky top-0 z-10 bg-[#0e1730] border-b border-ms-line px-4 py-2 text-left font-medium whitespace-nowrap">
                    {t("automation.definitions.name")}
                  </th>
                  <th className="sticky top-0 z-10 bg-[#0e1730] border-b border-ms-line px-4 py-2 text-left font-medium whitespace-nowrap">
                    {t("automation.definitions.trigger")}
                  </th>
                  <th className="sticky top-0 z-10 bg-[#0e1730] border-b border-ms-line px-4 py-2 text-left font-medium whitespace-nowrap">
                    {t("automation.definitions.enabled")}
                  </th>
                  <th className="sticky top-0 z-10 bg-[#0e1730] border-b border-ms-line px-4 py-2 text-left font-medium whitespace-nowrap">
                    {t("automation.table.lastRun")}
                  </th>
                  <th className="sticky top-0 z-10 bg-[#0e1730] border-b border-ms-line px-4 py-2 text-left font-medium whitespace-nowrap">
                    {t("automation.table.successRate")}
                  </th>
                  <th className="sticky top-0 z-10 bg-[#0e1730] border-b border-ms-line px-4 py-2 text-right font-medium whitespace-nowrap">
                    {t("automation.table.actionsCol")}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-4 py-12 text-center text-ms-muted text-sm">
                      {t("automation.table.noResults")}
                    </td>
                  </tr>
                )}
                {filtered.map((w) => {
                  const meta = workflowMeta(w.name, w.description);
                  const triggerName = w.trigger?.event ?? w.trigger?.type ?? "manual";
                  const wfRuns = runsByWorkflow.get(w.id) ?? [];
                  const last = wfRuns[0];
                  const success = successRateFor(w.id);
                  const isExpanded = expandedId === w.id;

                  return (
                    <FragmentRow
                      key={w.id}
                      w={w}
                      meta={meta}
                      triggerName={triggerName}
                      isExpanded={isExpanded}
                      onToggle={() => toggleExpand(w.id)}
                      onRun={() => run.mutate(w.id)}
                      isRunning={run.isPending && run.variables === w.id}
                      lastRun={last}
                      success={success}
                      labelOf={labelOf}
                      eventLabel={eventLabel}
                      actionLabel={actionLabel}
                      pathLabel={pathLabel}
                      opLabel={opLabel}
                      wfRuns={wfRuns}
                      neverLabel={t("automation.table.never")}
                      enabledLabel={labelOf("enabled")}
                      disabledLabel={labelOf("disabled")}
                    />
                  );
                })}
              </tbody>
            </table>
          </div>
        </CardBody>
      </Card>

      {/* ----- Recent runs (kept as-is per spec) ----- */}
      <Card>
        <div id="recent-runs" />
        <CardHeader
          title={t("automation.runs.title")}
          subtitle={t("automation.runs.subtitle")}
        />
        <CardBody className="space-y-3">
          {(runsQ.data ?? []).length === 0 && (
            <div className="text-sm text-ms-muted">{t("automation.runs.empty")}</div>
          )}
          {(runsQ.data ?? []).map((r) => (
            <div key={r.id} className="border border-ms-line rounded-md">
              <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 bg-white/[0.02]">
                <div className="flex flex-wrap items-center gap-3 min-w-0">
                  <Badge tone={statusTone(r.status)}>{labelOf(r.status)}</Badge>
                  <div className="font-medium text-sm whitespace-nowrap">
                    {t("automation.runs.runHeader", { id: r.id, wfId: r.workflow_id })}
                  </div>
                  <div className="text-xs text-ms-muted whitespace-nowrap">
                    {t("automation.runs.triggerLine", { by: r.triggered_by })}
                  </div>
                </div>
                <div className="text-xs text-ms-muted whitespace-nowrap">
                  {formatDate(r.started_at)} →{" "}
                  {r.finished_at ? formatDate(r.finished_at) : t("automation.runs.runningLabel")}
                </div>
              </div>
              <ol className="divide-y divide-ms-line/60">
                {r.action_logs.map((log) => (
                  <li key={log.id} className="px-4 py-2 flex items-start gap-3">
                    <div className="h-6 w-6 shrink-0 rounded-full bg-ms-blue/20 border border-ms-blue/30 flex items-center justify-center text-xs">
                      {log.sequence}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium break-words">
                        {actionLabel(log.action_type)}
                        <code className="ml-2 text-[11px] text-ms-muted bg-white/5 rounded px-1.5 py-0.5 break-all">
                          {log.action_type}
                        </code>
                      </div>
                      {log.message && (
                        <div className="text-xs text-ms-muted break-words">{log.message}</div>
                      )}
                      {log.output && (
                        <pre className="text-[11px] text-ms-muted bg-black/20 rounded mt-1 p-2 overflow-x-auto scrollbar-soft">
                          {JSON.stringify(log.output, null, 2)}
                        </pre>
                      )}
                    </div>
                    <Badge
                      tone={
                        log.status === "ok"
                          ? "success"
                          : log.status === "skipped"
                          ? "neutral"
                          : "danger"
                      }
                    >
                      {labelOf(log.status)}
                    </Badge>
                  </li>
                ))}
                {r.error_message && (
                  <li className="px-4 py-2 text-sm text-rose-300">
                    {t("automation.runs.error", { message: r.error_message })}
                  </li>
                )}
              </ol>
            </div>
          ))}
        </CardBody>
      </Card>

      <NewWorkflowDialog
        open={newOpen}
        onClose={() => setNewOpen(false)}
        onCreated={() => qc.invalidateQueries({ queryKey: ["workflows"] })}
      />
    </div>
  );
}

// ----------------------------------------------------------------------
// New Workflow dialog
// ----------------------------------------------------------------------
interface DraftCondition {
  path: string;
  op: string;
  value: string;
}
interface DraftAction {
  type: string;
}

function NewWorkflowDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [trigger, setTrigger] = useState<string>("opportunity.won");
  const [enabled, setEnabled] = useState(true);
  const [conditions, setConditions] = useState<DraftCondition[]>([]);
  const [actions, setActions] = useState<DraftAction[]>([{ type: "send_notification" }]);
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () => {
      // Coerce condition values: try number, fall back to string.
      const conds = conditions.map((c) => {
        let value: unknown = c.value;
        const asNum = Number(c.value);
        if (c.value !== "" && !Number.isNaN(asNum)) value = asNum;
        return { path: c.path, op: c.op, value };
      });
      return Automation.createWorkflow({
        name: name.trim(),
        description: description.trim() || null,
        trigger:
          trigger === "manual"
            ? { type: "manual" }
            : { type: "event", event: trigger },
        conditions: conds,
        actions: actions.map((a) => ({
          type: a.type,
          params: ACTION_DEFAULTS[a.type] ?? {},
        })),
        enabled,
      });
    },
    onSuccess: () => {
      onCreated();
      // reset
      setName("");
      setDescription("");
      setTrigger("opportunity.won");
      setEnabled(true);
      setConditions([]);
      setActions([{ type: "send_notification" }]);
      setError(null);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("automation.newWorkflowDialog.validationName"));
      return;
    }
    if (actions.length === 0) {
      setError(t("automation.newWorkflowDialog.validationActions"));
      return;
    }
    setError(null);
    create.mutate();
  };

  const moveAction = (idx: number, dir: -1 | 1) => {
    setActions((prev) => {
      const next = [...prev];
      const target = idx + dir;
      if (target < 0 || target >= next.length) return prev;
      [next[idx], next[target]] = [next[target], next[idx]];
      return next;
    });
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("automation.newWorkflowDialog.title")}
      subtitle={t("automation.newWorkflowDialog.subtitle")}
      width="max-w-2xl"
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            {t("common.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={create.isPending}
            type="button"
          >
            {create.isPending ? "…" : t("automation.toolbar.newWorkflow")}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <WfField label={t("automation.newWorkflowDialog.fieldName")}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("automation.newWorkflowDialog.fieldNamePh")}
            className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
          />
        </WfField>
        <WfField label={t("automation.newWorkflowDialog.fieldDescription")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("automation.newWorkflowDialog.fieldDescriptionPh")}
            rows={2}
            className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60 resize-none"
          />
        </WfField>
        <WfField label={t("automation.newWorkflowDialog.fieldTrigger")}>
          <select
            value={trigger}
            onChange={(e) => setTrigger(e.target.value)}
            className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
          >
            {TRIGGER_EVENTS.map((ev) => {
              const label =
                ev === "manual"
                  ? t("automation.events.manual")
                  : t(`automation.events.${ev.replace(/\./g, "_")}` as const, {
                      defaultValue: ev,
                    });
              return (
                <option key={ev} value={ev}>
                  {label} — {ev}
                </option>
              );
            })}
          </select>
        </WfField>

        {/* Conditions */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-ms-muted">
              {t("automation.newWorkflowDialog.sectionConditions")}
            </span>
            <button
              type="button"
              onClick={() =>
                setConditions((p) => [...p, { path: "amount", op: ">=", value: "0" }])
              }
              className="text-xs text-ms-blue hover:underline"
            >
              {t("automation.newWorkflowDialog.addCondition")}
            </button>
          </div>
          <p className="text-[11px] text-ms-muted mb-2">
            {t("automation.newWorkflowDialog.sectionConditionsHint")}
          </p>
          {conditions.length === 0 ? (
            <div className="text-xs text-ms-muted italic px-3 py-2 border border-dashed border-ms-line rounded">
              —
            </div>
          ) : (
            <ul className="space-y-2">
              {conditions.map((c, i) => (
                <li key={i} className="flex items-center gap-2">
                  <input
                    value={c.path}
                    onChange={(e) =>
                      setConditions((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, path: e.target.value } : x)),
                      )
                    }
                    placeholder={t("automation.newWorkflowDialog.conditionPathPh")}
                    className="flex-1 bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-ms-blue/60"
                  />
                  <select
                    value={c.op}
                    onChange={(e) =>
                      setConditions((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, op: e.target.value } : x)),
                      )
                    }
                    className="bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs"
                  >
                    {CONDITION_OPS.map((op) => (
                      <option key={op} value={op}>
                        {op}
                      </option>
                    ))}
                  </select>
                  <input
                    value={c.value}
                    onChange={(e) =>
                      setConditions((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)),
                      )
                    }
                    placeholder={t("automation.newWorkflowDialog.conditionValuePh")}
                    className="w-32 bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs font-mono focus:outline-none focus:border-ms-blue/60"
                  />
                  <button
                    type="button"
                    onClick={() => setConditions((prev) => prev.filter((_, j) => j !== i))}
                    title={t("automation.newWorkflowDialog.removeRow")}
                    className="text-ms-muted hover:text-rose-300 px-2"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Actions */}
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-ms-muted">
              {t("automation.newWorkflowDialog.sectionActions")}
            </span>
            <button
              type="button"
              onClick={() => setActions((p) => [...p, { type: "send_notification" }])}
              className="text-xs text-ms-blue hover:underline"
            >
              {t("automation.newWorkflowDialog.addAction")}
            </button>
          </div>
          <p className="text-[11px] text-ms-muted mb-2">
            {t("automation.newWorkflowDialog.sectionActionsHint")}
          </p>
          {actions.length === 0 ? (
            <div className="text-xs text-rose-300 italic px-3 py-2 border border-dashed border-rose-500/40 rounded">
              {t("automation.newWorkflowDialog.validationActions")}
            </div>
          ) : (
            <ol className="space-y-2">
              {actions.map((a, i) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-xs text-ms-muted w-5 tabular-nums">{i + 1}.</span>
                  <select
                    value={a.type}
                    onChange={(e) =>
                      setActions((prev) =>
                        prev.map((x, j) => (j === i ? { ...x, type: e.target.value } : x)),
                      )
                    }
                    className="flex-1 bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs focus:outline-none focus:border-ms-blue/60"
                  >
                    {ACTION_TYPES.map((tp) => (
                      <option key={tp} value={tp}>
                        {t(`automation.action_types.${tp}` as const, { defaultValue: tp })} ·{" "}
                        {tp}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={i === 0}
                    onClick={() => moveAction(i, -1)}
                    title={t("automation.newWorkflowDialog.moveUp")}
                    className="text-ms-muted hover:text-white px-1.5 disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    disabled={i === actions.length - 1}
                    onClick={() => moveAction(i, 1)}
                    title={t("automation.newWorkflowDialog.moveDown")}
                    className="text-ms-muted hover:text-white px-1.5 disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setActions((prev) => prev.filter((_, j) => j !== i))}
                    title={t("automation.newWorkflowDialog.removeRow")}
                    className="text-ms-muted hover:text-rose-300 px-2"
                  >
                    ✕
                  </button>
                </li>
              ))}
            </ol>
          )}
        </div>

        <label className="flex items-center gap-2 text-xs text-ms-muted">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="accent-ms-blue"
          />
          {t("automation.newWorkflowDialog.fieldEnabled")}
        </label>

        {error && (
          <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

function WfField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-ms-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

// ----------------------------------------------------------------------
// One row + (always-rendered) accordion detail row underneath.
// Extracted to keep the main render readable.
// ----------------------------------------------------------------------
function FragmentRow(props: {
  w: WorkflowDefinition;
  meta: { title: string; description: string };
  triggerName: string;
  isExpanded: boolean;
  onToggle: () => void;
  onRun: () => void;
  isRunning: boolean;
  lastRun: WorkflowRun | undefined;
  success: { percent: number | null; total: number };
  wfRuns: WorkflowRun[];
  labelOf: (key: string) => string;
  eventLabel: (s?: string | null) => string;
  actionLabel: (s: string) => string;
  pathLabel: (s: string) => string;
  opLabel: (s: string) => string;
  neverLabel: string;
  enabledLabel: string;
  disabledLabel: string;
}) {
  const {
    w, meta, triggerName, isExpanded, onToggle, onRun, isRunning,
    lastRun, success, wfRuns,
    labelOf, eventLabel, actionLabel, pathLabel, opLabel,
    neverLabel, enabledLabel, disabledLabel,
  } = props;
  const { t } = useTranslation();

  return (
    <>
      <tr
        onClick={onToggle}
        className={
          "h-14 border-b border-ms-line/60 transition-colors cursor-pointer " +
          (isExpanded ? "bg-ms-blue/[0.06]" : "hover:bg-white/[0.03]")
        }
      >
        <td className="px-2 align-middle">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="h-8 w-8 rounded-md flex items-center justify-center text-ms-muted hover:text-white hover:bg-white/5 transition-colors"
            aria-expanded={isExpanded}
            title={
              isExpanded
                ? t("automation.table.collapse")
                : t("automation.table.expand")
            }
          >
            <span
              aria-hidden
              className={`text-xs transition-transform duration-150 ${isExpanded ? "rotate-90" : ""}`}
            >
              ▶
            </span>
          </button>
        </td>
        <td className="px-4 align-middle">
          <div className="font-medium truncate" title={meta.title}>
            {meta.title}
          </div>
          {meta.description && (
            <div className="text-xs text-ms-muted truncate" title={meta.description}>
              {meta.description}
            </div>
          )}
        </td>
        <td className="px-4 align-middle">
          <code className="text-[11px] bg-white/5 rounded px-1.5 py-0.5 inline-block max-w-full truncate">
            {triggerName}
          </code>
        </td>
        <td className="px-4 align-middle">
          <StatusPill enabled={w.enabled} label={w.enabled ? enabledLabel : disabledLabel} />
        </td>
        <td className="px-4 align-middle text-xs text-ms-muted">
          {lastRun ? (
            <span title={formatDate(lastRun.started_at)}>
              {formatRelative(lastRun.started_at)}
            </span>
          ) : (
            <span className="italic">{neverLabel}</span>
          )}
        </td>
        <td className="px-4 align-middle">
          <SuccessBar percent={success.percent} total={success.total} />
        </td>
        <td className="px-4 align-middle text-right" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-end gap-1">
            <Button
              variant="primary"
              className="min-w-[96px]"
              onClick={onRun}
              disabled={isRunning}
            >
              {t("automation.definitions.run")}
            </Button>
            <ActionsMenu enabled={w.enabled} />
          </div>
        </td>
      </tr>

      {/* Always-rendered detail row that animates open/closed via grid-rows */}
      <tr className="border-b border-ms-line/60">
        <td colSpan={7} className="p-0">
          <div
            className="grid transition-all duration-200 ease-out"
            style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <ExpandedDetail
                w={w}
                triggerName={triggerName}
                wfRuns={wfRuns}
                labelOf={labelOf}
                eventLabel={eventLabel}
                actionLabel={actionLabel}
                pathLabel={pathLabel}
                opLabel={opLabel}
              />
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}

function ExpandedDetail({
  w,
  triggerName,
  wfRuns,
  labelOf,
  eventLabel,
  actionLabel,
  pathLabel,
  opLabel,
}: {
  w: WorkflowDefinition;
  triggerName: string;
  wfRuns: WorkflowRun[];
  labelOf: (key: string) => string;
  eventLabel: (s?: string | null) => string;
  actionLabel: (s: string) => string;
  pathLabel: (s: string) => string;
  opLabel: (s: string) => string;
}) {
  const { t } = useTranslation();
  const last5 = wfRuns.slice(0, 5);
  const hasConditions = (w.conditions ?? []).length > 0;

  return (
    <div className="px-6 py-5 bg-white/[0.02] border-t border-ms-line/40 grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* --- LEFT: trigger / conditions / actions --- */}
      <div className="space-y-4 text-sm">
        <div>
          <div className="text-xs uppercase tracking-wider text-ms-muted mb-1">
            {t("automation.expanded.trigger")}
          </div>
          <div>
            {eventLabel(triggerName)}
            <code className="ml-2 text-[11px] text-ms-muted bg-white/5 rounded px-1.5 py-0.5 break-all">
              {triggerName}
            </code>
          </div>
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-ms-muted mb-1">
            {t("automation.expanded.conditions")}
          </div>
          {hasConditions ? (
            <ul className="space-y-0.5">
              {(w.conditions ?? []).map((c, i) => (
                <li key={i} className="break-words">
                  <span className="font-medium">{pathLabel(c.path)}</span>{" "}
                  <span className="text-ms-muted">{opLabel(c.op ?? "==")}</span>{" "}
                  <span className="font-mono">{String(c.value)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <span className="text-xs text-ms-muted">
              {t("automation.expanded.no_condition")}
            </span>
          )}
        </div>
        <div>
          <div className="text-xs uppercase tracking-wider text-ms-muted mb-1">
            {t("automation.expanded.actions")}
          </div>
          <ol className="space-y-1">
            {w.actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 break-words">
                <span className="text-xs text-ms-muted pt-0.5 shrink-0">{i + 1}.</span>
                <span>
                  {actionLabel(a.type)}
                  <code className="ml-2 text-[11px] text-ms-muted bg-white/5 rounded px-1.5 py-0.5 break-all">
                    {a.type}
                  </code>
                </span>
              </li>
            ))}
          </ol>
        </div>
      </div>

      {/* --- RIGHT: last 5 runs mini timeline --- */}
      <div>
        <div className="text-xs uppercase tracking-wider text-ms-muted mb-2">
          {t("automation.expanded.recentRuns")}
        </div>
        {last5.length === 0 ? (
          <div className="text-xs text-ms-muted italic">
            {t("automation.expanded.noRuns")}
          </div>
        ) : (
          <ul className="space-y-1.5">
            {last5.map((r) => {
              const ok = r.status === "succeeded";
              const failed = r.status === "failed";
              const icon = ok ? "✓" : failed ? "✕" : "•";
              const iconColor = ok
                ? "text-emerald-400"
                : failed
                ? "text-rose-400"
                : "text-amber-400";
              const ms =
                r.finished_at
                  ? new Date(r.finished_at).getTime() - new Date(r.started_at).getTime()
                  : null;
              return (
                <li
                  key={r.id}
                  className="flex items-center gap-2 text-xs border border-ms-line/60 rounded px-2 py-1.5"
                >
                  <span className={`${iconColor} font-bold w-4 text-center`}>{icon}</span>
                  <Badge tone={statusToneCompat(r.status)}>{labelOf(r.status)}</Badge>
                  <span
                    className="text-ms-muted truncate flex-1"
                    title={formatDate(r.started_at)}
                  >
                    {formatRelative(r.started_at)}
                  </span>
                  {ms !== null && (
                    <span className="text-ms-muted tabular-nums whitespace-nowrap">
                      {t("automation.expanded.runDuration", { ms })}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-3">
          <a
            href="#recent-runs"
            onClick={(e) => {
              e.preventDefault();
              document
                .getElementById("recent-runs")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
            className="text-xs text-ms-blue hover:underline"
          >
            {t("automation.expanded.viewFullHistory")}
          </a>
        </div>
      </div>
    </div>
  );
}

// Local re-import of statusTone to avoid an extra named import in ExpandedDetail.
function statusToneCompat(status: string) {
  return statusTone(status);
}
