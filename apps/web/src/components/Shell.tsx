import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import { LanguageSwitcher } from "./LanguageSwitcher";

const NAV_ITEMS = [
  { to: "/", key: "dashboard" as const, icon: "▦" },
  { to: "/crm", key: "crm" as const, icon: "◎" },
  { to: "/onboarding", key: "onboarding" as const, icon: "✦" },
  { to: "/bpm", key: "bpm" as const, icon: "✓" },
  { to: "/automation", key: "automation" as const, icon: "⚙" },
  { to: "/tickets", key: "tickets" as const, icon: "⚑" },
  { to: "/ai", key: "ai" as const, icon: "✺" },
  { to: "/audit", key: "audit" as const, icon: "⌥" },
];

export function Shell() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-ms-line bg-[#0a1224]/80 backdrop-blur-md flex flex-col">
        <div className="px-5 py-5 border-b border-ms-line">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-ms-blue to-indigo-500 flex items-center justify-center font-bold">
              CS
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm">{t("common.appName")}</div>
              <div className="text-xs text-ms-muted">{t("common.appSubtitle")}</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 scrollbar-soft overflow-y-auto">
          {NAV_ITEMS.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                clsx(
                  "mx-3 my-1 px-3 py-2 rounded-md flex items-center gap-3 text-sm transition-colors",
                  isActive
                    ? "bg-ms-blue/15 text-white border-l-2 border-ms-blue"
                    : "text-ms-muted hover:bg-white/5 hover:text-white",
                )
              }
            >
              <span className="text-base opacity-80">{item.icon}</span>
              <span>{t(`nav.${item.key}` as const)}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-ms-line text-xs text-ms-muted leading-relaxed">
          <div className="font-medium text-ms-text">{t("common.demoMode")}</div>
          <div>{t("common.demoMockMessage")}</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="h-14 border-b border-ms-line bg-[#0a1224]/60 backdrop-blur-md px-6 flex items-center justify-between gap-4">
          <div className="text-sm text-ms-muted truncate">{t("common.demoBanner")}</div>
          <div className="flex items-center gap-3 text-xs text-ms-muted">
            <LanguageSwitcher />
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 whitespace-nowrap">
              ● {t("common.mockBadge")}
            </span>
          </div>
        </header>
        <div className="p-6 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
