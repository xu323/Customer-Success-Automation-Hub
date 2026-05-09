/**
 * Helpers that turn raw data (audit logs, runs, ...) into the daily counts and
 * deltas that drive the sparklines + trend chips on the redesigned pages.
 */
import type { AuditLog } from "@/types";

export interface DailyBucket {
  date: string; // YYYY-MM-DD
  count: number;
}

/** Build N daily buckets ending today (oldest first). */
export function dailyBuckets<T>(
  items: T[],
  days: number,
  getTimestamp: (t: T) => string | undefined | null,
  predicate?: (t: T) => boolean,
): DailyBucket[] {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const dayMs = 24 * 60 * 60 * 1000;
  const start = today.getTime() - (days - 1) * dayMs;

  const buckets: DailyBucket[] = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(start + i * dayMs);
    buckets.push({
      date: d.toISOString().slice(0, 10),
      count: 0,
    });
  }
  const indexByDate = new Map(buckets.map((b, i) => [b.date, i]));

  for (const item of items) {
    if (predicate && !predicate(item)) continue;
    const ts = getTimestamp(item);
    if (!ts) continue;
    const day = ts.slice(0, 10);
    const idx = indexByDate.get(day);
    if (idx !== undefined) buckets[idx].count++;
  }
  return buckets;
}

/**
 * Compare current period vs previous period of equal length.
 * Returns the % change; null if previous total is 0 and current is also 0.
 */
export function periodOverPeriod<T>(
  items: T[],
  days: number,
  getTimestamp: (t: T) => string | undefined | null,
  predicate?: (t: T) => boolean,
): { current: number; previous: number; delta: number | null } {
  const dayMs = 24 * 60 * 60 * 1000;
  const now = Date.now();
  const currentStart = now - days * dayMs;
  const previousStart = now - 2 * days * dayMs;

  let current = 0;
  let previous = 0;
  for (const it of items) {
    if (predicate && !predicate(it)) continue;
    const ts = getTimestamp(it);
    if (!ts) continue;
    const t = new Date(ts).getTime();
    if (Number.isNaN(t)) continue;
    if (t >= currentStart) current++;
    else if (t >= previousStart) previous++;
  }
  if (previous === 0 && current === 0) return { current, previous, delta: null };
  if (previous === 0) return { current, previous, delta: 100 };
  const delta = ((current - previous) / previous) * 100;
  return { current, previous, delta };
}

/**
 * Deterministic mock trend % keyed on a string. Used for KPIs that we don't
 * have time-series data for yet (e.g. point-in-time pipeline value). Keeps
 * the UI consistent across reloads instead of jittering.
 */
export function mockTrend(seed: string, range = [-20, 28]): number {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  const span = range[1] - range[0];
  return range[0] + Math.abs(hash % span);
}

/** Filter audit logs by action prefix. */
export function logsMatching(logs: AuditLog[], prefix: string): AuditLog[] {
  return logs.filter((l) => l.action_type.startsWith(prefix));
}
