"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Shield, Users, Map, Upload,
  Settings, Search, Target, DollarSign, CreditCard, Globe, Bell, Printer,
  HelpCircle, BarChart3, ChevronDown, ChevronRight, FileText, Mail, MessageSquare,
  Inbox, Bot, Activity, Landmark, CalendarDays, Calendar, BookOpen, Lock, Palette, CheckCircle2, Gauge
} from "lucide-react";
import CampaignSwitcher from "@/components/layout/campaign-switcher";
import { useSession } from "next-auth/react";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };
type NavSection = { id: string; label: string; icon: ComponentType<{ className?: string }>; items: NavItem[] };

const HEADQUARTERS_SECTION: NavSection = {
  id: "headquarters",
  label: "Headquarters",
  icon: LayoutDashboard,
  items: [
    { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
    { href: "/command-center", icon: Activity, label: "Command Center" },
    { href: "/alerts", icon: Bell, label: "Alerts" },
    { href: "/contacts", icon: Users, label: "Contacts" },
    { href: "/volunteers", icon: Users, label: "Volunteers" },
    { href: "/tasks", icon: CheckCircle2, label: "Tasks" },
    { href: "/calendar", icon: Calendar, label: "Calendar" },
  ],
};

const FIELD_OPS_SECTION: NavSection = {
  id: "field-ops",
  label: "Field Operations",
  icon: Map,
  items: [
    { href: "/canvassing", icon: Map, label: "Canvassing" },
    { href: "/canvassing/print-walk-list", icon: Printer, label: "Print Walk List" },
    { href: "/gotv", icon: Target, label: "GOTV" },
    { href: "/election-night", icon: Gauge, label: "Election Night" },
    { href: "/signs", icon: Map, label: "Signs" },
    { href: "/events", icon: CalendarDays, label: "Events" },
    { href: "/polls", icon: BarChart3, label: "Polls" },
    { href: "/lookup", icon: Search, label: "Voter Lookup" },
  ],
};

const FINANCE_SECTION: NavSection = {
  id: "finance",
  label: "Finance",
  icon: DollarSign,
  items: [
    { href: "/donations", icon: DollarSign, label: "Donations" },
    { href: "/budget", icon: DollarSign, label: "Budget" },
    { href: "/billing", icon: CreditCard, label: "Billing" },
  ],
};

const COMMUNICATIONS_SECTION: NavSection = {
  id: "communications",
  label: "Communications",
  icon: Mail,
  items: [
    { href: "/communications", icon: Mail, label: "Email & SMS" },
    { href: "/communications/social", icon: Globe, label: "Social Media" },
    { href: "/notifications", icon: MessageSquare, label: "Voter Outreach" },
    { href: "/print", icon: Printer, label: "Print & Design" },
    { href: "/settings/public-page", icon: Globe, label: "Campaign Website" },
  ],
};

const INTELLIGENCE_SECTION: NavSection = {
  id: "intelligence",
  label: "Analytics & Intel",
  icon: BarChart3,
  items: [
    { href: "/analytics", icon: BarChart3, label: "Analytics" },
    { href: "/reports", icon: FileText, label: "Reports" },
    { href: "/resources", icon: BookOpen, label: "Resource Library" },
    { href: "/officials", icon: Landmark, label: "Officials" },
    { href: "/media", icon: Globe, label: "Media Contacts" },
    { href: "/coalitions", icon: Globe, label: "Coalitions" },
    { href: "/intelligence", icon: Shield, label: "Opponent Intel" },
  ],
};

const SETTINGS_ADMIN_SECTION: NavSection = {
  id: "settings-admin",
  label: "Settings & Admin",
  icon: Settings,
  items: [
    { href: "/settings", icon: Settings, label: "Settings" },
    { href: "/settings/brand", icon: Palette, label: "Brand Kit" },
    { href: "/settings/team", icon: Users, label: "Team" },
    { href: "/settings/security", icon: Lock, label: "Security" },
    { href: "/import-export", icon: Upload, label: "Import / Export" },
    { href: "/help", icon: HelpCircle, label: "Help" },
  ],
};

const STORAGE_KEY = "poll-city:sidebar-collapsed-sections";

const CANVASSER_SECTIONS: NavSection[] = [
  {
    id: "canvasser",
    label: "Canvasser",
    icon: Map,
    items: [
      { href: "/canvassing/walk", icon: Map, label: "My Turf" },
      { href: "/tasks", icon: CheckCircle2, label: "My Tasks" },
      { href: "/ai-assist", icon: Bot, label: "Ask Adoni" },
    ],
  },
];

const FINANCE_SECTIONS: NavSection[] = [
  {
    id: "finance",
    label: "Finance",
    icon: DollarSign,
    items: [
      { href: "/budget", icon: DollarSign, label: "Budget Overview" },
      { href: "/donations", icon: CreditCard, label: "Donations" },
      { href: "/volunteers/expenses", icon: FileText, label: "Expenses" },
      { href: "/reports", icon: BarChart3, label: "Reports" },
      { href: "/budget?view=filing", icon: CheckCircle2, label: "Filing Checklist" },
    ],
  },
  {
    id: "account",
    label: "My Account",
    icon: Settings,
    items: [
      { href: "/settings", icon: Settings, label: "My Account" },
    ],
  },
];

function sectionHasActivePath(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";
  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const roleName = (session?.user?.role ?? "").toString().toUpperCase();
  const isCanvasserOnly = roleName === "VOLUNTEER" || roleName === "CANVASSER";
  const isFinanceOnly = roleName.includes("FINANCE");

  const sidebarSections = useMemo(() => {
    if (isCanvasserOnly) return CANVASSER_SECTIONS;
    if (isFinanceOnly) return FINANCE_SECTIONS;
    const settingsItems = [...SETTINGS_ADMIN_SECTION.items];

    if (isAdmin) {
      settingsItems.push(
        { href: "/ops/videos", icon: CalendarDays, label: "Videos & Docs" },
        { href: "/ops/verify", icon: CheckCircle2, label: "Verify Features" },
        { href: "/ops/security", icon: Shield, label: "Security Monitor" }
      );
    }

    if (isSuperAdmin) {
      settingsItems.push({ href: "/settings/permissions", icon: Shield, label: "Permission Control Center" });
    }

    return [
      HEADQUARTERS_SECTION,
      FIELD_OPS_SECTION,
      FINANCE_SECTION,
      COMMUNICATIONS_SECTION,
      INTELLIGENCE_SECTION,
      {
        ...SETTINGS_ADMIN_SECTION,
        items: settingsItems,
      },
    ];
  }, [isAdmin, isCanvasserOnly, isFinanceOnly, isSuperAdmin]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Record<string, boolean>;
      setCollapsedSections(parsed);
    } catch {
      // ignore storage parse errors
    }
  }, []);

  const sectionStates = useMemo(() => {
    const next = { ...collapsedSections };
    for (const section of sidebarSections) {
      if (sectionHasActivePath(pathname, section.items)) {
        next[section.id] = false;
      }
      if (!(section.id in next)) {
        next[section.id] = false;
      }
    }
    return next;
  }, [collapsedSections, pathname, sidebarSections]);

  function toggleSection(id: string) {
    setCollapsedSections((prev) => {
      const next = { ...prev, [id]: !(sectionStates[id] ?? false) };
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        // ignore storage write errors
      }
      return next;
    });
  }

  function openAdoni() {
    window.dispatchEvent(new CustomEvent("pollcity:open-adoni"));
  }

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-slate-950 text-slate-200">
      {/* Logo */}
      <div className="px-4 py-4 border-b border-slate-800">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Poll City" width={28} height={28} priority />
          <span className="font-bold text-base tracking-tight text-white">Poll City</span>
        </Link>
      </div>

      {/* Campaign switcher */}
      <div className="px-3 py-3 border-b border-slate-800">
        <CampaignSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-2 py-3 space-y-1 overflow-y-auto scrollbar-thin">
        {sidebarSections.map((section) => {
          const isCollapsed = sectionStates[section.id] ?? false;
          const isActiveSection = sectionHasActivePath(pathname, section.items);
          const SectionIcon = section.icon;

          return (
            <section key={section.id}>
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2 text-left rounded-md transition-colors",
                  isActiveSection ? "bg-slate-800 text-white" : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                )}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <SectionIcon className="w-3.5 h-3.5 flex-shrink-0" />
                  <span className="text-[11px] font-semibold uppercase tracking-wider">
                    {section.label}
                  </span>
                </div>
                {isCollapsed ? <ChevronRight className="w-3.5 h-3.5 text-slate-500" /> : <ChevronDown className="w-3.5 h-3.5 text-slate-500" />}
              </button>

              {!isCollapsed && (
                <div className="mt-0.5 ml-2 space-y-px">
                  {section.items.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-all",
                          active
                            ? "bg-blue-600 text-white"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-white"
                        )}
                      >
                        <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                        <span className="flex items-center gap-2 truncate">
                          {label}
                        </span>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-3 border-t border-slate-800 space-y-2">
        <button
          type="button"
          onClick={openAdoni}
          className="w-full inline-flex items-center justify-center gap-2 rounded-md bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold py-2 transition-colors"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-blue-700 text-xs font-bold">A</span>
          Ask Adoni
        </button>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span>Search</span>
          <kbd className="px-1.5 py-0.5 bg-slate-800 border border-slate-700 rounded text-[10px] font-mono text-slate-400">Ctrl+K</kbd>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
