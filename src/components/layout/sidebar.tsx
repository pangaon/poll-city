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
  Megaphone, Inbox, Bot, Activity, Landmark, CalendarDays, BookOpen, Lock, Palette, CheckCircle2
} from "lucide-react";
import CampaignSwitcher from "@/components/layout/campaign-switcher";
import { useSession } from "next-auth/react";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }> };
type NavSection = { id: string; label: string; icon: ComponentType<{ className?: string }>; items: NavItem[] };

const SIDEBAR_SECTIONS: NavSection[] = [
  {
    id: "overview",
    label: "Overview",
    icon: BarChart3,
    items: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
      { href: "/analytics", icon: BarChart3, label: "Analytics" },
      { href: "/reports", icon: FileText, label: "Reports" },
      { href: "/alerts", icon: Bell, label: "Alerts" },
    ],
  },
  {
    id: "contacts-field",
    label: "Contacts & Field",
    icon: Users,
    items: [
      { href: "/contacts", icon: Users, label: "Contacts" },
      { href: "/canvassing", icon: Map, label: "Canvassing" },
      { href: "/canvassing/walk", icon: Map, label: "Walk List" },
      { href: "/gotv", icon: Target, label: "GOTV" },
      { href: "/lookup", icon: Search, label: "Lookup" },
    ],
  },
  {
    id: "communications",
    label: "Communications",
    icon: Mail,
    items: [
      { href: "/communications/email", icon: Mail, label: "Email Campaigns" },
      { href: "/communications/sms", icon: MessageSquare, label: "SMS & Text" },
      { href: "/communications/social", icon: Globe, label: "Social Media" },
      { href: "/communications/inbox", icon: Inbox, label: "Unified Inbox" },
      { href: "/communications/ai-assistant", icon: Bot, label: "AI Assistant" },
      { href: "/communications/monitoring", icon: Activity, label: "Monitoring" },
      { href: "/communications/advertising", icon: Megaphone, label: "Advertising" },
    ],
  },
  {
    id: "campaign-ops",
    label: "Campaign Ops",
    icon: Target,
    items: [
      { href: "/volunteers", icon: Users, label: "Volunteers" },
      { href: "/signs", icon: Map, label: "Signs" },
      { href: "/donations", icon: DollarSign, label: "Donations" },
      { href: "/events", icon: CalendarDays, label: "Events" },
      { href: "/budget", icon: DollarSign, label: "Budget" },
      { href: "/print", icon: Printer, label: "Print" },
      { href: "/polls", icon: BarChart3, label: "Polls" },
    ],
  },
  {
    id: "intelligence",
    label: "Intelligence",
    icon: Shield,
    items: [
      { href: "/officials", icon: Landmark, label: "Officials" },
      { href: "/media", icon: Globe, label: "Media" },
      { href: "/coalitions", icon: Globe, label: "Coalitions" },
      { href: "/intelligence", icon: Shield, label: "Opponent Intel" },
    ],
  },
  {
    id: "resources",
    label: "Resources",
    icon: BookOpen,
    items: [{ href: "/resources", icon: BookOpen, label: "Resources" }],
  },
  {
    id: "settings",
    label: "Settings",
    icon: Settings,
    items: [
      { href: "/settings", icon: Settings, label: "Settings" },
      { href: "/settings/brand", icon: Palette, label: "Brand Kit" },
      { href: "/settings/team", icon: Users, label: "Team" },
      { href: "/settings/security", icon: Lock, label: "Security" },
      { href: "/billing", icon: CreditCard, label: "Billing" },
      { href: "/import-export", icon: Upload, label: "Import/Export" },
      { href: "/help", icon: HelpCircle, label: "Help" },
    ],
  },
];

const STORAGE_KEY = "poll-city:sidebar-collapsed-sections";

function sectionHasActivePath(pathname: string, items: NavItem[]): boolean {
  return items.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});
  const [opsOutstanding, setOpsOutstanding] = useState<number>(0);

  const isAdmin = session?.user?.role === "ADMIN" || session?.user?.role === "SUPER_ADMIN";

  useEffect(() => {
    if (!isAdmin) return;
    let mounted = true;

    fetch("/api/ops/videos")
      .then((r) => r.json())
      .then((data) => {
        if (!mounted) return;
        const noVideo = Number(data?.stats?.no_video || 0);
        const needsUpdate = Number(data?.stats?.needs_update || 0);
        setOpsOutstanding(noVideo + needsUpdate);
      })
      .catch(() => {
        if (!mounted) return;
        setOpsOutstanding(0);
      });

    return () => {
      mounted = false;
    };
  }, [isAdmin]);

  const sidebarSections = useMemo(() => {
    if (!isAdmin) return SIDEBAR_SECTIONS;
    return [
      ...SIDEBAR_SECTIONS,
      {
        id: "operations",
        label: "Operations",
        icon: Shield,
        items: [
          { href: "/ops/videos", icon: CalendarDays, label: "Videos & Docs" },
          { href: "/ops/verify", icon: CheckCircle2, label: "Verify Features" },
          { href: "/ops/security", icon: Shield, label: "Security Monitor" },
        ],
      },
    ];
  }, [isAdmin]);

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
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <Image src="/logo.png" alt="Poll City" width={32} height={32} priority />
          <span className="font-bold text-lg tracking-tight" style={{ color: "#1E3A8A" }}>Poll City</span>
        </Link>
      </div>

      {/* Campaign switcher */}
      <div className="px-3 py-3 border-b border-gray-100">
        <CampaignSwitcher />
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-2 overflow-y-auto">
        {sidebarSections.map((section) => {
          const isCollapsed = sectionStates[section.id] ?? false;
          const isActiveSection = sectionHasActivePath(pathname, section.items);
          const SectionIcon = section.icon;

          return (
            <section key={section.id} className="rounded-xl border border-gray-100 bg-white/80">
              <button
                type="button"
                onClick={() => toggleSection(section.id)}
                className={cn(
                  "w-full flex items-center justify-between px-3 py-2.5 text-left rounded-xl transition-colors",
                  isActiveSection ? "bg-blue-50" : "hover:bg-gray-50"
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <SectionIcon className={cn("w-4 h-4 flex-shrink-0", isActiveSection ? "text-blue-700" : "text-gray-500")} />
                  <span className={cn("text-xs font-semibold uppercase tracking-wide", isActiveSection ? "text-blue-700" : "text-gray-600")}>
                    {section.label}
                  </span>
                </div>
                {isCollapsed ? <ChevronRight className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
              </button>

              {!isCollapsed && (
                <div className="px-2 pb-2 space-y-0.5">
                  {section.items.map(({ href, icon: Icon, label }) => {
                    const active = pathname === href || pathname.startsWith(`${href}/`);
                    return (
                      <Link
                        key={href}
                        href={href}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-sm font-medium transition-all",
                          active
                            ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 pl-2"
                            : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
                        )}
                      >
                        <Icon className="w-4 h-4 flex-shrink-0" />
                        <span className="flex items-center gap-2">
                          {label}
                          {href === "/ops/videos" && opsOutstanding > 0 && (
                            <span className="inline-flex items-center justify-center min-w-[20px] h-5 rounded-full bg-red-600 px-1.5 text-[10px] font-bold text-white">
                              {opsOutstanding}
                            </span>
                          )}
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
      <div className="px-4 py-3 border-t border-gray-100 space-y-2">
        <button
          type="button"
          onClick={openAdoni}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2"
        >
          <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white text-blue-700 text-xs font-bold">A</span>
          Ask Adoni
        </button>
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>Search</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">Ctrl+K</kbd>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-400">
          <span>Shortcuts</span>
          <kbd className="px-1.5 py-0.5 bg-gray-100 border border-gray-300 rounded text-[10px] font-mono">?</kbd>
        </div>
        <p className="text-xs text-gray-300 pt-1">Poll City v5.1.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        <SidebarContent />
      </aside>
    </>
  );
}
