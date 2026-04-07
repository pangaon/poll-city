"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Map, Menu, Search, Users, X } from "lucide-react";
import { useState } from "react";

const ITEMS = [
  { type: "route", href: "/dashboard", label: "Dashboard", icon: Home },
  { type: "route", href: "/contacts", label: "Contacts", icon: Users },
  { type: "action", action: "search", label: "Search", icon: Search },
  { type: "route", href: "/canvassing/walk", label: "Walk List", icon: Map },
] as const;

const SECTIONS = [
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
    title: "Contacts & Field",
    items: [
      { href: "/contacts", label: "Contacts" },
      { href: "/canvassing", label: "Canvassing" },
      { href: "/canvassing/walk", label: "Walk List" },
      { href: "/gotv", label: "GOTV" },
      { href: "/lookup", label: "Lookup" },
    ],
  },
  {
    title: "Communications",
    items: [
      { href: "/communications/email", label: "Email Campaigns" },
      { href: "/communications/sms", label: "SMS & Text" },
      { href: "/communications/social", label: "Social Media" },
      { href: "/communications/inbox", label: "Unified Inbox" },
      { href: "/ai-assist", label: "AI Assist" },
    ],
  },
  {
    title: "Campaign Ops",
    items: [
      { href: "/volunteers", label: "Volunteers" },
      { href: "/signs", label: "Signs" },
      { href: "/donations", label: "Donations" },
      { href: "/events", label: "Events" },
      { href: "/calendar", label: "Calendar" },
      { href: "/budget", label: "Budget" },
      { href: "/print", label: "Print" },
      { href: "/polls", label: "Polls" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/officials", label: "Officials" },
      { href: "/media", label: "Media" },
      { href: "/coalitions", label: "Coalitions" },
      { href: "/intelligence", label: "Opponent Intel" },
    ],
  },
  {
    title: "Resources",
    items: [{ href: "/resources", label: "Resources" }],
  },
  {
    title: "Settings",
    items: [
      { href: "/settings", label: "Settings" },
      { href: "/settings/brand", label: "Brand Kit" },
      { href: "/settings/team", label: "Team" },
      { href: "/settings/security", label: "Security" },
      { href: "/billing", label: "Billing" },
      { href: "/import-export", label: "Import/Export" },
      { href: "/help", label: "Help Center" },
    ],
  },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  function openSearch() {
    window.dispatchEvent(new CustomEvent("pollcity:open-search"));
  }

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around" style={{ height: 60 }}>
          {ITEMS.map((item) => {
            const Icon = item.icon;
            if (item.type === "route") {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex-1 flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] transition-colors ${
                    isActive ? "text-blue-600" : "text-gray-500 hover:text-gray-900"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={isActive ? 2.5 : 2} />
                  <span className="text-[10px] font-semibold">{item.label}</span>
                </Link>
              );
            }

            return (
              <button
                key={item.action}
                onClick={openSearch}
                aria-label="Open search"
                className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-gray-500 hover:text-gray-900 transition-colors"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{item.label}</span>
              </button>
            );
          })}
          <button
            onClick={() => setMoreOpen(true)}
            aria-label="Open full menu"
            className="flex-1 flex flex-col items-center justify-center gap-0.5 min-w-[44px] min-h-[44px] text-gray-500 hover:text-gray-900 transition-colors"
          >
            <Menu className="w-5 h-5" />
            <span className="text-[10px] font-semibold">More</span>
          </button>
        </div>
      </nav>

      <div className="md:hidden" style={{ height: "calc(60px + env(safe-area-inset-bottom))" }} aria-hidden />

      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} onOpenSearch={openSearch} />}
    </>
  );
}

function MoreSheet({ onClose, onOpenSearch }: { onClose: () => void; onOpenSearch: () => void }) {
  const pathname = usePathname();

  return (
    <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-fade-in"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between rounded-t-3xl">
          <h2 className="font-bold text-gray-900">Menu</h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onOpenSearch}
              aria-label="Open search"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            >
              <Search className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              aria-label="Close menu"
              className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 min-w-[44px] min-h-[44px] inline-flex items-center justify-center"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-3 space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 mb-1">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={`block px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px] ${
                        isActive ? "bg-blue-50 text-blue-700" : "text-gray-700 hover:bg-gray-50"
                      }`}
                    >
                      {item.label}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
