"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Home, Map, Menu, Users } from "lucide-react";
import { useState } from "react";

const TABS = [
  { href: "/dashboard", label: "Dashboard", icon: Home },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/canvassing/walk", label: "Canvass", icon: Map },
  { href: "/notifications", label: "Notifications", icon: Bell },
] as const;

const MORE_GROUPS = [
  {
    title: "Overview",
    items: [
      { href: "/dashboard", label: "Dashboard" },
      { href: "/analytics", label: "Analytics" },
      { href: "/reports", label: "Reports" },
      { href: "/alerts", label: "Alerts" },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/communications/email", label: "Email Campaigns" },
      { href: "/communications/sms", label: "SMS & Text" },
      { href: "/communications/social", label: "Social Media" },
      { href: "/communications/inbox", label: "Unified Inbox" },
      { href: "/communications/ai-assistant", label: "AI Assistant" },
    ],
  },
  {
    title: "Campaign Ops",
    items: [
      { href: "/gotv", label: "GOTV" },
      { href: "/volunteers", label: "Volunteers" },
      { href: "/signs", label: "Signs" },
      { href: "/donations", label: "Donations" },
      { href: "/events", label: "Events" },
      { href: "/budget", label: "Budget" },
      { href: "/print", label: "Print" },
      { href: "/polls", label: "Polls" },
    ],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/settings/team", label: "Team" },
      { href: "/settings/security", label: "Security" },
      { href: "/billing", label: "Billing" },
      { href: "/import-export", label: "Import/Export" },
      { href: "/help", label: "Help" },
    ],
  },
] as const;

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

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
              <button
                type="button"
                onClick={() => setMoreOpen(false)}
                className="min-w-[44px] min-h-[44px] rounded-lg hover:bg-gray-100 text-gray-500"
                aria-label="Close menu"
              >
                ×
              </button>
            </div>
            <div className="p-3 space-y-4">
              {MORE_GROUPS.map((group) => (
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