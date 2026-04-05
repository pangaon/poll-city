"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, Map, Bell, Menu } from "lucide-react";
import { useState } from "react";

const ITEMS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts", label: "Contacts", icon: Users },
  { href: "/canvassing/walk", label: "Canvass", icon: Map },
  { href: "/notifications", label: "Alerts", icon: Bell },
] as const;

export function MobileBottomNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <>
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-2px_8px_rgba(0,0,0,0.04)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around" style={{ height: 60 }}>
          {ITEMS.map((item) => {
            const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href));
            const Icon = item.icon;
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

      {/* Spacer to prevent content from being hidden behind fixed nav */}
      <div className="md:hidden" style={{ height: "calc(60px + env(safe-area-inset-bottom))" }} aria-hidden />

      {/* More sheet */}
      {moreOpen && <MoreSheet onClose={() => setMoreOpen(false)} />}
    </>
  );
}

/** Slide-up sheet showing the full sidebar navigation on mobile. */
function MoreSheet({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();

  const SECTIONS = [
    {
      title: "Campaign",
      items: [
        { href: "/dashboard", label: "Dashboard" },
        { href: "/contacts", label: "Contacts" },
        { href: "/volunteers", label: "Volunteers" },
        { href: "/volunteers/groups", label: "Volunteer Groups" },
        { href: "/volunteers/shifts", label: "Volunteer Shifts" },
        { href: "/tasks", label: "Tasks" },
      ],
    },
    {
      title: "Field",
      items: [
        { href: "/canvassing/walk", label: "Walk App" },
        { href: "/canvassing/turf-builder", label: "Turf Builder" },
        { href: "/canvassing/scripts", label: "Scripts" },
        { href: "/gotv", label: "GOTV" },
        { href: "/signs", label: "Signs" },
        { href: "/lookup", label: "Address Lookup" },
        { href: "/capture", label: "Quick Capture" },
      ],
    },
    {
      title: "Engagement",
      items: [
        { href: "/polls", label: "Polls" },
        { href: "/notifications", label: "Notifications" },
        { href: "/call-list", label: "Call List" },
        { href: "/donations", label: "Donations" },
        { href: "/budget", label: "Budget" },
      ],
    },
    {
      title: "Intelligence",
      items: [
        { href: "/analytics", label: "Analytics" },
        { href: "/officials", label: "Officials" },
        { href: "/ai-assist", label: "AI Assist" },
        { href: "/reports", label: "Reports" },
      ],
    },
    {
      title: "Print",
      items: [{ href: "/print", label: "Print Marketplace" }],
    },
    {
      title: "Settings",
      items: [
        { href: "/settings", label: "Settings" },
        { href: "/settings/team", label: "Team" },
        { href: "/settings/fields", label: "Custom Fields" },
        { href: "/settings/public-page", label: "Page Builder" },
        { href: "/billing", label: "Billing" },
        { href: "/help", label: "Help Center" },
      ],
    },
  ];

  return (
    <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />
      <div
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl max-h-[85vh] overflow-y-auto animate-fade-in"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="sticky top-0 bg-white border-b border-gray-100 px-5 py-3 flex items-center justify-between rounded-t-3xl">
          <h2 className="font-bold text-gray-900">Menu</h2>
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 min-w-[44px] min-h-[44px]"
          >
            ×
          </button>
        </div>
        <div className="p-3 space-y-4">
          {SECTIONS.map((section) => (
            <div key={section.title}>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-3 mb-1">
                {section.title}
              </p>
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = pathname === item.href;
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
