import { useEffect, useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { AI } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import type { AIResponse } from "@/types";

function ResultCard({ result }: { result?: AIResponse }) {
  const { t } = useTranslation();
  if (!result) return null;
  return (
    <div className="border border-ms-line rounded-md bg-white/[0.02] p-4 mt-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{result.title}</div>
        <Badge tone="info">
          {t("ai.confidence", { value: (result.confidence * 100).toFixed(0) })}
        </Badge>
      </div>
      <p className="text-sm text-ms-muted mt-2">{result.summary}</p>
      {result.bullet_points.length > 0 && (
        <ul className="list-disc list-inside text-sm mt-3 space-y-1">
          {result.bullet_points.map((b, i) => (
            <li key={i}>{b}</li>
          ))}
        </ul>
      )}
      {result.suggested_tasks.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase text-ms-muted mb-1">{t("ai.suggestedTasks")}</div>
          <div className="flex flex-wrap gap-2">
            {result.suggested_tasks.map((s, i) => (
              <Badge key={i} tone="violet">
                {s}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AIPage() {
  const { t, i18n } = useTranslation();
  const [accountId, setAccountId] = useState("1");
  const [projectId, setProjectId] = useState("1");
  const [notes, setNotes] = useState(t("ai.notes.defaultNotes"));

  // Refresh default notes when language changes (only if user hasn't typed something custom).
  useEffect(() => {
    setNotes((current) => {
      const seeds = ["zh-TW", "en", "ja"].map((lng) =>
        i18n.getFixedT(lng)("ai.notes.defaultNotes"),
      );
      return seeds.includes(current) ? t("ai.notes.defaultNotes") : current;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language]);

  const summary = useMutation({ mutationFn: (id: number) => AI.customerSummary(id) });
  const nextBest = useMutation({ mutationFn: (id: number) => AI.nextBestAction(id) });
  const meeting = useMutation({ mutationFn: () => AI.meetingNotesToTasks(notes) });
  const risk = useMutation({ mutationFn: (id: number) => AI.riskExplanation(id) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("ai.title")}</h1>
        <p className="text-sm text-ms-muted">{t("ai.subtitle")}</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title={t("ai.summary.title")} subtitle={t("ai.summary.subtitle")} />
          <CardBody>
            <div className="flex items-center gap-2">
              <input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={t("ai.placeholders.accountId")}
                className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm w-32"
              />
              <Button
                variant="primary"
                onClick={() => summary.mutate(Number(accountId))}
                disabled={summary.isPending}
              >
                {t("ai.summary.btn")}
              </Button>
            </div>
            <ResultCard result={summary.data} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("ai.nbAction.title")} subtitle={t("ai.nbAction.subtitle")} />
          <CardBody>
            <div className="flex items-center gap-2">
              <input
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                placeholder={t("ai.placeholders.accountId")}
                className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm w-32"
              />
              <Button
                variant="primary"
                onClick={() => nextBest.mutate(Number(accountId))}
                disabled={nextBest.isPending}
              >
                {t("ai.nbAction.btn")}
              </Button>
            </div>
            <ResultCard result={nextBest.data} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("ai.notes.title")} subtitle={t("ai.notes.subtitle")} />
          <CardBody>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm font-mono"
            />
            <div className="mt-2">
              <Button variant="primary" onClick={() => meeting.mutate()} disabled={meeting.isPending}>
                {t("ai.notes.btn")}
              </Button>
            </div>
            <ResultCard result={meeting.data} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("ai.risk.title")} subtitle={t("ai.risk.subtitle")} />
          <CardBody>
            <div className="flex items-center gap-2">
              <input
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                placeholder={t("ai.placeholders.projectId")}
                className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm w-32"
              />
              <Button
                variant="primary"
                onClick={() => risk.mutate(Number(projectId))}
                disabled={risk.isPending}
              >
                {t("ai.risk.btn")}
              </Button>
            </div>
            <ResultCard result={risk.data} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
