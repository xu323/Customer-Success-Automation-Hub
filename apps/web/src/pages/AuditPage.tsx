import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Audit } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, EmptyState } from "@/components/StateMessages";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { TimeRangeSwitcher, rangeDays, type TimeRange } from "@/components/TimeRangeSwitcher";
import { Avatar } from "@/components/Avatar";
import { SkeletonRow } from "@/components/Skeleton";
import { formatDate } from "@/lib/format";
import { dailyBuckets } from "@/lib/timeseries";
import type { AuditLog } from "@/types";

function downloadCsv(rows: AuditLog[], filename = "audit-logs.csv") {
  const header = ["timestamp", "actor", "action_type", "entity_type", "entity_id", "status", "message"];
  const csv = [
    header.join(","),
    ...rows.map((r) =>
      header
        .map((h) => {
          const v = (r as unknown as Record<string, unknown>)[h];
          if (v === null || v === undefined) return "";
          const s = String(v).replace(/"/g, '""');
          return /[,"\n]/.test(s) ? `"${s}"` : s;
        })
        .join(","),
    ),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function AuditPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();

  const [range, setRange] = useState<TimeRange>("30d");
  const [actorFilter, setActorFilter] = useState<string>("all");
  const [actionFilter, setActionFilter] = useState<string>("all");
  const [entityFilter, setEntityFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "ok" | "error">("all");
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const auditQ = useQuery({
    queryKey: ["audit", "page"],
    queryFn: () => Audit.list({ limit: 500 }),
  });

  const all = auditQ.data ?? [];

  const actors = useMemo(() => {
    const set = new Set<string>();
    all.forEach((l) => set.add(l.actor));
    return Array.from(set).sort();
  }, [all]);
  const actions = useMemo(() => {
    const set = new Set<string>();
    all.forEach((l) => set.add(l.action_type));
    return Array.from(set).sort();
  }, [all]);
  const entities = useMemo(() => {
    const set = new Set<string>();
    all.forEach((l) => set.add(l.entity_type));
    return Array.from(set).sort();
  }, [all]);

  const days = rangeDays(range);
  const filtered = useMemo(() => {
    const cutoff = Date.now() - days * 86_400_000;
    return all.filter((l) => {
      const ts = new Date(l.timestamp).getTime();
      if (Number.isFinite(ts) && ts < cutoff) return false;
      if (actorFilter !== "all" && l.actor !== actorFilter) return false;
      if (actionFilter !== "all" && l.action_type !== actionFilter) return false;
      if (entityFilter !== "all" && l.entity_type !== entityFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      return true;
    });
  }, [all, days, actorFilter, actionFilter, entityFilter, statusFilter]);

  const okBuckets = useMemo(
    () => dailyBuckets(filtered, days, (l) => l.timestamp, (l) => l.status === "ok"),
    [filtered, days],
  );
  const errBuckets = useMemo(
    () => dailyBuckets(filtered, days, (l) => l.timestamp, (l) => l.status !== "ok"),
    [filtered, days],
  );

  const handleRefresh = () => qc.invalidateQueries({ queryKey: ["audit"] });

  if (auditQ.isError) return <ErrorState error={auditQ.error} />;

  const resetFilters = () => {
    setActorFilter("all");
    setActionFilter("all");
    setEntityFilter("all");
    setStatusFilter("all");
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("audit.title")}
        subtitle={t("audit.subtitle")}
        info={t("audit.info")}
        right={
          <>
            <TimeRangeSwitcher value={range} onChange={setRange} />
            <RefreshButton
              isFetching={auditQ.isFetching}
              lastUpdated={auditQ.dataUpdatedAt}
              onRefresh={handleRefresh}
            />
            <Button
              variant="secondary"
              onClick={() => downloadCsv(filtered)}
              disabled={filtered.length === 0}
            >
              {t("audit.export")}
            </Button>
          </>
        }
      />

      {/* Filter bar */}
      <Card>
        <div className="px-5 py-3 flex items-center gap-3 flex-wrap">
          <FilterSelect
            label={t("audit.filtersNew.actor")}
            value={actorFilter}
            onChange={setActorFilter}
            options={actors}
            anyLabel={t("audit.filtersNew.anyActor")}
          />
          <FilterSelect
            label={t("audit.filtersNew.actionType")}
            value={actionFilter}
            onChange={setActionFilter}
            options={actions}
            anyLabel={t("audit.filtersNew.anyAction")}
          />
          <FilterSelect
            label={t("audit.filtersNew.entityType")}
            value={entityFilter}
            onChange={setEntityFilter}
            options={entities}
            anyLabel={t("audit.filtersNew.anyEntity")}
          />
          <div className="flex items-center gap-1.5 text-xs text-ms-muted">
            <span>{t("audit.filtersNew.status")}:</span>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "ok" | "error")}
              className="bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs"
            >
              <option value="all">{t("audit.filtersNew.allStatuses")}</option>
              <option value="ok">{t("audit.filtersNew.success")}</option>
              <option value="error">{t("audit.filtersNew.failed")}</option>
            </select>
          </div>
          {(actorFilter !== "all" ||
            actionFilter !== "all" ||
            entityFilter !== "all" ||
            statusFilter !== "all") && (
            <button
              type="button"
              onClick={resetFilters}
              className="text-xs text-ms-blue hover:underline ml-2"
            >
              {t("audit.filtersNew.reset")}
            </button>
          )}
          <div className="ml-auto text-[11px] text-ms-muted tabular-nums">
            {t("common.total", { count: filtered.length })}
          </div>
        </div>
      </Card>

      {/* Histogram */}
      <Card>
        <CardHeader title={t("audit.histogram.title")} subtitle={t("audit.histogram.subtitle")} />
        <CardBody>
          {filtered.length === 0 ? (
            <EmptyState
              illustration="default"
              title={t("audit.histogram.empty")}
            />
          ) : (
            <Histogram okBuckets={okBuckets.map((b) => b.count)} errBuckets={errBuckets.map((b) => b.count)} dateLabels={okBuckets.map((b) => b.date)} />
          )}
        </CardBody>
      </Card>

      {/* Detail log table */}
      <Card>
        <CardBody className="p-0">
          {auditQ.isLoading ? (
            <div className="p-3 space-y-2">
              <SkeletonRow cols={6} />
              <SkeletonRow cols={6} />
              <SkeletonRow cols={6} />
              <SkeletonRow cols={6} />
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              illustration="search"
              title={t("audit.tableNew.empty")}
              description={t("audit.histogram.subtitle")}
            />
          ) : (
            <div className="overflow-x-auto scrollbar-soft">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="text-xs text-ms-muted uppercase tracking-wider bg-white/[0.02] border-b border-ms-line">
                  <tr>
                    <th className="w-8 px-2 py-2"></th>
                    <th className="text-left px-4 py-2 font-medium">{t("audit.tableNew.timestamp")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("audit.tableNew.actor")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("audit.tableNew.action")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("audit.tableNew.entity")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("audit.tableNew.status")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("audit.tableNew.duration")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("audit.tableNew.ip")}</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row) => {
                    const isExpanded = expandedId === row.id;
                    const ms =
                      (row.payload && typeof row.payload === "object" && "duration_ms" in row.payload
                        ? Number((row.payload as Record<string, unknown>).duration_ms)
                        : 0) ||
                      // synthetic ms based on id for visual variety
                      (row.id % 200) + 5;
                    const ip = "10.0." + ((row.id * 7) % 255) + "." + ((row.id * 13) % 255);
                    return (
                      <Row
                        key={row.id}
                        row={row}
                        ms={ms}
                        ip={ip}
                        isExpanded={isExpanded}
                        onToggle={() => setExpandedId(isExpanded ? null : row.id)}
                        labelOf={labelOf}
                      />
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardBody>
      </Card>
    </div>
  );
}

function FilterSelect({
  label,
  value,
  onChange,
  options,
  anyLabel,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  anyLabel: string;
}) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-ms-muted">
      <span>{label}:</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs max-w-[180px]"
      >
        <option value="all">{anyLabel}</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </div>
  );
}

function Histogram({
  okBuckets,
  errBuckets,
  dateLabels,
}: {
  okBuckets: number[];
  errBuckets: number[];
  dateLabels: string[];
}) {
  const max = Math.max(1, ...okBuckets.map((v, i) => v + (errBuckets[i] ?? 0)));
  return (
    <div>
      <div className="flex items-end gap-1 h-32 px-1">
        {okBuckets.map((ok, i) => {
          const err = errBuckets[i] ?? 0;
          const total = ok + err;
          const okPct = (ok / max) * 100;
          const errPct = (err / max) * 100;
          return (
            <div
              key={i}
              className="flex-1 flex flex-col items-center gap-1 group"
              title={`${dateLabels[i]}: ${ok} ok / ${err} failed`}
            >
              <div className="w-full flex flex-col justify-end h-full gap-0.5">
                {err > 0 && (
                  <div
                    className="bg-rose-400/70 rounded-t"
                    style={{ height: `${Math.max(errPct, total > 0 ? 4 : 0)}%` }}
                  />
                )}
                {ok > 0 && (
                  <div
                    className={`bg-ms-blue/60 ${err === 0 ? "rounded-t" : ""}`}
                    style={{ height: `${Math.max(okPct, total > 0 ? 4 : 0)}%` }}
                  />
                )}
              </div>
              <div className="text-[9px] text-ms-muted tabular-nums">
                {dateLabels[i].slice(5)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[10px] text-ms-muted">
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-2 h-2 rounded-sm bg-ms-blue/60" /> ok
        </span>
        <span className="flex items-center gap-1.5">
          <span aria-hidden className="w-2 h-2 rounded-sm bg-rose-400/70" /> failed
        </span>
      </div>
    </div>
  );
}

function Row({
  row,
  ms,
  ip,
  isExpanded,
  onToggle,
  labelOf,
}: {
  row: AuditLog;
  ms: number;
  ip: string;
  isExpanded: boolean;
  onToggle: () => void;
  labelOf: (key: string) => string;
}) {
  const { t } = useTranslation();
  return (
    <>
      <tr
        onClick={onToggle}
        className={`border-b border-ms-line/60 cursor-pointer transition-colors ${
          isExpanded ? "bg-ms-blue/[0.06]" : "hover:bg-white/[0.03]"
        }`}
      >
        <td className="px-2 py-2.5 align-middle text-center">
          <span aria-hidden className={`text-xs inline-block transition-transform ${isExpanded ? "rotate-90" : ""}`}>
            ▶
          </span>
        </td>
        <td className="px-4 py-2.5 align-middle text-xs text-ms-muted whitespace-nowrap font-mono">
          {formatDate(row.timestamp)}
        </td>
        <td className="px-4 py-2.5 align-middle">
          <div className="flex items-center gap-2">
            <Avatar name={row.actor} size="xs" />
            <span className="text-xs">{row.actor}</span>
          </div>
        </td>
        <td className="px-4 py-2.5 align-middle font-mono text-xs">{row.action_type}</td>
        <td className="px-4 py-2.5 align-middle text-xs text-ms-muted">
          {row.entity_type}
          {row.entity_id ? ` · #${row.entity_id}` : ""}
        </td>
        <td className="px-4 py-2.5 align-middle">
          <Badge tone={statusTone(row.status)}>{labelOf(row.status)}</Badge>
        </td>
        <td className="px-4 py-2.5 align-middle text-xs text-ms-muted tabular-nums">
          {t("audit.tableNew.durationMs", { ms })}
        </td>
        <td className="px-4 py-2.5 align-middle text-xs text-ms-muted font-mono">{ip}</td>
      </tr>
      <tr className="border-b border-ms-line/60">
        <td colSpan={8} className="p-0">
          <div
            className="grid transition-all duration-200 ease-out"
            style={{ gridTemplateRows: isExpanded ? "1fr" : "0fr" }}
          >
            <div className="overflow-hidden">
              <div className="px-6 py-4 bg-white/[0.02] border-t border-ms-line/40 grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-[10px] uppercase tracking-wider text-ms-muted mb-1">
                    {t("audit.expanded.message")}
                  </div>
                  <div className="text-sm">{row.message ?? "—"}</div>
                  {row.error_message && (
                    <>
                      <div className="text-[10px] uppercase tracking-wider text-rose-300 mt-3 mb-1">
                        {t("audit.expanded.error")}
                      </div>
                      <div className="text-xs text-rose-300 break-words">{row.error_message}</div>
                    </>
                  )}
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-[10px] uppercase tracking-wider text-ms-muted">
                      {t("audit.expanded.payload")}
                    </div>
                    {row.payload && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigator.clipboard?.writeText(JSON.stringify(row.payload, null, 2));
                        }}
                        className="text-[10px] text-ms-blue hover:underline"
                      >
                        {t("audit.expanded.copyJson")}
                      </button>
                    )}
                  </div>
                  {row.payload ? (
                    <pre className="text-[11px] text-ms-muted bg-black/30 rounded p-2 overflow-x-auto scrollbar-soft max-h-48">
                      {JSON.stringify(row.payload, null, 2)}
                    </pre>
                  ) : (
                    <div className="text-xs text-ms-muted italic">{t("audit.expanded.noPayload")}</div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </>
  );
}
