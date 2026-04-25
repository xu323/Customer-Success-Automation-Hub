import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Automation } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatDate } from "@/lib/format";

export function AutomationPage() {
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

  if (wfQ.isLoading || runsQ.isLoading) return <LoadingState />;
  if (wfQ.isError) return <ErrorState error={wfQ.error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Automation Flows</h1>
        <p className="text-sm text-ms-muted">
          Mock Power Automate engine：JSON 驅動的 trigger/condition/action workflow。
        </p>
      </div>

      <Card>
        <CardHeader title="Workflow definitions" />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Name</th>
                <th className="text-left px-4 py-2 font-medium">Trigger</th>
                <th className="text-left px-4 py-2 font-medium">Conditions</th>
                <th className="text-left px-4 py-2 font-medium">Actions</th>
                <th className="text-left px-4 py-2 font-medium">Enabled</th>
                <th className="text-right px-4 py-2 font-medium">Run</th>
              </tr>
            </thead>
            <tbody>
              {(wfQ.data ?? []).map((w) => (
                <tr key={w.id} className="border-b border-ms-line/60 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{w.name}</div>
                    {w.description && <div className="text-xs text-ms-muted mt-1">{w.description}</div>}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <code className="bg-white/5 rounded px-1.5 py-0.5">{w.trigger?.event ?? w.trigger?.type ?? "manual"}</code>
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {(w.conditions ?? []).length === 0 ? <span className="text-ms-muted">none</span> : (
                      <ul className="space-y-0.5">
                        {(w.conditions ?? []).map((c, i) => (
                          <li key={i} className="font-mono">{c.path} {c.op} {String(c.value)}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    <ul className="space-y-0.5">
                      {w.actions.map((a, i) => <li key={i} className="font-mono">{a.type}</li>)}
                    </ul>
                  </td>
                  <td className="px-4 py-3"><Badge tone={w.enabled ? "success" : "neutral"}>{w.enabled ? "enabled" : "disabled"}</Badge></td>
                  <td className="px-4 py-3 text-right">
                    <Button variant="primary" onClick={() => run.mutate(w.id)} disabled={run.isPending}>
                      Run now
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Recent runs" subtitle="按時間倒序，每筆展開可看 action timeline" />
        <CardBody className="space-y-3">
          {(runsQ.data ?? []).length === 0 && <div className="text-sm text-ms-muted">尚未執行過任何 workflow。</div>}
          {(runsQ.data ?? []).map((r) => (
            <div key={r.id} className="border border-ms-line rounded-md">
              <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02]">
                <div className="flex items-center gap-3">
                  <Badge tone={statusTone(r.status)}>{r.status}</Badge>
                  <div className="font-medium text-sm">Run #{r.id} (workflow {r.workflow_id})</div>
                  <div className="text-xs text-ms-muted">trigger: {r.triggered_by}</div>
                </div>
                <div className="text-xs text-ms-muted">
                  {formatDate(r.started_at)} → {r.finished_at ? formatDate(r.finished_at) : "running"}
                </div>
              </div>
              <ol className="divide-y divide-ms-line/60">
                {r.action_logs.map((log) => (
                  <li key={log.id} className="px-4 py-2 flex items-start gap-3">
                    <div className="h-6 w-6 rounded-full bg-ms-blue/20 border border-ms-blue/30 flex items-center justify-center text-xs">
                      {log.sequence}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium">{log.action_type}</div>
                      {log.message && <div className="text-xs text-ms-muted">{log.message}</div>}
                      {log.output && (
                        <pre className="text-[11px] text-ms-muted bg-black/20 rounded mt-1 p-2 overflow-x-auto scrollbar-soft">
                          {JSON.stringify(log.output, null, 2)}
                        </pre>
                      )}
                    </div>
                    <Badge tone={log.status === "ok" ? "success" : log.status === "skipped" ? "neutral" : "danger"}>
                      {log.status}
                    </Badge>
                  </li>
                ))}
                {r.error_message && (
                  <li className="px-4 py-2 text-sm text-rose-300">Error: {r.error_message}</li>
                )}
              </ol>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
