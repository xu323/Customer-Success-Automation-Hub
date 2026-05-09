import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { CRM } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, EmptyState } from "@/components/StateMessages";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { TimeRangeSwitcher, type TimeRange } from "@/components/TimeRangeSwitcher";
import { TrendIndicator } from "@/components/TrendIndicator";
import { Sparkline } from "@/components/Sparkline";
import { Avatar } from "@/components/Avatar";
import { Skeleton, SkeletonRow } from "@/components/Skeleton";
import { Modal } from "@/components/Modal";
import { formatCurrency, formatDate } from "@/lib/format";
import { mockTrend } from "@/lib/timeseries";
import type { OpportunityStage } from "@/types";

const STAGES: OpportunityStage[] = [
  "prospecting",
  "qualification",
  "proposal",
  "negotiation",
  "won",
  "lost",
];

type ViewMode = "kanban" | "list" | "forecast";

export function CRMPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const [view, setView] = useState<ViewMode>("kanban");
  const [range, setRange] = useState<TimeRange>("30d");
  const [stageFilter, setStageFilter] = useState<OpportunityStage | "all">("all");
  const [ownerFilter, setOwnerFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [newOppOpen, setNewOppOpen] = useState(false);

  const leadsQ = useQuery({ queryKey: ["leads"], queryFn: CRM.listLeads });
  const oppsQ = useQuery({ queryKey: ["opportunities"], queryFn: CRM.listOpportunities });
  const quotesQ = useQuery({ queryKey: ["quotes"], queryFn: CRM.listQuotes });

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

  const owners = useMemo(() => {
    const set = new Set<string>();
    (oppsQ.data ?? []).forEach((o) => o.owner && set.add(o.owner));
    return Array.from(set).sort();
  }, [oppsQ.data]);

  const filteredOpps = useMemo(() => {
    return (oppsQ.data ?? []).filter((o) => {
      if (stageFilter !== "all" && o.stage !== stageFilter) return false;
      if (ownerFilter !== "all" && o.owner !== ownerFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${o.name} ${o.description ?? ""} ${o.owner ?? ""}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [oppsQ.data, stageFilter, ownerFilter, search]);

  const handleRefresh = () => {
    void qc.invalidateQueries({ queryKey: ["leads"] });
    void qc.invalidateQueries({ queryKey: ["opportunities"] });
    void qc.invalidateQueries({ queryKey: ["quotes"] });
  };
  const lastUpdated = Math.max(
    leadsQ.dataUpdatedAt ?? 0,
    oppsQ.dataUpdatedAt ?? 0,
    quotesQ.dataUpdatedAt ?? 0,
  );

  if (leadsQ.isError) return <ErrorState error={leadsQ.error} />;

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("crm.title")}
        subtitle={t("crm.subtitle")}
        info={t("crm.info")}
        right={
          <>
            <TimeRangeSwitcher value={range} onChange={setRange} />
            <RefreshButton
              isFetching={oppsQ.isFetching || leadsQ.isFetching}
              lastUpdated={lastUpdated}
              onRefresh={handleRefresh}
            />
            <Button variant="primary" onClick={() => setNewOppOpen(true)}>
              + {t("crm.toolbar.newOpp")}
            </Button>
          </>
        }
      />

      {/* Toolbar: filters + view toggle */}
      <Card>
        <div className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-2 flex-wrap min-w-0 flex-1">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("crm.toolbar.searchPlaceholder")}
              className="bg-white/5 border border-ms-line rounded-md px-3 py-1.5 text-sm w-64 max-w-full focus:outline-none focus:border-ms-blue/60"
            />
            <FilterPill
              label={t("crm.toolbar.filterStage")}
              value={stageFilter === "all" ? t("crm.toolbar.allStages") : labelOf(stageFilter)}
              onClick={() => setStageFilter("all")}
              active={stageFilter !== "all"}
            />
            <select
              className="bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs text-ms-text"
              value={stageFilter}
              onChange={(e) => setStageFilter(e.target.value as OpportunityStage | "all")}
            >
              <option value="all">{t("crm.toolbar.allStages")}</option>
              {STAGES.map((s) => (
                <option key={s} value={s}>
                  {labelOf(s)}
                </option>
              ))}
            </select>
            <select
              className="bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs text-ms-text"
              value={ownerFilter}
              onChange={(e) => setOwnerFilter(e.target.value)}
            >
              <option value="all">{t("crm.toolbar.allOwners")}</option>
              {owners.map((o) => (
                <option key={o} value={o}>
                  {o}
                </option>
              ))}
            </select>
          </div>
          <div className="inline-flex rounded-md border border-ms-line bg-white/[0.03] p-0.5">
            <ViewToggle value={view} onChange={setView} />
          </div>
        </div>
      </Card>

      {oppsQ.isLoading && (
        <Card>
          <CardBody>
            <SkeletonRow cols={6} />
            <SkeletonRow cols={6} />
            <SkeletonRow cols={6} />
          </CardBody>
        </Card>
      )}

      {!oppsQ.isLoading && view === "kanban" && (
        <KanbanView
          opportunities={filteredOpps}
          onMarkWon={(id) => markWon.mutate(id)}
          isPending={markWon.isPending}
        />
      )}

      {!oppsQ.isLoading && view === "list" && (
        <ListView opportunities={filteredOpps} />
      )}

      {!oppsQ.isLoading && view === "forecast" && (
        <ForecastView opportunities={oppsQ.data ?? []} range={range} />
      )}

      {/* New opportunity dialog */}
      <NewOpportunityDialog
        open={newOppOpen}
        onClose={() => setNewOppOpen(false)}
        onCreated={() => {
          qc.invalidateQueries({ queryKey: ["opportunities"] });
          qc.invalidateQueries({ queryKey: ["dashboard"] });
        }}
      />

      {/* Unqualified leads panel — collapsed at bottom for context */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader title={t("crm.leadsPanel.title")} subtitle={t("crm.leadsPanel.subtitle")} />
          <CardBody className="p-0">
            {leadsQ.isLoading ? (
              <div className="p-4">
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full mb-2" />
                <Skeleton className="h-4 w-full" />
              </div>
            ) : (leadsQ.data ?? []).filter((l) => l.status !== "qualified").length === 0 ? (
              <EmptyState
                illustration="success"
                title={t("crm.leadsPanel.empty")}
                description={t("crm.leadsPanel.subtitle")}
              />
            ) : (
              <table className="w-full text-sm">
                <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
                  <tr>
                    <th className="text-left px-4 py-2 font-medium">{t("crm.fields.company")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("crm.fields.contact")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("crm.fields.source")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("crm.fields.estimatedValue")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("crm.quotes.status")}</th>
                    <th className="text-right px-4 py-2 font-medium">{t("crm.leads.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {(leadsQ.data ?? [])
                    .filter((l) => l.status !== "qualified")
                    .map((l) => (
                      <tr
                        key={l.id}
                        className="border-b border-ms-line/60 hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-4 py-2">{l.company}</td>
                        <td className="px-4 py-2 text-ms-muted">{l.contact_name}</td>
                        <td className="px-4 py-2 text-ms-muted">{l.source ?? "-"}</td>
                        <td className="px-4 py-2 tabular-nums">{formatCurrency(l.estimated_value ?? 0)}</td>
                        <td className="px-4 py-2">
                          <Badge tone={statusTone(l.status)}>{labelOf(l.status)}</Badge>
                        </td>
                        <td className="px-4 py-2 text-right">
                          <Button
                            variant="primary"
                            disabled={qualifyLead.isPending}
                            onClick={() => qualifyLead.mutate(l.id)}
                          >
                            {t("crm.leads.qualify")}
                          </Button>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            )}
          </CardBody>
        </Card>

        <Card>
          <CardHeader title={t("crm.quotes.title")} subtitle={t("crm.quotes.subtitle")} />
          <CardBody className="p-0">
            {(quotesQ.data ?? []).length === 0 ? (
              <EmptyState illustration="default" title={t("crm.quotes.none")} />
            ) : (
              <ul className="divide-y divide-ms-line/40">
                {(quotesQ.data ?? []).map((q) => (
                  <li key={q.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-sm font-medium font-mono">{q.quote_number}</div>
                      <div className="text-xs text-ms-muted">
                        {t("crm.quotes.validUntil")}: {formatDate(q.valid_until)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm tabular-nums">
                        {formatCurrency(q.total_amount, q.currency)}
                      </div>
                      <Badge tone={statusTone(q.status)}>{labelOf(q.status)}</Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

// ----------------------------------------------------------------------
// New opportunity dialog
// ----------------------------------------------------------------------
function NewOpportunityDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: () => void;
}) {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const [name, setName] = useState("");
  const [stage, setStage] = useState<OpportunityStage>("qualification");
  const [amount, setAmount] = useState("100000");
  const [probability, setProbability] = useState("30");
  const [closeDate, setCloseDate] = useState("");
  const [owner, setOwner] = useState("sales@partner.com");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const create = useMutation({
    mutationFn: () =>
      CRM.createOpportunity({
        name: name.trim(),
        stage,
        amount: amount ? Number(amount) : 0,
        probability: probability ? Number(probability) / 100 : 0.1,
        expected_close_date: closeDate ? new Date(closeDate).toISOString() : null,
        owner: owner.trim() || null,
        description: description.trim() || null,
      }),
    onSuccess: () => {
      onCreated();
      // reset
      setName("");
      setAmount("100000");
      setProbability("30");
      setCloseDate("");
      setOwner("sales@partner.com");
      setDescription("");
      setError(null);
      onClose();
    },
    onError: (e) => setError(e instanceof Error ? e.message : String(e)),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError(t("crm.newOppDialog.validation"));
      return;
    }
    setError(null);
    create.mutate();
  };

  // sensible default close date = today + 45 days
  const defaultCloseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + 45);
    return d.toISOString().slice(0, 10);
  }, []);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("crm.newOppDialog.title")}
      subtitle={t("crm.newOppDialog.subtitle")}
      footer={
        <>
          <Button variant="ghost" onClick={onClose} type="button">
            {t("crm.newOppDialog.cancel")}
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={create.isPending}
            type="button"
          >
            {create.isPending ? t("crm.newOppDialog.creating") : t("crm.newOppDialog.create")}
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-3">
        <Field label={t("crm.newOppDialog.fieldName")}>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t("crm.newOppDialog.fieldNamePh")}
            className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
          />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("crm.newOppDialog.fieldStage")}>
            <select
              value={stage}
              onChange={(e) => setStage(e.target.value as OpportunityStage)}
              className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
            >
              {STAGES.filter((s) => s !== "lost").map((s) => (
                <option key={s} value={s}>
                  {labelOf(s)}
                </option>
              ))}
            </select>
          </Field>
          <Field label={t("crm.newOppDialog.fieldProbability")}>
            <select
              value={probability}
              onChange={(e) => setProbability(e.target.value)}
              className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
            >
              {["10", "30", "60", "75", "90", "100"].map((v) => (
                <option key={v} value={v}>
                  {v}%
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("crm.newOppDialog.fieldAmount")}>
            <input
              type="number"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
            />
          </Field>
          <Field label={t("crm.newOppDialog.fieldCloseDate")}>
            <input
              type="date"
              value={closeDate || defaultCloseDate}
              onChange={(e) => setCloseDate(e.target.value)}
              className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
            />
          </Field>
        </div>
        <Field label={t("crm.newOppDialog.fieldOwner")}>
          <input
            value={owner}
            onChange={(e) => setOwner(e.target.value)}
            placeholder={t("crm.newOppDialog.fieldOwnerPh")}
            className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60"
          />
        </Field>
        <Field label={t("crm.newOppDialog.fieldDescription")}>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder={t("crm.newOppDialog.fieldDescriptionPh")}
            rows={3}
            className="w-full bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm focus:outline-none focus:border-ms-blue/60 resize-none"
          />
        </Field>
        {error && (
          <div className="text-xs text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded px-3 py-2">
            {error}
          </div>
        )}
      </form>
    </Modal>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs text-ms-muted mb-1">{label}</span>
      {children}
    </label>
  );
}

// ----------------------------------------------------------------------
function FilterPill({
  label,
  value,
  active,
  onClick,
}: {
  label: string;
  value: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-xs px-2 py-1 rounded-full border ${
        active
          ? "border-ms-blue/60 bg-ms-blue/15 text-white"
          : "border-ms-line text-ms-muted hover:text-white"
      } whitespace-nowrap hidden`}
      aria-hidden
    >
      {label}: {value}
    </button>
  );
}

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  const { t } = useTranslation();
  const opts: { key: ViewMode; label: string }[] = [
    { key: "kanban", label: t("crm.toolbar.viewKanban") },
    { key: "list", label: t("crm.toolbar.viewList") },
    { key: "forecast", label: t("crm.toolbar.viewForecast") },
  ];
  return (
    <>
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          className={`px-2.5 py-1 rounded-sm text-xs whitespace-nowrap transition-colors ${
            value === o.key
              ? "bg-ms-blue/25 text-white font-semibold ring-1 ring-inset ring-ms-blue/70"
              : "text-slate-400 hover:text-white hover:bg-white/5"
          }`}
        >
          {o.label}
        </button>
      ))}
    </>
  );
}

// ----------------------------------------------------------------------
// Kanban view
// ----------------------------------------------------------------------
function KanbanView({
  opportunities,
  onMarkWon,
  isPending,
}: {
  opportunities: ReturnType<typeof Object> extends never
    ? never
    : Array<{
        id: number;
        name: string;
        stage: OpportunityStage;
        amount: number;
        probability: number;
        expected_close_date?: string | null;
        owner?: string | null;
        updated_at: string;
      }>;
  onMarkWon: (id: number) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
      {STAGES.map((stage) => {
        const items = opportunities.filter((o) => o.stage === stage);
        const total = items.reduce((acc, o) => acc + o.amount, 0);
        const weighted = items.reduce((acc, o) => acc + o.amount * (o.probability ?? 0), 0);
        return (
          <div
            key={stage}
            className="rounded-lg border border-ms-line bg-white/[0.02] flex flex-col min-h-[200px]"
          >
            <div className="px-3 py-2 border-b border-ms-line/60 flex items-center justify-between gap-2">
              <Badge tone={statusTone(stage)}>{labelOf(stage)}</Badge>
              <span className="text-xs text-ms-muted">{items.length}</span>
            </div>
            <div className="px-3 py-1.5 text-[11px] text-ms-muted border-b border-ms-line/40 tabular-nums">
              {t("crm.kanban.stageWeighted", { value: formatCurrency(weighted) })}
            </div>
            <div className="flex-1 p-2 space-y-2 overflow-y-auto scrollbar-soft">
              {items.length === 0 ? (
                <div className="text-xs text-ms-muted text-center py-6">
                  {t("crm.kanban.empty")}
                </div>
              ) : (
                items.map((o) => {
                  const ageMs = Date.now() - new Date(o.updated_at).getTime();
                  const ageDays = Math.max(0, Math.floor(ageMs / 86400000));
                  return (
                    <div
                      key={o.id}
                      className="rounded-md border border-ms-line/80 bg-[#0e1730]/80 p-2.5 hover:border-ms-blue/40 hover:bg-[#0e1730] transition-all cursor-pointer"
                    >
                      <div className="font-medium text-[13px] leading-tight line-clamp-2">{o.name}</div>
                      <div className="mt-1.5 flex items-center justify-between gap-1.5">
                        <span className="text-sm tabular-nums">{formatCurrency(o.amount)}</span>
                        <span className="text-[10px] text-ms-muted tabular-nums">
                          {(o.probability * 100).toFixed(0)}%
                        </span>
                      </div>
                      <div className="mt-1.5 flex items-center justify-between gap-1.5 text-[10px] text-ms-muted">
                        <Avatar name={o.owner ?? t("crm.kanban.noOwner")} size="xs" />
                        <span className="whitespace-nowrap">
                          {o.expected_close_date ? formatDate(o.expected_close_date) : "—"}
                        </span>
                      </div>
                      <div className="mt-1 text-[10px] text-ms-muted">
                        {t("crm.kanban.stageAge", { days: ageDays })}
                      </div>
                      {stage !== "won" && stage !== "lost" && (
                        <button
                          type="button"
                          onClick={() => onMarkWon(o.id)}
                          disabled={isPending}
                          className="mt-2 w-full text-[11px] py-1 rounded border border-ms-line text-ms-muted hover:text-white hover:border-ms-blue/60 transition-colors"
                        >
                          {t("crm.kanban.markWon")}
                        </button>
                      )}
                    </div>
                  );
                })
              )}
            </div>
            <div className="px-3 py-1.5 border-t border-ms-line/40 text-[10px] text-ms-muted text-center tabular-nums">
              {formatCurrency(total)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ----------------------------------------------------------------------
// List view
// ----------------------------------------------------------------------
function ListView({
  opportunities,
}: {
  opportunities: Array<{
    id: number;
    name: string;
    stage: OpportunityStage;
    amount: number;
    probability: number;
    expected_close_date?: string | null;
    owner?: string | null;
    updated_at: string;
  }>;
}) {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  if (opportunities.length === 0) {
    return (
      <Card>
        <CardBody>
          <EmptyState
            illustration="search"
            title={t("crm.emptyState.title")}
            description={t("crm.emptyState.description")}
          />
        </CardBody>
      </Card>
    );
  }
  return (
    <Card>
      <CardBody className="p-0">
        <div className="overflow-x-auto scrollbar-soft">
          <table className="w-full text-sm min-w-[900px]">
            <thead className="text-xs text-ms-muted uppercase tracking-wider bg-white/[0.02] border-b border-ms-line">
              <tr>
                <th className="text-left px-4 py-2 font-medium">{t("crm.pipeline.title")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("crm.toolbar.filterStage")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("crm.fields.estimatedValue")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("crm.kanban.probabilityShort", { value: "%" }).replace("%", "")}%</th>
                <th className="text-left px-4 py-2 font-medium">{t("crm.toolbar.filterCloseDate")}</th>
                <th className="text-left px-4 py-2 font-medium">{t("crm.toolbar.filterOwner")}</th>
              </tr>
            </thead>
            <tbody>
              {opportunities.map((o) => (
                <tr
                  key={o.id}
                  className="border-b border-ms-line/60 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="px-4 py-2.5 font-medium">{o.name}</td>
                  <td className="px-4 py-2.5">
                    <Badge tone={statusTone(o.stage)}>{labelOf(o.stage)}</Badge>
                  </td>
                  <td className="px-4 py-2.5 tabular-nums">{formatCurrency(o.amount)}</td>
                  <td className="px-4 py-2.5 tabular-nums text-ms-muted">
                    {(o.probability * 100).toFixed(0)}%
                  </td>
                  <td className="px-4 py-2.5 text-ms-muted">
                    {o.expected_close_date ? formatDate(o.expected_close_date) : "—"}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <Avatar name={o.owner ?? t("crm.kanban.noOwner")} size="xs" />
                      <span className="text-xs text-ms-muted">{o.owner ?? "—"}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </CardBody>
    </Card>
  );
}

// ----------------------------------------------------------------------
// Forecast view
// ----------------------------------------------------------------------
function ForecastView({
  opportunities,
  range,
}: {
  opportunities: Array<{
    stage: OpportunityStage;
    amount: number;
    probability: number;
  }>;
  range: TimeRange;
}) {
  const { t } = useTranslation();
  const open = opportunities.filter((o) => o.stage !== "won" && o.stage !== "lost");
  const weighted = open.reduce((a, o) => a + o.amount * (o.probability ?? 0), 0);
  const bestCase = open.reduce((a, o) => a + o.amount, 0);
  const commit = open
    .filter((o) => (o.probability ?? 0) >= 0.7)
    .reduce((a, o) => a + o.amount, 0);
  const closed = opportunities
    .filter((o) => o.stage === "won")
    .reduce((a, o) => a + o.amount, 0);

  const blocks: { label: string; value: number; trend: number; tone: string }[] = [
    {
      label: t("crm.forecast.weighted"),
      value: weighted,
      trend: mockTrend("forecast-weighted-" + range, [-5, 18]),
      tone: "info",
    },
    {
      label: t("crm.forecast.bestCase"),
      value: bestCase,
      trend: mockTrend("forecast-best-" + range, [-3, 14]),
      tone: "success",
    },
    {
      label: t("crm.forecast.commit"),
      value: commit,
      trend: mockTrend("forecast-commit-" + range, [-7, 12]),
      tone: "warning",
    },
    {
      label: t("crm.forecast.closed"),
      value: closed,
      trend: mockTrend("forecast-closed-" + range, [-2, 25]),
      tone: "success",
    },
  ];

  // Synthetic monthly bars for visual punch
  const months = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => ({
      label: ["M-5", "M-4", "M-3", "M-2", "M-1", "Now"][i],
      value: 0.4 + Math.sin(i * 0.7) * 0.3 + Math.random() * 0.1,
    }));
  }, []);

  return (
    <Card>
      <CardHeader title={t("crm.forecast.title")} subtitle={t("crm.forecast.subtitle")} />
      <CardBody>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {blocks.map((b) => (
            <div
              key={b.label}
              className="rounded-lg border border-ms-line bg-white/[0.02] p-3"
            >
              <div className="text-[11px] uppercase tracking-wide text-ms-muted">
                {b.label}
              </div>
              <div className="mt-1 text-xl font-semibold tabular-nums">
                {formatCurrency(b.value)}
              </div>
              <div className="mt-1 flex items-center gap-1.5 text-[11px] text-ms-muted">
                <TrendIndicator delta={b.trend} />
                <span>{t("crm.forecast.vsPrev")}</span>
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6">
          <div className="flex items-end gap-2 h-32">
            {months.map((m, i) => (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex flex-col justify-end h-full">
                  <div
                    className="bg-ms-blue/40 rounded-t"
                    style={{ height: `${m.value * 100}%` }}
                  />
                </div>
                <div className="text-[10px] text-ms-muted">{m.label}</div>
              </div>
            ))}
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-ms-muted">
            <span>{t("crm.forecast.subtitle")}</span>
            <Sparkline values={months.map((m) => m.value * 100)} width={80} height={20} />
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
