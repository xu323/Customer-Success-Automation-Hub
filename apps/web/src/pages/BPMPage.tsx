import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BPM } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatCurrency, formatDate } from "@/lib/format";
import type { BPMRequestType } from "@/types";

const REQUEST_TYPES: BPMRequestType[] = ["VendorPayment", "EmployeePayment", "TravelRequest"];

export function BPMPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const requestsQ = useQuery({ queryKey: ["bpm"], queryFn: BPM.listRequests });

  const [form, setForm] = useState({
    request_type: "VendorPayment" as BPMRequestType,
    title: "",
    requester: "finance.user@partner.com",
    amount: "",
    approvers: "manager@partner.com,finance@partner.com",
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bpm"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };

  const create = useMutation({
    mutationFn: () =>
      BPM.createRequest({
        request_type: form.request_type,
        title: form.title,
        requester: form.requester,
        amount: form.amount ? Number(form.amount) : null,
        approvers: form.approvers.split(",").map((a) => a.trim()).filter(Boolean),
      }),
    onSuccess: () => {
      setForm({ ...form, title: "", amount: "" });
      invalidate();
    },
  });

  const submit = useMutation({ mutationFn: (id: number) => BPM.submit(id), onSuccess: invalidate });
  const approve = useMutation({
    mutationFn: ({ id, approver }: { id: number; approver: string }) => BPM.approve(id, approver, "Approved via UI"),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: ({ id, approver }: { id: number; approver: string }) => BPM.reject(id, approver, "Rejected via UI"),
    onSuccess: invalidate,
  });
  const syncBC = useMutation({ mutationFn: (id: number) => BPM.syncToBC(id), onSuccess: invalidate });

  if (requestsQ.isLoading) return <LoadingState />;
  if (requestsQ.isError) return <ErrorState error={requestsQ.error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("bpm.title")}</h1>
        <p className="text-sm text-ms-muted">{t("bpm.subtitle")}</p>
      </div>

      <Card>
        <CardHeader title={t("bpm.create.title")} subtitle={t("bpm.create.subtitle")} />
        <CardBody>
          <form
            className="grid grid-cols-1 md:grid-cols-5 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.title) create.mutate();
            }}
          >
            <select
              className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm"
              value={form.request_type}
              onChange={(e) => setForm({ ...form, request_type: e.target.value as BPMRequestType })}
            >
              {REQUEST_TYPES.map((rt) => (
                <option key={rt} value={rt}>
                  {t(`bpm.types.${rt}` as const)}
                </option>
              ))}
            </select>
            <input
              className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm md:col-span-2"
              placeholder={t("bpm.create.titlePlaceholder")}
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
            <input
              className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm"
              placeholder={t("bpm.create.amountPlaceholder")}
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
            <input
              className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm"
              placeholder={t("bpm.create.approversPlaceholder")}
              value={form.approvers}
              onChange={(e) => setForm({ ...form, approvers: e.target.value })}
            />
            <div className="md:col-span-5">
              <Button variant="primary" type="submit" disabled={create.isPending}>
                {create.isPending ? t("bpm.create.submitting") : t("bpm.create.submit")}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>

      <div className="space-y-4">
        {(requestsQ.data ?? []).map((r) => {
          const next = r.steps.find((s) => s.decision === "Submitted");
          return (
            <Card key={r.id}>
              <CardHeader
                title={`${r.request_number} — ${r.title}`}
                subtitle={`${t(`bpm.types.${r.request_type}` as const)} · ${formatCurrency(r.amount ?? 0, r.currency)} · ${t("bpm.requester", { value: r.requester })}`}
                action={<Badge tone={statusTone(r.status)}>{labelOf(r.status)}</Badge>}
              />
              <CardBody className="space-y-3">
                <ol className="flex items-center gap-3 flex-wrap">
                  {r.steps.map((s, idx) => (
                    <li key={s.id} className="flex items-center gap-2">
                      <div
                        className={`h-7 w-7 rounded-full flex items-center justify-center text-xs border ${
                          s.decision === "Approved"
                            ? "bg-emerald-500/20 border-emerald-500/30"
                            : s.decision === "Rejected"
                            ? "bg-rose-500/20 border-rose-500/30"
                            : "bg-white/5 border-ms-line"
                        }`}
                      >
                        {idx + 1}
                      </div>
                      <div>
                        <div className="text-sm">{s.approver}</div>
                        <div className="text-xs text-ms-muted">
                          {s.role ?? ""} · {labelOf(s.decision)}
                        </div>
                      </div>
                      {idx < r.steps.length - 1 && <span className="text-ms-muted">→</span>}
                    </li>
                  ))}
                </ol>
                <div className="flex flex-wrap gap-2">
                  {r.status === "Draft" && (
                    <Button variant="primary" onClick={() => submit.mutate(r.id)} disabled={submit.isPending}>
                      {t("bpm.actions.submit")}
                    </Button>
                  )}
                  {next && r.status === "Submitted" && (
                    <>
                      <Button
                        variant="primary"
                        onClick={() => approve.mutate({ id: r.id, approver: next.approver })}
                      >
                        {t("bpm.actions.approveAs", { approver: next.approver })}
                      </Button>
                      <Button
                        variant="danger"
                        onClick={() => reject.mutate({ id: r.id, approver: next.approver })}
                      >
                        {t("bpm.actions.rejectAs", { approver: next.approver })}
                      </Button>
                    </>
                  )}
                  {r.status === "Approved" && (
                    <Button variant="primary" onClick={() => syncBC.mutate(r.id)} disabled={syncBC.isPending}>
                      {t("bpm.actions.syncToBC")}
                    </Button>
                  )}
                  {r.status === "Completed" && r.bc_sync_reference && (
                    <Badge tone="success">{t("bpm.actions.bcDocument", { id: r.bc_sync_reference })}</Badge>
                  )}
                </div>
                <div className="text-xs text-ms-muted">
                  {t("bpm.timestamps.created", { date: formatDate(r.created_at) })} ·{" "}
                  {t("bpm.timestamps.updated", { date: formatDate(r.updated_at) })}
                </div>
              </CardBody>
            </Card>
          );
        })}
        {(requestsQ.data ?? []).length === 0 && (
          <Card>
            <CardBody>
              <div className="text-sm text-ms-muted">{t("bpm.empty")}</div>
            </CardBody>
          </Card>
        )}
      </div>
    </div>
  );
}
