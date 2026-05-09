import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Rows3, Rows2, Rows4 } from "lucide-react";

type Density = "compact" | "default" | "comfy";
const STORAGE_KEY = "csah-density";

function applyDensity(d: Density) {
  if (typeof document !== "undefined") {
    document.documentElement.setAttribute("data-density", d);
  }
}

export function DensityToggle() {
  const { t } = useTranslation();
  const [density, setDensity] = useState<Density>(() => {
    if (typeof window === "undefined") return "default";
    return (window.localStorage.getItem(STORAGE_KEY) as Density) ?? "default";
  });

  useEffect(() => {
    applyDensity(density);
    try {
      window.localStorage.setItem(STORAGE_KEY, density);
    } catch {
      /* localStorage unavailable */
    }
  }, [density]);

  const options: { key: Density; Icon: typeof Rows3; label: string }[] = [
    { key: "compact", Icon: Rows4, label: t("common.densityCompact") },
    { key: "default", Icon: Rows3, label: t("common.densityDefault") },
    { key: "comfy",   Icon: Rows2, label: t("common.densityComfy") },
  ];

  return (
    <div
      role="radiogroup"
      aria-label={t("common.density")}
      className="inline-flex items-center gap-0.5 rounded border border-neutral-40 bg-white p-0.5"
    >
      {options.map(({ key, Icon, label }) => {
        const active = density === key;
        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={active}
            title={label}
            onClick={() => setDensity(key)}
            className={
              "h-7 w-7 rounded flex items-center justify-center transition-colors " +
              (active
                ? "bg-brand-50 text-brand-700"
                : "text-neutral-130 hover:bg-neutral-20 hover:text-neutral-190")
            }
          >
            <Icon size={14} strokeWidth={1.75} aria-hidden />
          </button>
        );
      })}
    </div>
  );
}
