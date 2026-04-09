"use client";
import { signOut, useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { LogOut, ChevronDown, Menu, Search, BellRing, AlertTriangle, ChevronRight } from "lucide-react";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import Link from "next/link";

type Role = "SUPER_ADMIN" | "ADMIN" | "CAMPAIGN_MANAGER" | "VOLUNTEER" | string;

interface TopBarProps {
  user: { name?: string | null; email?: string | null; role: Role };
}

const roleBadge: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  CAMPAIGN_MANAGER: "bg-green-100 text-green-700",
  VOLUNTEER: "bg-gray-100 text-gray-600",
};

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CAMPAIGN_MANAGER: "Manager",
  VOLUNTEER: "Volunteer",
};

interface AlertSummaryItem {
  id: string;
  severity: "critical" | "warning" | "watch";
  title: string;
  module: string;
}

interface AlertSummary {
  critical: number;
  warning: number;
  top: AlertSummaryItem[];
}

const SEV_COLOR: Record<string, string> = {
  critical: "text-red-600",
  warning: "text-amber-600",
  watch: "text-blue-600",
};

export default function TopBar({ user }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const [alertOpen, setAlertOpen] = useState(false);
  const [alertData, setAlertData] = useState<AlertSummary | null>(null);
  const alertRef = useRef<HTMLDivElement | null>(null);
  const { data: session } = useSession();
  const initials = user.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "??";

  // Get active campaignId from session
  const campaignId = (session?.user as { activeCampaignId?: string | null } | undefined)?.activeCampaignId ?? null;

  // Fetch alert summary every 5 minutes
  useEffect(() => {
    if (!campaignId) return;
    let cancelled = false;

    async function fetchAlerts() {
      try {
        const res = await fetch(`/api/alerts/summary?campaignId=${campaignId}`, { cache: "no-store" });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        setAlertData(data);
      } catch { /* silent */ }
    }

    fetchAlerts();
    const interval = setInterval(fetchAlerts, 5 * 60 * 1000);
    return () => { cancelled = true; clearInterval(interval); };
  }, [campaignId]);

  // Close alert dropdown on outside click
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (alertRef.current && !alertRef.current.contains(e.target as Node)) setAlertOpen(false);
    }
    if (alertOpen) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [alertOpen]);

  function openSearch() { window.dispatchEvent(new CustomEvent("pollcity:open-search")); }
  function openMobileMenu() { window.dispatchEvent(new CustomEvent("pollcity:open-mobile-menu")); }

  const totalAlerts = (alertData?.critical ?? 0) + (alertData?.warning ?? 0);
  const hasCritical = (alertData?.critical ?? 0) > 0;

  return (
    <header
      className="bg-white dark:bg-slate-900 border-b border-gray-200 dark:border-slate-700 flex flex-col flex-shrink-0"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="h-14 flex items-center justify-between px-3 sm:px-6" style={{ paddingRight: "max(0.75rem, env(safe-area-inset-right))" }}>
      <div className="flex-1 flex items-center gap-2">
        <button
          type="button"
          onClick={openMobileMenu}
          className="md:hidden inline-flex items-center justify-center w-9 h-9 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          aria-label="Open mobile menu"
        >
          <Menu className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={openSearch}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-gray-200 dark:border-slate-700 text-gray-700 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          aria-label="Open global search"
        >
          <Search className="w-4 h-4" />
          <span className="hidden sm:inline text-sm font-medium">Search</span>
          <span className="hidden lg:inline text-xs text-gray-500">Ctrl+K</span>
        </button>
      </div>

      <div className="flex items-center gap-1">
        {/* Alert Bell */}
        {campaignId && (
          <div className="relative" ref={alertRef}>
            <button
              type="button"
              onClick={() => setAlertOpen((v) => !v)}
              className="relative inline-flex items-center justify-center w-9 h-9 rounded-lg text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
              aria-label="Campaign alerts"
            >
              <BellRing className={`w-4.5 h-4.5 ${hasCritical ? "text-red-500" : totalAlerts > 0 ? "text-amber-500" : "text-gray-400"}`} />
              {totalAlerts > 0 && (
                <span className={`absolute top-1 right-1 min-w-[16px] h-4 px-0.5 rounded-full text-[10px] font-bold text-white flex items-center justify-center ${hasCritical ? "bg-red-500" : "bg-amber-500"}`}>
                  {totalAlerts > 9 ? "9+" : totalAlerts}
                </span>
              )}
            </button>

            {alertOpen && (
              <>
                <div className="fixed inset-0 z-10" onClick={() => setAlertOpen(false)} />
                <div className="absolute right-0 top-full mt-1.5 w-72 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20 overflow-hidden">
                  <div className="flex items-center justify-between px-3 py-2.5 border-b border-gray-100 dark:border-slate-700 bg-gray-50 dark:bg-slate-900">
                    <p className="text-xs font-bold text-gray-700 dark:text-slate-300 uppercase tracking-wider">Campaign Alerts</p>
                    <Link href="/alerts" onClick={() => setAlertOpen(false)} className="text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium flex items-center gap-0.5">
                      View all <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>

                  {!alertData || totalAlerts === 0 ? (
                    <div className="px-3 py-5 text-center">
                      <p className="text-xs text-gray-400 font-medium">All clear — no active alerts</p>
                    </div>
                  ) : (
                    <div className="py-1 max-h-60 overflow-y-auto">
                      {alertData.top.map((a) => (
                        <Link key={a.id} href="/alerts" onClick={() => setAlertOpen(false)}
                          className="flex items-start gap-2.5 px-3 py-2.5 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors border-b border-gray-50 dark:border-slate-700 last:border-0">
                          <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 flex-shrink-0 ${SEV_COLOR[a.severity]}`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 dark:text-slate-200 leading-snug truncate">{a.title}</p>
                            <p className={`text-[10px] font-medium uppercase tracking-wide mt-0.5 ${SEV_COLOR[a.severity]}`}>{a.severity} · {a.module}</p>
                          </div>
                        </Link>
                      ))}
                      {hasCritical && (
                        <div className="px-3 py-2 bg-red-50 border-t border-red-100">
                          <p className="text-[11px] text-red-700 font-semibold">{alertData.critical} critical issue{alertData.critical !== 1 ? "s" : ""} need attention</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* User menu */}
        <div className="relative">
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5 hover:bg-gray-50 dark:hover:bg-slate-800 rounded-lg px-2 py-1.5 transition-colors"
          >
            <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
              <span className="text-xs font-bold text-white">{initials}</span>
            </div>
            <div className="hidden sm:block text-left">
              <p className="text-sm font-medium text-gray-900 dark:text-slate-100 leading-tight">{user.name ?? user.email}</p>
              <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleBadge[user.role] ?? roleBadge.VOLUNTEER}`}>
                {roleLabel[user.role] ?? user.role}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 dark:text-slate-500" />
          </button>

          {open && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
              <div className="absolute right-0 top-full mt-1 w-52 bg-white dark:bg-slate-800 border border-gray-200 dark:border-slate-700 rounded-xl shadow-lg z-20 py-1">
                <div className="px-3 py-2 border-b border-gray-100 dark:border-slate-700">
                  <p className="text-sm font-medium text-gray-900 dark:text-slate-100">{user.name}</p>
                  <p className="text-xs text-gray-500 dark:text-slate-400 truncate">{user.email}</p>
                </div>
                <ThemeToggle />
                <button
                  onClick={() => signOut({ callbackUrl: "/login" })}
                  className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
      </div>
    </header>
  );
}
