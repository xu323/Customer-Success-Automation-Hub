import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CRM } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatCurrency, formatDate } from "@/lib/format";
import type { OpportunityStage } from "@/types";

const STAGES: OpportunityStage[] = ["prospecting", "qualification", "proposal", "negotiation", "won", "lost"];

export function CRMPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const leadsQ = useQuery({ queryKey: ["leads"], queryFn: CRM.listLeads });
  const oppsQ = useQuery({ queryKey: ["opportunities"], queryFn: CRM.listOpportunities });
  const quotesQ = useQuery({ queryKey: ["quotes"], queryFn: CRM.listQuotes });

  const [form, setForm] = useState({ company: "", contact_name: "", email: "", estimated_value: "" });

  const createLead = useMutation({
    mutationFn: () =>
      CRM.createLead({
        company: form.company,
        contact_name: form.contact_name,
        email: form.email || null,
        estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      } as any),
    onSuccess: () => {
      setForm({ company: "", contact_name: "", email: "", estimated_value: "" });
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const qualifyLead = useMutation({
    mutationFn: (id: number) => CRM.qualifyLead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leads"] });
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  const markWon = useMutation({
    mutationFn: (id: number) => CRM.markWon(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["opportunities"] });
      qc.invalidateQueries({ queryKey: ["onboarding"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
    },
  });

  if (leadsQ.isLoading || oppsQ.isLoading || quotesQ.isLoading) return <LoadingState />;
  if (leadsQ.isError) return <ErrorState error={leadsQ.error} />;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">{t("crm.title")}</h1>
        <p className="text-sm text-ms-muted">{t("crm.subtitle")}</p>
      </div>

      <Card>
        <CardHeader title={t("crm.newLead.title")} subtitle={t("crm.newLead.subtitle")} />
        <CardBody>
          <form
            className="grid grid-cols-1 md:grid-cols-4 gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              if (form.company && form.contact_name) createLead.mutate();
            }}
          >
            <input
              className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm"
              placeholder={t("crm.fields.company")}
              value={form.company}
              onChange={(e) => setForm({ ...form, company: e.target.value })}
            />
            <input
              className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm"
              placeholder={t("crm.fields.contact")}
              value={form.contact_name}
              onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
            />
            <input
              className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm"
              placeholder={t("crm.fields.email")}
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
            <input
              className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm"
              placeholder={t("crm.fields.estimatedValue")}
              value={form.estimated_value}
              onChange={(e) => setForm({ ...form, estimated_value: e.target.value })}
            />
            <div className="md:col-span-4">
              <Button type="submit" variant="primary" disabled={createLead.isPending}>
                {createLead.isPending ? t("crm.newLead.submitting") : t("crm.newLead.submit")}
              </Button>
              {createLead.isError && (
                <span className="ml-3 text-sm text-rose-300">{(createLead.error as Error).message}</span>
              )}
            </div>
          </form>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("crm.leads.title")} subtitle={t("crm.leads.count", { count: leadsQ.data?.length ?? 0 })} />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
              <tr>
                <th className="text-left font-medium px-4 py-2">{t("crm.fields.company")}</th>
                <th className="text-left font-medium px-4 py-2">{t("crm.fields.contact")}</th>
                <th className="text-left font-medium px-4 py-2">{t("crm.fields.source")}</th>
                <th className="text-left font-medium px-4 py-2">{t("crm.fields.estimatedValue")}</th>
                <th className="text-left font-medium px-4 py-2">{t("crm.quotes.status")}</th>
                <th className="text-right font-medium px-4 py-2">{t("crm.leads.actions")}</th>
              </tr>
            </thead>
            <tbody>
              {leadsQ.data?.map((l) => (
                <tr key={l.id} className="border-b border-ms-line/60 hover:bg-white/[0.02]">
                  <td className="px-4 py-2">{l.company}</td>
                  <td className="px-4 py-2 text-ms-muted">{l.contact_name}</td>
                  <td className="px-4 py-2 text-ms-muted">{l.source ?? "-"}</td>
                  <td className="px-4 py-2">{formatCurrency(l.estimated_value ?? 0)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(l.status)}>{labelOf(l.status)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-right">
                    <Button
                      variant="primary"
                      disabled={l.status === "qualified" || qualifyLead.isPending}
                      onClick={() => qualifyLead.mutate(l.id)}
                    >
                      {t("crm.leads.qualify")}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("crm.pipeline.title")} subtitle={t("crm.pipeline.subtitle")} />
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {STAGES.map((stage) => {
              const items = (oppsQ.data ?? []).filter((o) => o.stage === stage);
              return (
                <div key={stage} className="rounded-lg border border-ms-line bg-white/[0.02] p-3 min-h-[160px]">
                  <div className="flex items-center justify-between mb-2">
                    <Badge tone={statusTone(stage)}>{labelOf(stage)}</Badge>
                    <span className="text-xs text-ms-muted">{items.length}</span>
                  </div>
                  <div className="space-y-2">
                    {items.map((o) => (
                      <div key={o.id} className="rounded-md border border-ms-line p-2 text-xs bg-[#0e1730]/80">
                        <div className="font-medium text-sm leading-tight">{o.name}</div>
                        <div className="text-ms-muted mt-1">
                          {formatCurrency(o.amount)} · {(o.probability * 100).toFixed(0)}%
                        </div>
                        <div className="text-ms-muted">
                          {t("crm.pipeline.closeDate", { date: formatDate(o.expected_close_date) })}
                        </div>
                        {stage !== "won" && stage !== "lost" && (
                          <Button
                            variant="ghost"
                            className="mt-2 text-xs"
                            onClick={() => markWon.mutate(o.id)}
                            disabled={markWon.isPending}
                          >
                            {t("crm.pipeline.markWon")}
                          </Button>
                        )}
                      </div>
                    ))}
                    {items.length === 0 && (
                      <div className="text-xs text-ms-muted text-center py-4">{t("crm.pipeline.noItems")}</div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title={t("crm.quotes.title")} />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
              <tr>
                <th className="text-left font-medium px-4 py-2">{t("crm.quotes.number")}</th>
                <th className="text-left font-medium px-4 py-2">{t("crm.quotes.opportunity")}</th>
                <th className="text-left font-medium px-4 py-2">{t("crm.quotes.total")}</th>
                <th className="text-left font-medium px-4 py-2">{t("crm.quotes.status")}</th>
                <th className="text-left font-medium px-4 py-2">{t("crm.quotes.validUntil")}</th>
              </tr>
            </thead>
            <tbody>
              {(quotesQ.data ?? []).map((q) => (
                <tr key={q.id} className="border-b border-ms-line/60">
                  <td className="px-4 py-2 font-mono text-xs">{q.quote_number}</td>
                  <td className="px-4 py-2">#{q.opportunity_id}</td>
                  <td className="px-4 py-2">{formatCurrency(q.total_amount, q.currency)}</td>
                  <td className="px-4 py-2">
                    <Badge tone={statusTone(q.status)}>{labelOf(q.status)}</Badge>
                  </td>
                  <td className="px-4 py-2 text-ms-muted">{formatDate(q.valid_until)}</td>
                </tr>
              ))}
              {(quotesQ.data ?? []).length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-6 text-center text-ms-muted">
                    {t("crm.quotes.none")}
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
