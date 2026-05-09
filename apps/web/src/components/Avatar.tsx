import clsx from "clsx";

const PALETTE = [
  "bg-sky-500/30 text-sky-100",
  "bg-emerald-500/30 text-emerald-100",
  "bg-amber-500/30 text-amber-100",
  "bg-violet-500/30 text-violet-100",
  "bg-rose-500/30 text-rose-100",
  "bg-cyan-500/30 text-cyan-100",
  "bg-indigo-500/30 text-indigo-100",
];

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function initials(name: string): string {
  const parts = name.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
}

/** Initial-circle avatar with a deterministic palette pick based on the name. */
export function Avatar({
  name,
  size = "sm",
  className,
}: {
  name: string;
  size?: "xs" | "sm" | "md";
  className?: string;
}) {
  const tone = PALETTE[hash(name) % PALETTE.length];
  const sizeClass =
    size === "xs"
      ? "w-5 h-5 text-[10px]"
      : size === "md"
      ? "w-8 h-8 text-xs"
      : "w-6 h-6 text-[11px]";
  return (
    <span
      className={clsx(
        "inline-flex items-center justify-center rounded-full font-semibold shrink-0",
        sizeClass,
        tone,
        className,
      )}
      title={name}
    >
      {initials(name)}
    </span>
  );
}
