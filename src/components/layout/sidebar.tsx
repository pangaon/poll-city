"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useMemo, useState, useEffect, useRef, type ComponentType } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Newspaper,
  Users,
  HeartHandshake,
  CheckSquare,
  ClipboardList,
  Map,
  Target,
  PenSquare,
  CalendarDays,
  Mail,
  Calendar,
  BarChart3,
  DollarSign,
  CreditCard,
  FileText,
  BarChart2,
  Mic2,
  Landmark,
  Printer,
  ArrowUpDown,
  Settings,
  Crown,
  Shield,
  ScrollText,
  QrCode,
  Network,
  Vote,
  Truck,
  Brain,
  Search,
  Bell,
  Radio,
  MonitorPlay,
  Bot,
  Phone,
  Star,
  Receipt,
  Tv,
} from "lucide-react";
import CampaignSwitcher from "@/components/layout/campaign-switcher";
import CommandPalette, { type NavEntry } from "@/components/layout/command-palette";
import { useSession } from "next-auth/react";

type NavItem = { href: string; label: string; icon: ComponentType<{ className?: string }>; isNew?: boolean };
type NavSection = { id: string; label: string; items: NavItem[] };

// ── Section definitions ───────────────────────────────────────────────────────

const COMMAND_SECTION: NavSection = {
  id: "command",
  label: "Command",
  items: [
    { href: "/dashboard",  icon: LayoutDashboard, label: "Dashboard"  },
    { href: "/briefing",   icon: Newspaper,       label: "Briefing"   },
    { href: "/ai-assist",  icon: Bot,             label: "AI Assist"  },
  ],
};

const PEOPLE_SECTION: NavSection = {
  id: "people",
  label: "People",
  items: [
    { href: "/contacts",        icon: Users,          label: "Contacts"       },
    { href: "/volunteers",      icon: HeartHandshake, label: "Volunteers"     },
    { href: "/coalitions",      icon: Network,        label: "Coalitions"     },
    { href: "/tasks",           icon: CheckSquare,    label: "Tasks"          },
    { href: "/supporters/super", icon: Star,          label: "VIP Supporters" },
    { href: "/lookup",          icon: Search,         label: "Voter Lookup"   },
  ],
};

const FIELD_SECTION: NavSection = {
  id: "field",
  label: "Field",
  items: [
    { href: "/field-ops",              icon: ClipboardList, label: "Field Ops"         },
    { href: "/gotv",                   icon: Target,        label: "GOTV"              },
    { href: "/eday",                   icon: Vote,          label: "Election Day"      },
    { href: "/eday/capture",           icon: Radio,         label: "Quick Capture",    isNew: true },
    { href: "/eday/capture/war-room",  icon: MonitorPlay,   label: "War Room",         isNew: true },
    { href: "/eday/hq",                icon: Tv,            label: "Election Night",   isNew: true },
    { href: "/call-list",              icon: Phone,         label: "Call List"         },
    { href: "/signs",                  icon: PenSquare,     label: "Signs"             },
    { href: "/events",                 icon: CalendarDays,  label: "Events"            },
    { href: "/qr",                     icon: QrCode,        label: "QR Capture",       isNew: true },
    { href: "/fuel",                   icon: Truck,         label: "Logistics",        isNew: true },
  ],
};

const OUTREACH_SECTION: NavSection = {
  id: "outreach",
  label: "Outreach",
  items: [
    { href: "/communications", icon: Mail,      label: "Communications" },
    { href: "/calendar",       icon: Calendar,  label: "Calendar"       },
    { href: "/polls",          icon: BarChart3, label: "Polls"          },
    { href: "/forms",          icon: FileText,  label: "Forms"          },
    { href: "/notifications",  icon: Bell,      label: "Voter Outreach" },
  ],
};

const MONEY_SECTION: NavSection = {
  id: "money",
  label: "Money",
  items: [
    { href: "/fundraising", icon: DollarSign, label: "Fundraising" },
    { href: "/finance",     icon: CreditCard, label: "Finance"     },
  ],
};

const INTELLIGENCE_SECTION: NavSection = {
  id: "intelligence",
  label: "Intelligence",
  items: [
    { href: "/analytics",  icon: BarChart2, label: "Analytics"                        },
    { href: "/intel",      icon: Brain,     label: "Candidate Intel", isNew: true     },
    { href: "/reputation", icon: Shield,    label: "Reputation",      isNew: true     },
  ],
};

const CANDIDATE_SECTION: NavSection = {
  id: "candidate",
  label: "Candidate",
  items: [
    { href: "/calendar/candidate", icon: Mic2,    label: "Candidate Schedule" },
    { href: "/officials",          icon: Landmark, label: "Officials"          },
    { href: "/social",             icon: Globe,    label: "Poll City Social"   },
  ],
};

const PLATFORM_SECTION: NavSection = {
  id: "platform",
  label: "Platform",
  items: [
    { href: "/print",         icon: Printer,    label: "Print"           },
    { href: "/import-export", icon: ArrowUpDown, label: "Import / Export" },
    { href: "/billing",       icon: Receipt,    label: "Billing"         },
    { href: "/settings",      icon: Settings,   label: "Settings"        },
  ],
};

// ── Canvasser / Finance role sections ─────────────────────────────────────────

const CANVASSER_SECTIONS: NavSection[] = [
  {
    id: "canvasser",
    label: "Canvasser",
    items: [
      { href: "/field-ops/walk", icon: Map,        label: "My Turf"  },
      { href: "/tasks",          icon: CheckSquare, label: "My Tasks" },
    ],
  },
];

const FINANCE_SECTIONS: NavSection[] = [
  {
    id: "finance",
    label: "Finance",
    items: [
      { href: "/finance",                   icon: CreditCard, label: "Overview"          },
      { href: "/finance/budget",            icon: BarChart2,  label: "Budget"            },
      { href: "/finance/expenses",          icon: DollarSign, label: "Expenses"          },
      { href: "/finance/purchase-requests", icon: FileText,   label: "Purchase Requests" },
      { href: "/finance/reimbursements",    icon: FileText,   label: "Reimbursements"    },
      { href: "/finance/approvals",         icon: CheckSquare, label: "Approvals"        },
      { href: "/finance/vendors",           icon: FileText,   label: "Vendors"           },
      { href: "/finance/reports",           icon: BarChart3,  label: "Reports"           },
      { href: "/finance/audit",             icon: ScrollText, label: "Audit Trail"       },
      { href: "/donations",                 icon: DollarSign, label: "Donations"         },
    ],
  },
  {
    id: "account",
    label: "My Account",
    items: [
      { href: "/settings", icon: Settings, label: "My Account" },
    ],
  },
];

// ── All entries for command palette ──────────────────────────────────────────

function buildPaletteEntries(sections: NavSection[]): NavEntry[] {
  return sections.flatMap((s) =>
    s.items.map((item) => ({ ...item, section: s.label })),
  );
}

// ── Main sidebar component ────────────────────────────────────────────────────

export default function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [stripeNotConnected, setStripeNotConnected] = useState(false);

  // Fetch Stripe onboarding status once on mount for the amber badge
  useEffect(() => {
    if (!session) return;
    fetch("/api/campaigns/current")
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (data && !data.stripeOnboarded && !data.isDemo) setStripeNotConnected(true);
      })
      .catch(() => undefined);
  }, [session]);

  const isSuperAdmin = session?.user?.role === "SUPER_ADMIN";
  const roleName = (session?.user?.role ?? "").toString().toUpperCase();
  const isCanvasserOnly = roleName === "VOLUNTEER" || roleName === "CANVASSER";
  const isFinanceOnly = session?.user?.role === "FINANCE";

  const sidebarSections = useMemo((): NavSection[] => {
    if (isCanvasserOnly) return CANVASSER_SECTIONS;
    if (isFinanceOnly) return FINANCE_SECTIONS;

    const platformItems = [...PLATFORM_SECTION.items];
    if (isSuperAdmin) {
      platformItems.push({ href: "/ops", icon: Crown, label: "Ops" });
    }

    return [
      COMMAND_SECTION,
      PEOPLE_SECTION,
      FIELD_SECTION,
      OUTREACH_SECTION,
      MONEY_SECTION,
      INTELLIGENCE_SECTION,
      CANDIDATE_SECTION,
      { ...PLATFORM_SECTION, items: platformItems },
    ];
  }, [isCanvasserOnly, isFinanceOnly, isSuperAdmin]);

  const paletteEntries = useMemo(() => buildPaletteEntries(sidebarSections), [sidebarSections]);

  // Global Ctrl+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setPaletteOpen((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  function openAdoni() {
    window.dispatchEvent(new CustomEvent("pollcity:open-adoni"));
  }

  // Preserve scroll position across navigations — navRef stays mounted, scroll never resets
  const navRef = useRef<HTMLElement>(null);
  const activeItemRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    // Scroll the active nav item into view without moving the page
    activeItemRef.current?.scrollIntoView({ block: "nearest" });
  }, [pathname]);

  const navContent = (
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

      {/* Search bar */}
      <div className="px-3 pt-3 pb-1">
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-md bg-slate-800/60 hover:bg-slate-800 border border-slate-700/50 text-slate-400 hover:text-slate-200 text-xs transition-colors"
        >
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="flex-1 text-left">Search pages…</span>
          <kbd className="hidden md:inline px-1.5 py-0.5 bg-slate-700 border border-slate-600 rounded text-[10px] font-mono text-slate-500">⌘K</kbd>
        </button>
      </div>

      {/* Nav — ref kept stable so scroll position is never reset on re-render */}
      <nav ref={navRef} className="flex-1 px-2 py-2 overflow-y-auto scrollbar-thin space-y-4">
        {sidebarSections.map((section) => (
          <section key={section.id}>
            <p className="px-3 mb-1 text-[10px] font-semibold uppercase tracking-widest text-slate-500 select-none">
              {section.label}
            </p>
            <div className="space-y-px">
              {section.items.map(({ href, icon: Icon, label, isNew }) => {
                const active = pathname === href || (pathname ?? "").startsWith(`${href}/`);
                const showStripeDot = stripeNotConnected && href === "/fundraising";
                return (
                  <Link
                    key={href}
                    href={href}
                    ref={active ? activeItemRef : undefined}
                    className={cn(
                      "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors",
                      active
                        ? "bg-blue-600 text-white"
                        : "text-slate-400 hover:bg-slate-800/60 hover:text-white",
                    )}
                  >
                    <Icon className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate flex-1">{label}</span>
                    {isNew && !active && (
                      <span className="flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase tracking-wide bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                        New
                      </span>
                    )}
                    {showStripeDot && (
                      <span className="w-2 h-2 rounded-full bg-amber-400 flex-shrink-0" title="Stripe not connected" />
                    )}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
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
        <div className="flex items-center gap-3 pt-1 text-[11px] text-slate-600">
          <Link href="/privacy" className="hover:text-slate-400 transition-colors">Privacy Policy</Link>
          <span className="text-slate-700">&middot;</span>
          <Link href="/terms" className="hover:text-slate-400 transition-colors">Terms</Link>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-slate-950 border-r border-slate-800 flex-col">
        {navContent}
      </aside>

      {/* Command palette — rendered outside sidebar so it covers full viewport */}
      <CommandPalette
        entries={paletteEntries}
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
      />
    </>
  );
}
