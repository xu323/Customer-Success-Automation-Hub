import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Automation } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatDate } from "@/lib/format";

// Map the seed workflow names (which live in the DB and are in English) onto
// short slug keys we can safely use as i18n lookup paths. Anything not in this
// map falls back to whatever the API returned.
const SEED_SLUGS: Record<string, string> = {
  "Won opportunity -> Onboarding project": "wonOpportunity",
  "Approved BPM request -> Business Central": "approvedBpm",
  "Onboarding overdue -> Risk alert + Ticket": "onboardingOverdue",
};

// Operators come from the workflow_engine: ==, !=, >, >=, <, <=, in, contains,
// exists. We can't put dot/symbol-heavy strings as i18n keys directly, so we
// translate them through a stable slug.
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

export function AutomationPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const wfQ = useQuery({ queryKey: ["workflows"], queryFn: Automation.listWorkflows });
  const runsQ = useQuery({ queryKey: ["runs"], queryFn: Automation.listRuns });

  const run = useMutation({
    mutationFn: (id: number) => Automation.runWorkflow(id, { account_name: "Manual demo trigger", amount: 100_000 }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["runs"] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  // ----- friendly label resolvers (with raw-name fallback) ----------------
  const eventLabel = (raw?: string | null) => {
    if (!raw) return t("automation.events.manual");
    const key = `automation.events.${raw.replace(/\./g, "_")}`;
    return t(key, { defaultValue: raw });
  };
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

  if (wfQ.isLoading || runsQ.isLoading) return <LoadingState />;
  if (wfQ.isError) return <ErrorState error={wfQ.error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("automation.title")}</h1>
        <p className="text-sm text-ms-muted">{t("automation.subtitle")}</p>
      </div>

      {/* "How to read this page" — banner-style help so first-time visitors
          aren't dropped straight into trigger / condition / action jargon. */}
      <div className="rounded-lg border border-ms-blue/30 bg-ms-blue/[0.08] px-4 py-3 text-sm">
        <div className="font-semibold text-ms-text mb-1">
          {t("automation.intro.title")}
        </div>
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

      <Card>
        <CardHeader title={t("automation.definitions.title")} />
        <CardBody className="space-y-3">
          {(wfQ.data ?? []).map((w) => {
            const meta = workflowMeta(w.name, w.description);
            const triggerName = w.trigger?.event ?? w.trigger?.type ?? "manual";
            const hasConditions = (w.conditions ?? []).length > 0;
            return (
              <div
                key={w.id}
                className="border border-ms-line rounded-lg p-4 bg-white/[0.02]"
              >
                <div className="flex items-start justify-between gap-3 mb-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-base break-words">
                        {meta.title}
                      </h3>
                      <Badge tone={w.enabled ? "success" : "neutral"}>
                        {w.enabled ? labelOf("enabled") : labelOf("disabled")}
                      </Badge>
                    </div>
                    {meta.description && (
                      <p className="text-xs text-ms-muted mt-1 break-words">
                        {meta.description}
                      </p>
                    )}
                  </div>
                  <Button
                    variant="primary"
                    className="min-w-[96px] shrink-0"
                    onClick={() => run.mutate(w.id)}
                    disabled={run.isPending}
                  >
                    {t("automation.definitions.run")}
                  </Button>
                </div>

                <dl className="grid grid-cols-[max-content_1fr] gap-x-3 gap-y-2 text-sm">
                  {/* Trigger */}
                  <dt className="text-ms-muted whitespace-nowrap pt-0.5">
                    {t("automation.card.when")}
                  </dt>
                  <dd className="break-words">
                    <span>{eventLabel(triggerName)}</span>
                    <code className="ml-2 text-[11px] text-ms-muted bg-white/5 rounded px-1.5 py-0.5 break-all">
                      {triggerName}
                    </code>
                  </dd>

                  {/* Conditions */}
                  <dt className="text-ms-muted whitespace-nowrap pt-0.5">
                    {t("automation.card.if")}
                  </dt>
                  <dd>
                    {hasConditions ? (
                      <ul className="space-y-0.5">
                        {(w.conditions ?? []).map((c, i) => (
                          <li key={i} className="break-words">
                            <span className="font-medium">{pathLabel(c.path)}</span>{" "}
                            <span className="text-ms-muted">
                              {opLabel(c.op ?? "==")}
                            </span>{" "}
                            <span className="font-mono">{String(c.value)}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <span className="text-ms-muted text-xs">
                        {t("automation.card.no_condition")}
                      </span>
                    )}
                  </dd>

                  {/* Actions */}
                  <dt className="text-ms-muted whitespace-nowrap pt-0.5">
                    {t("automation.card.do")}
                  </dt>
                  <dd>
                    <ol className="space-y-1">
                      {w.actions.map((a, i) => (
                        <li key={i} className="flex items-start gap-2 break-words">
                          <span className="text-ms-muted text-xs pt-0.5 shrink-0">
                            {i + 1}.
                          </span>
                          <span>
                            {actionLabel(a.type)}
                            <code className="ml-2 text-[11px] text-ms-muted bg-white/5 rounded px-1.5 py-0.5 break-all">
                              {a.type}
                            </code>
                          </span>
                        </li>
                      ))}
                    </ol>
                  </dd>
                </dl>
              </div>
            );
          })}
          {(wfQ.data ?? []).length === 0 && (
            <div className="text-sm text-ms-muted">{t("automation.runs.empty")}</div>
          )}
        </CardBody>
      </Card>

      <Card>
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
                        <div className="text-xs text-ms-muted break-words">
                          {log.message}
                        </div>
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
    </div>
  );
}
