import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { BPM } from "@/api/endpoints";
import { Card, CardBody } from "@/components/Card";
import { Badge, statusTone, useStatusLabel } from "@/components/Badge";
import { Button } from "@/components/Button";
import { ErrorState, EmptyState } from "@/components/StateMessages";
import { PageHeader } from "@/components/PageHeader";
import { RefreshButton } from "@/components/RefreshButton";
import { Tabs, type TabSpec } from "@/components/Tabs";
import { Avatar } from "@/components/Avatar";
import { SkeletonRow } from "@/components/Skeleton";
import { formatCurrency, formatRelative } from "@/lib/format";
import type { BPMRequest, BPMRequestType } from "@/types";

// In a real app this comes from auth. For the demo we hardcode the user.
const CURRENT_USER = "manager@partner.com";
const CURRENT_USER_ALT = "finance@partner.com";

type TabKey = "myPending" | "submittedByMe" | "all";

function slaInfo(req: BPMRequest): {
  state: "noDeadline" | "onTrack" | "atRisk" | "breached";
  msUntilDue: number | null;
} {
  if (req.status !== "Submitted") return { state: "noDeadline", msUntilDue: null };
  // Synthetic deadline = submission + 48 hours
  const submitted = new Date(req.created_at).getTime();
  const deadline = submitted + 48 * 60 * 60 * 1000;
  const ms = deadline - Date.now();
  if (ms < 0) return { state: "breached", msUntilDue: ms };
  if (ms < 12 * 60 * 60 * 1000) return { state: "atRisk", msUntilDue: ms };
  return { state: "onTrack", msUntilDue: ms };
}

function formatSlaTime(ms: number, lng: string): string {
  const abs = Math.abs(ms);
  const hours = Math.floor(abs / 3_600_000);
  const minutes = Math.floor((abs % 3_600_000) / 60_000);
  if (lng === "ja") {
    if (hours >= 1) return `${hours} 時間 ${minutes > 0 ? minutes + " 分" : ""}`.trim();
    return `${minutes} 分`;
  }
  if (lng === "zh-TW") {
    if (hours >= 1) return `${hours} 小時${minutes > 0 ? " " + minutes + " 分" : ""}`;
    return `${minutes} 分`;
  }
  if (hours >= 1) return `${hours}h ${minutes > 0 ? minutes + "m" : ""}`.trim();
  return `${minutes}m`;
}

function SLAChip({ req }: { req: BPMRequest }) {
  const { t, i18n } = useTranslation();
  const sla = slaInfo(req);
  if (sla.state === "noDeadline") {
    return <span className="text-xs text-ms-muted">—</span>;
  }
  const time = sla.msUntilDue !== null ? formatSlaTime(sla.msUntilDue, i18n.language) : "";
  if (sla.state === "breached") {
    return <Badge tone="danger">{t("bpm.sla.breached", { time })}</Badge>;
  }
  if (sla.state === "atRisk") {
    return <Badge tone="warning">{t("bpm.sla.atRisk", { time })}</Badge>;
  }
  return <Badge tone="success">{t("bpm.sla.onTrack", { time })}</Badge>;
}

function TypeIcon({ type }: { type: BPMRequestType }) {
  const map: Record<BPMRequestType, { icon: string; tone: string }> = {
    VendorPayment: { icon: "$", tone: "bg-emerald-500/20 text-emerald-300" },
    EmployeePayment: { icon: "👤", tone: "bg-sky-500/20 text-sky-300" },
    TravelRequest: { icon: "✈", tone: "bg-violet-500/20 text-violet-300" },
  };
  const m = map[type];
  return (
    <span
      className={`inline-flex w-7 h-7 rounded-md items-center justify-center text-sm font-bold ${m.tone}`}
      aria-hidden
    >
      {m.icon}
    </span>
  );
}

export function BPMPage() {
  const { t } = useTranslation();
  const labelOf = useStatusLabel();
  const qc = useQueryClient();
  const [tab, setTab] = useState<TabKey>("myPending");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<BPMRequestType | "all">("all");
  const [selected, setSelected] = useState<Set<number>>(new Set());

  const requestsQ = useQuery({ queryKey: ["bpm"], queryFn: BPM.listRequests });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["bpm"] });
    qc.invalidateQueries({ queryKey: ["dashboard"] });
    qc.invalidateQueries({ queryKey: ["audit"] });
  };
  const submit = useMutation({ mutationFn: (id: number) => BPM.submit(id), onSuccess: invalidate });
  const approve = useMutation({
    mutationFn: ({ id, approver }: { id: number; approver: string }) =>
      BPM.approve(id, approver, "Approved via UI"),
    onSuccess: invalidate,
  });
  const reject = useMutation({
    mutationFn: ({ id, approver }: { id: number; approver: string }) =>
      BPM.reject(id, approver, "Rejected via UI"),
    onSuccess: invalidate,
  });
  const syncBC = useMutation({ mutationFn: (id: number) => BPM.syncToBC(id), onSuccess: invalidate });

  const all = requestsQ.data ?? [];

  const myPending = useMemo(
    () =>
      all.filter((r) => {
        if (r.status !== "Submitted") return false;
        const next = r.steps.find((s) => s.decision === "Submitted");
        return next?.approver === CURRENT_USER || next?.approver === CURRENT_USER_ALT;
      }),
    [all],
  );
  const submittedByMe = useMemo(() => all.filter((r) => r.requester === CURRENT_USER), [all]);

  const visible = useMemo(() => {
    let base: BPMRequest[];
    if (tab === "myPending") base = myPending;
    else if (tab === "submittedByMe") base = submittedByMe;
    else base = all;
    return base.filter((r) => {
      if (typeFilter !== "all" && r.request_type !== typeFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${r.request_number} ${r.title} ${r.requester}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [tab, all, myPending, submittedByMe, typeFilter, search]);

  const tabs: TabSpec<TabKey>[] = [
    {
      key: "myPending",
      label: t("bpm.tabs.myPending"),
      badge: myPending.length,
      badgeTone: "danger",
    },
    {
      key: "submittedByMe",
      label: t("bpm.tabs.submittedByMe"),
      badge: submittedByMe.length,
      badgeTone: "info",
    },
    {
      key: "all",
      label: t("bpm.tabs.all"),
      badge: all.length,
      badgeTone: "neutral",
    },
  ];

  const handleRefresh = () => qc.invalidateQueries({ queryKey: ["bpm"] });
  const lastUpdated = requestsQ.dataUpdatedAt;

  if (requestsQ.isError) return <ErrorState error={requestsQ.error} />;

  const toggleSelect = (id: number) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  const handleBulkApprove = () => {
    selected.forEach((id) => {
      const req = all.find((r) => r.id === id);
      if (!req) return;
      const next = req.steps.find((s) => s.decision === "Submitted");
      if (next) approve.mutate({ id, approver: next.approver });
    });
    setSelected(new Set());
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title={t("bpm.title")}
        subtitle={t("bpm.subtitle")}
        info={t("bpm.info")}
        right={
          <>
            <RefreshButton
              isFetching={requestsQ.isFetching}
              lastUpdated={lastUpdated}
              onRefresh={handleRefresh}
            />
            {selected.size > 0 && (
              <Button variant="primary" onClick={handleBulkApprove}>
                {t("bpm.toolbar.bulkApprove", { count: selected.size })}
              </Button>
            )}
            <Button
              variant="primary"
              disabled
              title={t("common.notImplemented")}
            >
              + {t("bpm.toolbar.newRequest")}
            </Button>
          </>
        }
      />

      <Card>
        <div className="px-5 pt-3">
          <Tabs tabs={tabs} active={tab} onChange={setTab} />
        </div>

        {/* Toolbar */}
        <div className="px-5 py-3 border-b border-ms-line flex items-center gap-3 flex-wrap">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={t("bpm.toolbar.searchPlaceholder")}
            className="bg-white/5 border border-ms-line rounded-md px-3 py-1.5 text-sm w-64 max-w-full focus:outline-none focus:border-ms-blue/60"
          />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as BPMRequestType | "all")}
            className="bg-white/5 border border-ms-line rounded-md px-2 py-1.5 text-xs"
          >
            <option value="all">{t("bpm.toolbar.allTypes")}</option>
            <option value="VendorPayment">{t("bpm.types.VendorPayment")}</option>
            <option value="EmployeePayment">{t("bpm.types.EmployeePayment")}</option>
            <option value="TravelRequest">{t("bpm.types.TravelRequest")}</option>
          </select>
        </div>

        <CardBody className="p-0">
          {requestsQ.isLoading ? (
            <div className="p-3 space-y-2">
              <SkeletonRow cols={7} />
              <SkeletonRow cols={7} />
              <SkeletonRow cols={7} />
            </div>
          ) : visible.length === 0 ? (
            <BPMEmpty tab={tab} />
          ) : (
            <div className="overflow-x-auto scrollbar-soft">
              <table className="w-full text-sm min-w-[1100px]">
                <thead className="text-xs text-ms-muted uppercase tracking-wider bg-white/[0.02] border-b border-ms-line">
                  <tr>
                    <th className="w-10 px-3 py-2"></th>
                    <th className="text-left px-2 py-2 font-medium">{t("bpm.tableNew.type")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("bpm.tableNew.title")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("bpm.tableNew.submitter")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("bpm.tableNew.amount")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("bpm.tableNew.submittedDate")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("bpm.tableNew.sla")}</th>
                    <th className="text-left px-4 py-2 font-medium">{t("bpm.tableNew.approver")}</th>
                    <th className="text-right px-4 py-2 font-medium">{t("bpm.tableNew.actions")}</th>
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => {
                    const next = r.steps.find((s) => s.decision === "Submitted");
                    const stageDone = r.steps.filter((s) => s.decision !== "Submitted").length;
                    const isSelectable = tab === "myPending" && r.status === "Submitted";
                    const checked = selected.has(r.id);
                    return (
                      <tr
                        key={r.id}
                        className="border-b border-ms-line/60 hover:bg-white/[0.03] transition-colors"
                      >
                        <td className="px-3 py-2 align-middle">
                          {isSelectable && (
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleSelect(r.id)}
                              className="accent-ms-blue"
                              aria-label="Select row"
                            />
                          )}
                        </td>
                        <td className="px-2 py-2 align-middle">
                          <TypeIcon type={r.request_type} />
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <div className="font-medium font-mono text-xs text-ms-muted">
                            {r.request_number}
                          </div>
                          <div className="text-sm truncate" title={r.title}>{r.title}</div>
                          <Badge tone={statusTone(r.status)} className="mt-0.5">
                            {labelOf(r.status)}
                          </Badge>
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <div className="flex items-center gap-2">
                            <Avatar name={r.requester} size="xs" />
                            <span className="text-xs text-ms-muted truncate">
                              {r.requester === CURRENT_USER ? t("common.me") : r.requester}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-2 align-middle tabular-nums whitespace-nowrap">
                          {formatCurrency(r.amount ?? 0, r.currency)}
                        </td>
                        <td className="px-4 py-2 align-middle text-xs text-ms-muted whitespace-nowrap">
                          {formatRelative(r.created_at)}
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <SLAChip req={r} />
                        </td>
                        <td className="px-4 py-2 align-middle">
                          {next ? (
                            <div>
                              <div className="flex items-center gap-2">
                                <Avatar name={next.approver} size="xs" />
                                <span className="text-xs truncate">{next.approver}</span>
                              </div>
                              <div className="text-[10px] text-ms-muted">
                                {t("bpm.tableNew.stageOf", {
                                  current: stageDone + 1,
                                  total: r.steps.length,
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-ms-muted">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2 align-middle">
                          <div className="flex items-center justify-end gap-1">
                            {r.status === "Draft" && (
                              <Button
                                variant="primary"
                                onClick={() => submit.mutate(r.id)}
                                disabled={submit.isPending}
                              >
                                {t("bpm.actions.submit")}
                              </Button>
                            )}
                            {r.status === "Submitted" && next && (
                              <>
                                <Button
                                  variant="primary"
                                  onClick={() =>
                                    approve.mutate({ id: r.id, approver: next.approver })
                                  }
                                  disabled={approve.isPending}
                                >
                                  {t("bpm.quickActions.approve")}
                                </Button>
                                <Button
                                  variant="danger"
                                  onClick={() =>
                                    reject.mutate({ id: r.id, approver: next.approver })
                                  }
                                  disabled={reject.isPending}
                                >
                                  {t("bpm.quickActions.reject")}
                                </Button>
                              </>
                            )}
                            {r.status === "Approved" && (
                              <Button
                                variant="primary"
                                onClick={() => syncBC.mutate(r.id)}
                                disabled={syncBC.isPending}
                              >
                                {t("bpm.actions.syncToBC")}
                              </Button>
                            )}
                            {r.status === "Completed" && r.bc_sync_reference && (
                              <Badge tone="success">
                                {t("bpm.actions.bcDocument", { id: r.bc_sync_reference })}
                              </Badge>
                            )}
                          </div>
                        </td>
                      </tr>
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

function BPMEmpty({ tab }: { tab: TabKey }) {
  const { t } = useTranslation();
  if (tab === "myPending") {
    return (
      <EmptyState
        illustration="success"
        title={t("bpm.emptyStates.myPendingTitle")}
        description={t("bpm.emptyStates.myPendingDesc")}
      />
    );
  }
  if (tab === "submittedByMe") {
    return (
      <EmptyState
        illustration="inbox"
        title={t("bpm.emptyStates.submittedTitle")}
        description={t("bpm.emptyStates.submittedDesc")}
      />
    );
  }
  return (
    <EmptyState
      illustration="default"
      title={t("bpm.emptyStates.allTitle")}
      description={t("bpm.emptyStates.allDesc")}
    />
  );
}
