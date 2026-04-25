import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { AI } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Button } from "@/components/Button";
import { Badge } from "@/components/Badge";
import type { AIResponse } from "@/types";

function ResultCard({ result }: { result?: AIResponse }) {
  if (!result) return null;
  return (
    <div className="border border-ms-line rounded-md bg-white/[0.02] p-4 mt-3">
      <div className="flex items-center justify-between">
        <div className="font-semibold">{result.title}</div>
        <Badge tone="info">confidence {(result.confidence * 100).toFixed(0)}%</Badge>
      </div>
      <p className="text-sm text-ms-muted mt-2">{result.summary}</p>
      {result.bullet_points.length > 0 && (
        <ul className="list-disc list-inside text-sm mt-3 space-y-1">
          {result.bullet_points.map((b, i) => <li key={i}>{b}</li>)}
        </ul>
      )}
      {result.suggested_tasks.length > 0 && (
        <div className="mt-3">
          <div className="text-xs uppercase text-ms-muted mb-1">Suggested tasks</div>
          <div className="flex flex-wrap gap-2">
            {result.suggested_tasks.map((s, i) => (
              <Badge key={i} tone="violet">{s}</Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export function AIPage() {
  const [accountId, setAccountId] = useState("1");
  const [projectId, setProjectId] = useState("1");
  const [notes, setNotes] = useState(
    "- Follow up with Bryan on data migration timeline\n- Schedule design review next Tuesday\n- Customer wants Power Automate cost breakdown",
  );

  const summary = useMutation({ mutationFn: (id: number) => AI.customerSummary(id) });
  const nextBest = useMutation({ mutationFn: (id: number) => AI.nextBestAction(id) });
  const meeting = useMutation({ mutationFn: () => AI.meetingNotesToTasks(notes) });
  const risk = useMutation({ mutationFn: (id: number) => AI.riskExplanation(id) });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">AI Assistant</h1>
        <p className="text-sm text-ms-muted">
          mock AI provider — 不需 API key 即可展示。可在 .env 改 AI_PROVIDER 切換為 OpenAI / Anthropic / Azure OpenAI。
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader title="Customer 360 summary" subtitle="輸入 Account ID 即可生成客戶摘要" />
          <CardBody>
            <div className="flex items-center gap-2">
              <input value={accountId} onChange={(e) => setAccountId(e.target.value)} className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm w-32" />
              <Button variant="primary" onClick={() => summary.mutate(Number(accountId))} disabled={summary.isPending}>Generate</Button>
            </div>
            <ResultCard result={summary.data} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Next best action" subtitle="基於 pipeline 與 onboarding 訊號推薦下一步" />
          <CardBody>
            <div className="flex items-center gap-2">
              <input value={accountId} onChange={(e) => setAccountId(e.target.value)} className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm w-32" />
              <Button variant="primary" onClick={() => nextBest.mutate(Number(accountId))} disabled={nextBest.isPending}>Suggest</Button>
            </div>
            <ResultCard result={nextBest.data} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Meeting notes → tasks" subtitle="貼上會議 bullet，自動轉成 action items" />
          <CardBody>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-32 bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm font-mono"
            />
            <div className="mt-2">
              <Button variant="primary" onClick={() => meeting.mutate()} disabled={meeting.isPending}>Extract tasks</Button>
            </div>
            <ResultCard result={meeting.data} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Onboarding risk explanation" subtitle="輸入 Project ID 取得風險說明" />
          <CardBody>
            <div className="flex items-center gap-2">
              <input value={projectId} onChange={(e) => setProjectId(e.target.value)} className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm w-32" />
              <Button variant="primary" onClick={() => risk.mutate(Number(projectId))} disabled={risk.isPending}>Explain</Button>
            </div>
            <ResultCard result={risk.data} />
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
