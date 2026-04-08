"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Menu, Search, Users, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

const TABS = [
  { type: "route", href: "/dashboard", label: "Dashboard", icon: Home },
  { type: "route", href: "/contacts", label: "Contacts", icon: Users },
  { type: "action", action: "search", label: "Search", icon: Search },
  { type: "route", href: "/canvassing/walk", label: "Walk List", icon: Map },
] as const;

const MORE_GROUPS = [
  {
    title: "Command",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/command-center", label: "Command Center" },
      { href: "/election-night", label: "Election Night" },
      { href: "/alerts", label: "Alerts" },
    ],
  },
  {
    title: "Field Ops",
    items: [
      { href: "/contacts", label: "Contacts" },
      { href: "/canvassing", label: "Canvassing" },
      { href: "/canvassing/walk", label: "Walk List" },
      { href: "/lookup", label: "Lookup" },
      { href: "/gotv", label: "GOTV" },
      { href: "/volunteers", label: "Volunteers" },
      { href: "/events", label: "Events" },
      { href: "/calendar", label: "Calendar" },
      { href: "/tasks", label: "Tasks" },
      { href: "/signs", label: "Signs" },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/communications", label: "Communications" },
      { href: "/communications/social", label: "Social Media" },
    ],
  },
  {
    title: "Fundraising & Finance",
    items: [
      { href: "/donations", label: "Donations" },
      { href: "/budget", label: "Budget" },
      { href: "/analytics", label: "Analytics" },
      { href: "/reports", label: "Reports" },
      { href: "/billing", label: "Billing" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/officials", label: "Officials" },
      { href: "/media", label: "Media" },
      { href: "/coalitions", label: "Coalitions" },
      { href: "/intelligence", label: "Opponent Intel" },
      { href: "/polls", label: "Polls" },
    ],
  },
  {
    title: "Operations",
    items: [
      { href: "/print", label: "Print" },
      { href: "/import-export", label: "Import/Export" },
      { href: "/ops/videos", label: "Ops Videos" },
      { href: "/ops/verify", label: "Ops Verify" },
      { href: "/ops/security", label: "Ops Security" },
    ],
  },
  {
    title: "Settings & Help",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/settings/brand", label: "Brand Kit" },
      { href: "/settings/team", label: "Team" },
      { href: "/settings/security", label: "Security" },
      { href: "/help", label: "Help Center" },
      { href: "/resources", label: "Resources" },
    ],
  },
] as const;

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "").toString().toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";

  function openSearch() {
    window.dispatchEvent(new CustomEvent("pollcity:open-search"));
  }

  useEffect(() => {
    const open = () => setMoreOpen(true);
    window.addEventListener("pollcity:open-mobile-menu", open as EventListener);
    return () => {
      window.removeEventListener("pollcity:open-mobile-menu", open as EventListener);
    };
  }, []);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around h-[60px]">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            if (tab.type === "route") {
              const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 ${
                    active ? "text-blue-600" : "text-gray-400"
                  }`}
                >
                  <Icon className={`w-5 h-5 ${active ? "fill-current" : ""}`} />
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={tab.action}
                type="button"
                onClick={openSearch}
                className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-gray-400"
                aria-label="Open search"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => setMoreOpen(true)}
            className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-gray-400"
            aria-label="Open more navigation"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      <div className="md:hidden" style={{ height: "calc(60px + env(safe-area-inset-bottom))" }} aria-hidden />

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
          <div className="absolute inset-0 bg-black/40" onClick={() => setMoreOpen(false)} aria-hidden />
          <div className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white max-h-[85vh] overflow-y-auto animate-fade-in" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
            <div className="sticky top-0 border-b border-gray-100 bg-white px-5 py-3 flex items-center justify-between rounded-t-3xl">
              <h2 className="font-bold text-gray-900">More</h2>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={openSearch}
                  className="min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 text-gray-500 inline-flex items-center justify-center"
                  aria-label="Open search"
                >
                  <Search className="w-5 h-5" />
                </button>
                <button
                  type="button"
                  onClick={() => setMoreOpen(false)}
                  className="min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 text-gray-500 inline-flex items-center justify-center"
                  aria-label="Close menu"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="p-3 space-y-4">
              {MORE_GROUPS
                .filter((group) => isAdmin || group.title !== "Operations")
                .map((group) => (
                <section key={group.title}>
                  <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wide text-gray-500">{group.title}</p>
                  <div className="space-y-0.5">
                    {group.items.map((item) => {
                      const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMoreOpen(false)}
                          className={`block min-h-[44px] px-3 py-3 rounded-lg text-sm font-medium transition-colors ${
                            active ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                          }`}
                        >
                          {item.label}
                        </Link>
                      );
                    })}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
