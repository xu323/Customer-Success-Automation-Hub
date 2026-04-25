import type { ReactNode } from "react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-ms-muted text-sm">
      <span className="inline-block h-3 w-3 rounded-full bg-ms-blue animate-pulse" />
      {label}
    </div>
  );
}

export function ErrorState({ error }: { error: unknown }) {
  const message = error instanceof Error ? error.message : String(error);
  return (
    <div className="rounded-md border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
      <div className="font-semibold mb-1">Something went wrong</div>
      <div className="opacity-80 break-all">{message}</div>
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: ReactNode }) {
  return (
    <div className="border border-dashed border-ms-line rounded-md px-6 py-10 text-center text-ms-muted">
      <div className="text-sm font-medium text-ms-text mb-1">{title}</div>
      {hint && <div className="text-xs">{hint}</div>}
    </div>
  );
}
