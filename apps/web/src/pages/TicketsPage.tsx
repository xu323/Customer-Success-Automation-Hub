import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Tickets } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, severityTone, statusTone } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatDate } from "@/lib/format";

export function TicketsPage() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["tickets"], queryFn: Tickets.list });

  const resolve = useMutation({
    mutationFn: (id: number) => Tickets.resolve(id, "Resolved via dashboard"),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tickets"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">IT Operation Tickets</h1>
        <p className="text-sm text-ms-muted">
          Severity / SLA 監控。Workflow 自動建立的 ticket 也會出現在這裡。
        </p>
      </div>
      <Card>
        <CardHeader title="Tickets" subtitle={`${q.data?.length ?? 0} tickets`} />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Ticket</th>
                <th className="text-left px-4 py-2 font-medium">Title</th>
                <th className="text-left px-4 py-2 font-medium">Severity</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">SLA</th>
                <th className="text-left px-4 py-2 font-medium">Due</th>
                <th className="text-right px-4 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((t) => (
                <tr key={t.id} className="border-b border-ms-line/60">
                  <td className="px-4 py-2 font-mono text-xs">{t.ticket_number}</td>
                  <td className="px-4 py-2">
                    <div>{t.title}</div>
                    {t.description && <div className="text-xs text-ms-muted">{t.description}</div>}
                  </td>
                  <td className="px-4 py-2"><Badge tone={severityTone(t.severity)}>{t.severity.toUpperCase()}</Badge></td>
                  <td className="px-4 py-2"><Badge tone={statusTone(t.status)}>{t.status}</Badge></td>
                  <td className="px-4 py-2"><Badge tone={statusTone(t.sla_status)}>{t.sla_status.replace("_", " ")}</Badge></td>
                  <td className="px-4 py-2 text-ms-muted">{formatDate(t.sla_due_at)}</td>
                  <td className="px-4 py-2 text-right">
                    {t.status !== "resolved" && t.status !== "closed" && (
                      <Button variant="primary" onClick={() => resolve.mutate(t.id)} disabled={resolve.isPending}>
                        Resolve
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {(q.data ?? []).length === 0 && (
                <tr><td colSpan={7} className="px-4 py-6 text-center text-ms-muted">No open tickets.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
