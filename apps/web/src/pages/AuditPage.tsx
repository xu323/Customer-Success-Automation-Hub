import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Audit } from "@/api/endpoints";
import { Card, CardBody, CardHeader } from "@/components/Card";
import { Badge, statusTone } from "@/components/Badge";
import { ErrorState, LoadingState } from "@/components/StateMessages";
import { formatDate } from "@/lib/format";

export function AuditPage() {
  const [entityType, setEntityType] = useState("");
  const [actionType, setActionType] = useState("");
  const [search, setSearch] = useState("");

  const q = useQuery({
    queryKey: ["audit", entityType, actionType],
    queryFn: () => Audit.list({ entity_type: entityType || undefined, action_type: actionType || undefined, limit: 200 }),
  });

  if (q.isLoading) return <LoadingState />;
  if (q.isError) return <ErrorState error={q.error} />;

  const filtered = (q.data ?? []).filter((row) => {
    const haystack = `${row.action_type} ${row.entity_type} ${row.entity_id ?? ""} ${row.message ?? ""} ${row.actor}`.toLowerCase();
    return haystack.includes(search.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Audit Logs</h1>
        <p className="text-sm text-ms-muted">所有 CRM、BPM、Automation、Tickets 行為的事件流。</p>
      </div>

      <Card>
        <CardHeader title="Filters" />
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm" placeholder="entity type (e.g. BPMRequest)" value={entityType} onChange={(e) => setEntityType(e.target.value)} />
            <input className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm" placeholder="action type (e.g. lead.created)" value={actionType} onChange={(e) => setActionType(e.target.value)} />
            <input className="bg-white/5 border border-ms-line rounded-md px-3 py-2 text-sm md:col-span-2" placeholder="full text search" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader title="Events" subtitle={`${filtered.length} events`} />
        <CardBody className="p-0">
          <table className="w-full text-sm">
            <thead className="text-xs text-ms-muted bg-white/[0.02] border-b border-ms-line">
              <tr>
                <th className="text-left px-4 py-2 font-medium">Time</th>
                <th className="text-left px-4 py-2 font-medium">Actor</th>
                <th className="text-left px-4 py-2 font-medium">Action</th>
                <th className="text-left px-4 py-2 font-medium">Entity</th>
                <th className="text-left px-4 py-2 font-medium">Status</th>
                <th className="text-left px-4 py-2 font-medium">Message</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.id} className="border-b border-ms-line/60 align-top">
                  <td className="px-4 py-2 text-xs text-ms-muted whitespace-nowrap">{formatDate(row.timestamp)}</td>
                  <td className="px-4 py-2">{row.actor}</td>
                  <td className="px-4 py-2 font-mono text-xs">{row.action_type}</td>
                  <td className="px-4 py-2 text-ms-muted">{row.entity_type}{row.entity_id ? ` #${row.entity_id}` : ""}</td>
                  <td className="px-4 py-2"><Badge tone={statusTone(row.status)}>{row.status}</Badge></td>
                  <td className="px-4 py-2 text-xs">
                    {row.message}
                    {row.error_message && <div className="text-rose-300 mt-1">{row.error_message}</div>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={6} className="px-4 py-6 text-center text-ms-muted">No matching events.</td></tr>
              )}
            </tbody>
          </table>
        </CardBody>
      </Card>
    </div>
  );
}
