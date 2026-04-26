import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Onboarding } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, riskTone, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatDate } from "@/lib/format";

export function OnboardingPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
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
        <h1 className="text-2xl font-semibold">{t("onboarding.title")}</h1>
        <p className="text-sm text-ms-muted">{t("onboarding.subtitle")}</p>
      </div>

      <Card>
        <CardHeader title={t("onboarding.risks.title")} subtitle={t("onboarding.risks.subtitle")} />
        <CardBody>
          {(risksQ.data ?? []).length === 0 ? (
            <div className="text-sm text-ms-muted">{t("onboarding.risks.empty")}</div>
          ) : (
            <ul className="space-y-2">
              {risksQ.data!.map((r) => (
                <li key={r.id} className="flex items-start gap-3 border border-ms-line rounded-md px-3 py-2">
                  <Badge tone={riskTone(r.level)}>{labelOf(r.level)}</Badge>
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
              subtitle={`${t("onboarding.project.owner")}: ${p.owner ?? "—"} · ${t("onboarding.project.target")}: ${formatDate(p.target_go_live)}`}
              action={
                <div className="flex items-center gap-2">
                  <Badge tone={statusTone(p.status)}>{labelOf(p.status)}</Badge>
                  <Badge tone={p.health_score >= 80 ? "success" : p.health_score >= 60 ? "warning" : "danger"}>
                    {t("onboarding.project.health", { value: p.health_score.toFixed(0) })}
                  </Badge>
                </div>
              }
            />
            <CardBody>
              <div className="space-y-2">
                {p.tasks.map((task) => (
                  <div
                    key={task.id}
                    className="flex items-center justify-between border border-ms-line rounded-md px-3 py-2 bg-white/[0.02]"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-ms-muted w-6 text-right">#{task.sequence}</span>
                      <div>
                        <div className="font-medium text-sm">{task.title}</div>
                        <div className="text-xs text-ms-muted">
                          {t("onboarding.project.due", { date: formatDate(task.due_date) })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge tone={statusTone(task.status)}>{labelOf(task.status)}</Badge>
                      {task.status !== "done" && (
                        <Button
                          variant="ghost"
                          onClick={() => completeTask.mutate({ projectId: p.id, taskId: task.id })}
                          disabled={completeTask.isPending}
                        >
                          {t("onboarding.project.markComplete")}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
                {p.tasks.length === 0 && (
                  <div className="text-sm text-ms-muted">{t("onboarding.project.noTasks")}</div>
                )}
              </div>
            </CardBody>
          </Card>
        ))}
        {(projectsQ.data ?? []).length === 0 && (
          <Card>
            <CardBody>
              <div className="text-sm text-ms-muted">{t("onboarding.project.empty")}</div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
