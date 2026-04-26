import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Tickets } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, severityTone, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatDate } from "@/lib/format";

export function TicketsPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
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
        <h1 className="text-2xl font-semibold">{t("tickets.title")}</h1>
        <p className="text-sm text-ms-muted">{t("tickets.subtitle")}</p>
      </div>
      <Card>
        <CardHeader
          title={t("tickets.table.title")}
          subtitle={t("tickets.table.count", { count: q.data?.length ?? 0 })}
        />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
              <tr>
                <th className="text-left px-4 py-2 font-medium">{t("tickets.table.ticket")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("tickets.table.titleCol")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("tickets.table.severity")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("tickets.table.status")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("tickets.table.sla")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("tickets.table.due")}</th>
                <th className="text-right px-4 py-2 font-medium">{t("tickets.table.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {(q.data ?? []).map((tk) => (
                <tr key={tk.id} className="border-b border-ms-line/60">
                  <td className="px-4 py-2 font-mono text-xs">{tk.ticket_number}</td>
                  <td className="px-4 py-2">
                    <div>{tk.title}</div>
                    {tk.description && <div className="text-xs text-ms-muted">{tk.description}</div>}
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={severityTone(tk.severity)}>{labelOf(tk.severity)}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(tk.status)}>{labelOf(tk.status)}</Badge>
                  </td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(tk.sla_status)}>{labelOf(tk.sla_status)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-ms-muted">{formatDate(tk.sla_due_at)}</td>
                  <td className="px-4 py-2 text-right">
                    {tk.status !== "resolved" && tk.status !== "closed" && (
                      <Button variant="primary" onClick={() => resolve.mutate(tk.id)} disabled={resolve.isPending}>
                        {t("tickets.table.resolveBtn")}
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
              {(q.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-6 text-center text-ms-muted">
                    {t("tickets.table.empty")}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
