import type { ReactNode } from "react";
import { NavLink, Outlet } from "react-router-dom";
import { Moon, Sun, MonitorSmartphone, WifiOff } from "lucide-react";
import { cn } from "@/lib/cn";
import { bottomNavItems, sidebarSections } from "@/layouts/nav";
import { useOnlineStatus } from "@/hooks/useOnlineStatus";
import { useTheme } from "@/hooks/useTheme";

function ThemeToggle() {
  const [pref, setPref] = useTheme();
  const cycle = () => setPref(pref === "light" ? "dark" : pref === "dark" ? "system" : "light");
  const Icon = pref === "light" ? Sun : pref === "dark" ? Moon : MonitorSmartphone;
  return (
    <button
      type="button"
      onClick={cycle}
      className="focus-ring flex h-10 w-10 items-center justify-center rounded-xl text-text-muted hover:bg-surface-muted"
      aria-label={`Theme: ${pref}. Activate to change.`}
      title={`Theme: ${pref}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}

function OnlineBadge() {
  const online = useOnlineStatus();
  if (online) return null;
  return (
    <div className="flex items-center gap-1.5 rounded-full bg-attention-soft px-2.5 py-1 text-xs font-medium text-attention">
      <WifiOff className="h-3.5 w-3.5" aria-hidden="true" />
      Offline — changes save on this device
    </div>
  );
}

function TopBar({ title }: { title: string }) {
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center justify-between border-b border-border bg-surface/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-surface/70 sm:px-6">
      <h1 className="text-base font-semibold text-text">{title}</h1>
      <div className="flex items-center gap-2">
        <OnlineBadge />
        <ThemeToggle />
      </div>
    </header>
  );
}

function BottomNav() {
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 items-stretch border-t border-border bg-surface/95 backdrop-blur pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Primary"
    >
      {bottomNavItems.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          end={to === "/"}
          className={({ isActive }) =>
            cn(
              "focus-ring flex flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium",
              isActive ? "text-brand" : "text-text-muted",
            )
          }
        >
          <Icon className="h-5 w-5" aria-hidden="true" />
          {label}
        </NavLink>
      ))}
    </nav>
  );
}

function Sidebar() {
  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface sm:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-5">
        <span className="text-lg font-bold text-brand">FitJourney</span>
      </div>
      <nav className="flex-1 space-y-5 overflow-y-auto p-4" aria-label="Primary">
        {sidebarSections.map((section) => (
          <div key={section.heading}>
            <p className="mb-1.5 px-2 text-xs font-semibold uppercase tracking-wide text-text-muted">
              {section.heading}
            </p>
            <div className="space-y-0.5">
              {section.items.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === "/"}
                  className={({ isActive }) =>
                    cn(
                      "focus-ring flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-medium",
                      isActive ? "bg-brand-soft text-brand" : "text-text-muted hover:bg-surface-muted hover:text-text",
                    )
                  }
                >
                  <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                  {label}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}

export function AppLayout({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <div className="flex min-h-dvh flex-1 flex-col">
        <TopBar title={title} />
        <main className="flex-1 px-4 pb-24 pt-4 sm:px-6 sm:pb-8">
          <div className="mx-auto w-full max-w-3xl">{children ?? <Outlet />}</div>
        </main>
        <BottomNav />
      </div>
    </div>
  );
}
