import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";
import { useTranslation } from "react-i18next";
import {
  LayoutDashboard,
  Briefcase,
  Users,
  ClipboardCheck,
  Workflow,
  AlertTriangle,
  Sparkles,
  ScrollText,
  type LucideIcon,
} from "lucide-react";
import { LanguageSwitcher } from "./LanguageSwitcher";
import { DensityToggle } from "./DensityToggle";

interface NavItem {
  to: string;
  key:
    | "dashboard"
    | "crm"
    | "onboarding"
    | "bpm"
    | "automation"
    | "tickets"
    | "ai"
    | "audit";
  Icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { to: "/", key: "dashboard", Icon: LayoutDashboard },
  { to: "/crm", key: "crm", Icon: Briefcase },
  { to: "/onboarding", key: "onboarding", Icon: Users },
  { to: "/bpm", key: "bpm", Icon: ClipboardCheck },
  { to: "/automation", key: "automation", Icon: Workflow },
  { to: "/tickets", key: "tickets", Icon: AlertTriangle },
  { to: "/ai", key: "ai", Icon: Sparkles },
  { to: "/audit", key: "audit", Icon: ScrollText },
];

export function Shell() {
  const { t } = useTranslation();

  return (
    <div className="min-h-screen flex bg-neutral-10">
      <aside className="w-[260px] shrink-0 border-r border-neutral-40 bg-white flex flex-col">
        <div className="px-4 py-4 border-b border-neutral-40">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded bg-brand-500 text-white flex items-center justify-center font-bold shrink-0">
              CS
            </div>
            <div className="leading-tight min-w-0">
              <div className="font-semibold text-sm text-neutral-190 truncate">
                {t("common.appName")}
              </div>
              <div className="text-xs text-neutral-130 truncate">
                {t("common.appSubtitle")}
              </div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-2 scrollbar-soft overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const label = t(`nav.${item.key}` as const);
            const Icon = item.Icon;
            return (
              <NavLink
                key={item.to}
                to={item.to}
                end={item.to === "/"}
                title={label}
                className={({ isActive }) =>
                  clsx(
                    "mx-2 my-0.5 px-3 py-2 rounded flex items-center gap-3 text-sm transition-colors min-w-0",
                    isActive
                      ? "bg-brand-50 text-brand-700 font-semibold border-l-[3px] border-brand-500"
                      : "text-neutral-160 hover:bg-neutral-20",
                  )
                }
              >
                <Icon size={18} strokeWidth={1.75} className="shrink-0" aria-hidden />
                <span className="truncate">{label}</span>
              </NavLink>
            );
          })}
        </nav>
        <div className="p-3 border-t border-neutral-40 text-xs text-neutral-130 leading-relaxed">
          <div className="font-semibold text-neutral-190 mb-0.5">
            {t("common.demoMode")}
          </div>
          <div>{t("common.demoMockMessage")}</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="h-12 border-b border-neutral-40 bg-white px-5 flex items-center justify-between gap-4">
          <div className="text-xs text-neutral-130 truncate">
            {t("common.demoBanner")}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <DensityToggle />
            <LanguageSwitcher />
            <span className="hidden md:inline-flex items-center gap-1.5 h-8 px-2 rounded bg-success-bg text-success border border-success/30 text-xs font-semibold whitespace-nowrap">
              <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-success" />
              {t("common.mockBadge")}
            </span>
          </div>
        </header>
        <div className="p-5 max-w-[1400px] mx-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
