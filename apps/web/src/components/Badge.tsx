import clsx from "clsx";
import type { ReactNode } from "react";
import { useTranslation } from "react-i18next";

type Tone =
  | "neutral"
  | "info"
  | "success"
  | "warning"
  | "danger"
  | "violet";

const toneClasses: Record<Tone, string> = {
  neutral: "bg-slate-500/15 text-neutral-160 border-slate-500/20",
  info: "bg-sky-500/15 text-brand-700 border-sky-500/20",
  success: "bg-emerald-500/15 text-success border-emerald-500/20",
  warning: "bg-amber-500/15 text-warning border-amber-500/20",
  danger: "bg-rose-500/15 text-danger border-rose-500/20",
  violet: "bg-violet-500/15 text-brand-700 border-violet-500/20",
};

export function Badge({
  tone = "neutral",
  children,
  className,
}: {
  tone?: Tone;
  children: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        toneClasses[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

export function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (["won", "approved", "completed", "succeeded", "done", "resolved", "within_sla"].includes(s)) return "success";
  if (["draft", "todo", "new", "pending", "planning", "open"].includes(s)) return "neutral";
  if (["proposal", "submitted", "in_progress", "running", "contacted", "sent"].includes(s)) return "info";
  if (["negotiation", "qualification", "at_risk", "on_hold"].includes(s)) return "warning";
  if (["rejected", "failed", "lost", "blocked", "breached", "disqualified"].includes(s)) return "danger";
  return "neutral";
}

export function severityTone(severity: string): Tone {
  switch (severity) {
    case "sev1":
      return "danger";
    case "sev2":
      return "warning";
    case "sev3":
      return "info";
    default:
      return "neutral";
  }
}

export function riskTone(level: string): Tone {
  switch (level) {
    case "high":
      return "danger";
    case "medium":
      return "warning";
    case "low":
      return "success";
    default:
      return "neutral";
  }
}

/**
 * Return the localized label for a known status / severity / risk value.
 * Falls back to the raw key if no translation exists.
 */
export function useStatusLabel() {
  const { t } = useTranslation();
  return (key: string) => {
    const candidates = [
      `status.${key}`,
      `severity.${key}`,
      `risk.${key}`,
    ];
    for (const c of candidates) {
      const v = t(c, { defaultValue: "" });
      if (v) return v;
    }
    return key;
  };
}
