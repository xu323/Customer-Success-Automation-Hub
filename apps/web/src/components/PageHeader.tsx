import type { ReactNode } from "react";
import { InfoTip } from "./InfoTip";

/**
 * Standard page header used by every page.
 */
export function PageHeader({
  title,
  subtitle,
  info,
  right,
}: {
  title: string;
  subtitle?: string;
  info?: ReactNode;
  right?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div className="min-w-0">
        <div className="flex items-center gap-2">
          <h1 className="text-xl font-semibold text-neutral-190">{title}</h1>
          {info && <InfoTip>{info}</InfoTip>}
        </div>
        {subtitle && <p className="text-sm text-neutral-130 mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-2 flex-wrap shrink-0">{right}</div>}
    </div>
  );
}
