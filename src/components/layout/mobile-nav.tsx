"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, Map, Menu, Search, Users, X,
  CheckCircle2, Bot, DollarSign, Target, Bell
} from "lucide-react";
import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

// ── Role-aware primary tabs ─────────────────────────────────────────────────

type RouteTab = { type: "route"; href: string; label: string; icon: React.ComponentType<{ className?: string }> };
type ActionTab = { type: "action"; action: string; label: string; icon: React.ComponentType<{ className?: string }> };
type Tab = RouteTab | ActionTab;

const CANVASSER_TABS: Tab[] = [
  { type: "route",  href: "/canvassing/walk", label: "My Turf",  icon: Map },
  { type: "route",  href: "/tasks",           label: "My Tasks", icon: CheckCircle2 },
  { type: "action", action: "adoni",          label: "Adoni",    icon: Bot },
];

const FINANCE_TABS: Tab[] = [
  { type: "route",  href: "/donations",   label: "Donations",  icon: DollarSign },
  { type: "route",  href: "/budget",      label: "Budget",     icon: DollarSign },
  { type: "route",  href: "/reports",     label: "Reports",    icon: Search },
  { type: "action", action: "more",       label: "More",       icon: Menu },
];

const DEFAULT_TABS: Tab[] = [
  { type: "route",  href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { type: "route",  href: "/contacts",  label: "Contacts",  icon: Users },
  { type: "route",  href: "/tasks",     label: "Tasks",     icon: CheckCircle2 },
  { type: "action", action: "search",   label: "Search",    icon: Search },
  { type: "action", action: "more",     label: "More",      icon: Menu },
];

// ── More drawer groups ───────────────────────────────────────────────────────

const MORE_GROUPS = [
  {
    title: "Command",
    items: [
      { href: "/dashboard",  label: "Dashboard" },
      { href: "/briefing",   label: "Daily Briefing" },
      { href: "/ai-assist",  label: "Adoni AI Assist" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/contacts",        label: "Contacts" },
      { href: "/volunteers",      label: "Volunteers" },
      { href: "/tasks",           label: "Tasks" },
      { href: "/coalitions",      label: "Coalitions" },
      { href: "/supporters/super", label: "VIP Supporters" },
      { href: "/lookup",          label: "Voter Lookup" },
    ],
  },
  {
    title: "Field Ops",
    items: [
      { href: "/field-ops",              label: "Field Command Centre" },
      { href: "/gotv",                   label: "GOTV" },
      { href: "/eday",                   label: "Election Day" },
      { href: "/eday/capture",           label: "Quick Capture" },
      { href: "/eday/capture/war-room",  label: "War Room" },
      { href: "/eday/hq",                label: "Election Night" },
      { href: "/call-list",              label: "Call List" },
      { href: "/signs",                  label: "Signs" },
      { href: "/events",                 label: "Events" },
      { href: "/qr",                     label: "QR Capture" },
      { href: "/fuel",                   label: "Logistics" },
    ],
  },
  {
    title: "Outreach",
    items: [
      { href: "/communications",    label: "Communications" },
      { href: "/communications/qa", label: "PCS Social Hub" },
      { href: "/calendar",          label: "Calendar" },
      { href: "/polls",             label: "Polls" },
      { href: "/forms",             label: "Forms" },
      { href: "/notifications",     label: "Voter Outreach" },
      { href: "/compliance",        label: "CASL Compliance" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/fundraising", label: "Fundraising" },
      { href: "/finance",     label: "Finance" },
      { href: "/billing",     label: "Billing" },
    ],
  },
  {
    title: "Intelligence",
    items: [
      { href: "/analytics",  label: "Analytics" },
      { href: "/intel",      label: "Candidate Intel" },
      { href: "/reputation", label: "Reputation" },
    ],
  },
  {
    title: "Candidate",
    items: [
      { href: "/my-website",         label: "My Website" },
      { href: "/calendar/candidate", label: "Candidate Schedule" },
      { href: "/officials",          label: "Officials" },
      { href: "/social",             label: "Poll City Social" },
    ],
  },
  {
    title: "Platform",
    items: [
      { href: "/print",         label: "Print" },
      { href: "/import-export", label: "Import / Export" },
      { href: "/settings",      label: "Settings" },
    ],
  },
  {
    title: "Operations",
    adminOnly: true,
    items: [
      { href: "/ops/videos",   label: "Videos & Docs" },
      { href: "/ops/verify",   label: "Verify Features" },
      { href: "/ops/security", label: "Security Monitor" },
    ],
  },
  {
    title: "Operator Centre",
    superAdminOnly: true,
    items: [
      { href: "/ops",              label: "Platform Overview" },
      { href: "/ops/campaigns",    label: "All Campaigns" },
      { href: "/ops/social",       label: "Social Officials" },
    ],
  },
] as const;

// ── Component ────────────────────────────────────────────────────────────────

export default function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { data: session } = useSession();
  const role = (session?.user?.role ?? "").toString().toUpperCase();
  const isAdmin = role === "ADMIN" || role === "SUPER_ADMIN";
  const isCanvasser = role === "VOLUNTEER" || role === "CANVASSER";
  const isFinance = role.includes("FINANCE");

  const tabs = isCanvasser ? CANVASSER_TABS : isFinance ? FINANCE_TABS : DEFAULT_TABS;

  function openSearch() { window.dispatchEvent(new CustomEvent("pollcity:open-search")); }
  function openAdoni()  { window.dispatchEvent(new CustomEvent("pollcity:open-adoni")); }

  // Close drawer on navigation
  useEffect(() => { setMoreOpen(false); }, [pathname]);

  useEffect(() => {
    const open = () => setMoreOpen(true);
    window.addEventListener("pollcity:open-mobile-menu", open as EventListener);
    return () => window.removeEventListener("pollcity:open-mobile-menu", open as EventListener);
  }, []);

  return (
    <>
      {/* Bottom tab bar */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200"
        style={{ paddingBottom: "max(12px, env(safe-area-inset-bottom))" }}
        aria-label="Mobile navigation"
      >
        <div className="flex items-stretch justify-around h-[60px]">
          {tabs.map((tab) => {
            const Icon = tab.icon;

            if (tab.type === "route") {
              const active = pathname === tab.href || (pathname ?? "").startsWith(`${tab.href}/`);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 transition-colors ${
                    active ? "text-blue-600" : "text-gray-400 active:text-gray-600"
                  }`}
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </Link>
              );
            }

            if (tab.type === "action" && tab.action === "search") {
              return (
                <button
                  key="search"
                  type="button"
                  onClick={openSearch}
                  className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-gray-400 active:text-gray-600"
                  aria-label="Open search"
                >
                  <Icon className="w-5 h-5" />
                  <span className="text-[10px] font-semibold">{tab.label}</span>
                </button>
              );
            }

            if (tab.type === "action" && tab.action === "adoni") {
              return (
                <button
                  key="adoni"
                  type="button"
                  onClick={openAdoni}
                  className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-blue-600 active:text-blue-800"
                  aria-label="Ask Adoni"
                >
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-600 text-white text-xs font-bold">A</span>
                  <span className="text-[10px] font-semibold text-gray-400">Adoni</span>
                </button>
              );
            }

            // More button
            return (
              <button
                key="more"
                type="button"
                onClick={() => setMoreOpen(true)}
                className="flex-1 min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-gray-400 active:text-gray-600"
                aria-label="Open full navigation"
              >
                <Icon className="w-5 h-5" />
                <span className="text-[10px] font-semibold">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      {/* Spacer so content isn't hidden behind fixed nav */}
      <div className="md:hidden" style={{ height: "calc(60px + max(12px, env(safe-area-inset-bottom)))" }} aria-hidden />

      {/* More drawer */}
      <AnimatePresence>
        {moreOpen && (
          <div className="md:hidden fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label="Full navigation">
            {/* Backdrop */}
            <motion.div
              className="absolute inset-0 bg-black/40"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
              aria-hidden
            />

            {/* Sheet */}
            <motion.div
              className="absolute bottom-0 left-0 right-0 rounded-t-3xl bg-white max-h-[85vh] overflow-y-auto overscroll-contain"
              style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
            >
              {/* Header */}
              <div className="sticky top-0 border-b border-gray-100 bg-white px-5 py-3 flex items-center justify-between rounded-t-3xl z-10">
                <h2 className="font-bold text-gray-900 text-base">Navigation</h2>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={openSearch}
                    className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-gray-100 text-gray-500 inline-flex items-center justify-center"
                    aria-label="Search"
                  >
                    <Search className="w-5 h-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setMoreOpen(false)}
                    className="min-w-[44px] min-h-[44px] rounded-xl hover:bg-gray-100 text-gray-500 inline-flex items-center justify-center"
                    aria-label="Close navigation"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Groups */}
              <div className="p-3 space-y-5">
                {MORE_GROUPS
                  .filter((g) => {
                    if ("superAdminOnly" in g && (g as { superAdminOnly?: boolean }).superAdminOnly) return role === "SUPER_ADMIN";
                    if ("adminOnly" in g && (g as { adminOnly?: boolean }).adminOnly) return isAdmin;
                    return true;
                  })
                  .map((group) => (
                    <section key={group.title}>
                      <p className="px-3 mb-1 text-[11px] font-semibold uppercase tracking-widest text-gray-400">
                        {group.title}
                      </p>
                      <div className="space-y-0.5">
                        {group.items.map((item) => {
                          const active = pathname === item.href || (pathname ?? "").startsWith(`${item.href}/`);
                          return (
                            <Link
                              key={item.href}
                              href={item.href}
                              className={`flex items-center min-h-[48px] px-3 rounded-xl text-[15px] font-medium transition-colors ${
                                active
                                  ? "bg-blue-50 text-blue-700"
                                  : "text-gray-800 hover:bg-gray-50 active:bg-gray-100"
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
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
