import type { ReactNode } from "react";
import { InfoTip } from "./InfoTip";

/**
 * Standard page header used by every redesigned page:
 *
 *   <h1>Title</h1> <(?)>     [right-side toolbar slot]
 *   <subtitle>
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
          <h1 className="text-2xl font-semibold">{title}</h1>
          {info && <InfoTip>{info}</InfoTip>}
        </div>
        {subtitle && <p className="text-sm text-ms-muted mt-1">{subtitle}</p>}
      </div>
      {right && <div className="flex items-center gap-3 flex-wrap shrink-0">{right}</div>}
    </div>
  );
}
