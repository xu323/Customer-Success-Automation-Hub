import { NavLink, Outlet } from "react-router-dom";
import clsx from "clsx";

const NAV = [
  { to: "/", label: "Executive Dashboard", icon: "▦" },
  { to: "/crm", label: "CRM Pipeline", icon: "◎" },
  { to: "/onboarding", label: "Customer Onboarding", icon: "✦" },
  { to: "/bpm", label: "BPM Requests", icon: "✓" },
  { to: "/automation", label: "Automation Flows", icon: "⚙" },
  { to: "/tickets", label: "IT Operation", icon: "⚑" },
  { to: "/ai", label: "AI Assistant", icon: "✺" },
  { to: "/audit", label: "Audit Logs", icon: "⌥" },
];

export function Shell() {
  return (
    <div className="min-h-screen flex">
      <aside className="w-64 shrink-0 border-r border-ms-line bg-[#0a1224]/80 backdrop-blur-md flex flex-col">
        <div className="px-5 py-5 border-b border-ms-line">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-md bg-gradient-to-br from-ms-blue to-indigo-500 flex items-center justify-center font-bold">
              CS
            </div>
            <div className="leading-tight">
              <div className="font-semibold text-sm">Customer Success</div>
              <div className="text-xs text-ms-muted">Automation Hub</div>
            </div>
          </div>
        </div>
        <nav className="flex-1 py-3 scrollbar-soft overflow-y-auto">
          {NAV.map((item) => (
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
              <span>{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-ms-line text-xs text-ms-muted leading-relaxed">
          <div className="font-medium text-ms-text">Demo mode</div>
          <div>All Microsoft connectors are running in mock mode. Switch via .env.</div>
        </div>
      </aside>
      <main className="flex-1 min-w-0">
        <header className="h-14 border-b border-ms-line bg-[#0a1224]/60 backdrop-blur-md px-6 flex items-center justify-between">
          <div className="text-sm text-ms-muted">
            Microsoft Business Application Demo · Dynamics 365 · Business Central · Power Automate
          </div>
          <div className="flex items-center gap-3 text-xs text-ms-muted">
            <span className="px-2 py-1 rounded bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
              ● Mock connectors
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
