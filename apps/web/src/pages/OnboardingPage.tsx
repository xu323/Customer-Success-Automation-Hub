import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Onboarding } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, riskTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatDate } from "@/lib/format";

export function OnboardingPage() {
  const qc = useQueryClient();
  const projectsQ = useQuery({ queryKey: ["onboarding"], queryFn: Onboarding.listProjects });
  const risksQ = useQuery({ queryKey: ["risks"], queryFn: Onboarding.listRisks });

  const completeTask = useMutation({
    mutationFn: ({ projectId, taskId }: { projectId: number; taskId: number }) =>
      Onboarding.completeTask(projectId, taskId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      qc.invalidateQueries({ queryKey: ["risks"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (projectsQ.isLoading) return <LoadingState />;
  if (projectsQ.isError) return <ErrorState error={projectsQ.error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Customer Onboarding</h1>
        <p className="text-sm text-ms-muted">
          Lead 成交後啟動的客戶導入專案：包含任務時間軸、健康分數與風險警示。
        </p>
      </div>

      <Card>
        <CardHeader title="Open risk alerts" subtitle="當任務逾期或健康分數下降時自動產生" />
        <CardBody>
          {(risksQ.data ?? []).length === 0 ? (
            <div className="text-sm text-ms-muted">目前沒有風險警示。</div>
          ) : (
            <ul className="space-y-2">
              {risksQ.data!.map((r) => (
                <li key={r.id} className="flex items-start gap-3 border border-ms-line rounded-md px-3 py-2">
                  <Badge tone={riskTone(r.level)} className="capitalize">{r.level}</Badge>
                  <div>
                    <div className="font-medium text-sm">{r.title}</div>
                    {r.description && <div className="text-xs text-ms-muted mt-0.5">{r.description}</div>}
                    <div className="text-xs text-ms-muted">{formatDate(r.created_at)}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-6">
        {(projectsQ.data ?? []).map((p) => (
          <Card key={p.id}>
            <CardHeader
              title={p.project_name}
              subtitle={`Owner: ${p.owner ?? "—"} · Target go-live: ${formatDate(p.target_go_live)}`}
              action={
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(p.status)}>{p.status}</Badge>
                  <Badge tone={p.health_score >= 80 ? "success" : p.health_score >= 60 ? "warning" : "danger"}>
                    Health {p.health_score.toFixed(0)}
                  </Badge>
                </div>
              }
            />
            <CardBody>
              <div className="space-y-2">
                {p.tasks.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between border border-ms-line rounded-md px-3 py-2 bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ms-muted w-6 text-right">#{t.sequence}</span>
                      <div>
                        <div className="font-medium text-sm">{t.title}</div>
                        <div className="text-xs text-ms-muted">Due: {formatDate(t.due_date)}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(t.status)}>{t.status.replace("_", " ")}</Badge>
                      {t.status !== "done" && (
                        <Button
                          variant="ghost"
                          onClick={() => completeTask.mutate({ projectId: p.id, taskId: t.id })}
                          disabled={completeTask.isPending}
                        >
                          Mark complete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {p.tasks.length === 0 && <div className="text-sm text-ms-muted">沒有任務。</div>}
              </div>
            </CardBody>
          </Card>
        ))}
        {(projectsQ.data ?? []).length === 0 && (
          <Card>
            <CardBody>
              <div className="text-sm text-ms-muted">
                尚未有 onboarding 專案。試試在 CRM 頁把任一 opportunity「Mark won」自動建立。
              </div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
