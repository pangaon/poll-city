"use client";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Building2, Shield, Users, Map, CheckSquare, Upload,
  Settings, Sparkles, BarChart3, ChevronDown, Vote, Menu, X,
  Phone, Search, Target, Zap, DollarSign, CreditCard, Globe, Bell, Printer,
  MessageSquare, Star
} from "lucide-react";
import CampaignSwitcher from "@/components/layout/campaign-switcher";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/campaigns", icon: Building2, label: "Campaigns" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/volunteers", icon: Users, label: "Volunteers" },
  { href: "/volunteers/groups", icon: Users, label: "Volunteer Groups" },
  { href: "/volunteers/shifts", icon: Users, label: "Volunteer Shifts" },
  { href: "/volunteers/expenses", icon: DollarSign, label: "Volunteer Expenses" },
  { href: "/canvassing", icon: Map, label: "Canvassing" },
  { href: "/canvassing/walk", icon: Map, label: "Walk List" },
  { href: "/canvassing/turf-builder", icon: Map, label: "Turf Builder" },
  { href: "/canvassing/scripts", icon: MessageSquare, label: "Canvassing Scripts" },
  { href: "/events", icon: Bell, label: "Events" },
  { href: "/coalitions", icon: Globe, label: "Coalitions" },
  { href: "/media", icon: Globe, label: "Media" },
  { href: "/intelligence", icon: Shield, label: "Intelligence" },
  { href: "/supporters/super", icon: Star, label: "Super Supporters" },
  { href: "/budget", icon: DollarSign, label: "Budget" },
  { href: "/notifications", icon: Bell, label: "Notifications" },
  { href: "/polls", icon: BarChart3, label: "Polls" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/gotv", icon: Target, label: "GOTV" },
  { href: "/signs", icon: Map, label: "Signs" },
  { href: "/print", icon: Printer, label: "Print" },
  { href: "/donations", icon: DollarSign, label: "Donations" },
  { href: "/call-list", icon: Phone, label: "Call List" },
  { href: "/lookup", icon: Search, label: "Address Lookup" },
  { href: "/capture", icon: Zap, label: "Quick Capture" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/officials", icon: Globe, label: "Officials Directory" },
  { href: "/import-export", icon: Upload, label: "Import / Export" },
  { href: "/settings", icon: Settings, label: "Settings" },
  { href: "/settings/team", icon: Users, label: "Team" },
  { href: "/billing", icon: CreditCard, label: "Billing" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

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
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        {navItems.map(({ href, icon: Icon, label }) => {
          // Active: exact match OR starts with href (but avoid /canvassing matching /canvassing/walk)
          const active = pathname === href ||
            (href !== "/canvassing" && href !== "/import-export" && pathname.startsWith(href + "/"));
          return (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-3 px-3 py-2 rounded-xl text-sm font-medium transition-all",
                active
                  ? "bg-blue-50 text-blue-700 border-l-4 border-blue-600 pl-2"
                  : "text-gray-600 hover:bg-gray-50 hover:text-gray-900 border-l-4 border-transparent"
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-4 py-4 border-t border-gray-100">
        <p className="text-xs text-gray-400">Poll City v1.2.0</p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex w-60 flex-shrink-0 bg-white border-r border-gray-200 flex-col">
        <SidebarContent />
      </aside>

      {/* Mobile toggle */}
      <button
        className="md:hidden fixed top-3 left-3 z-50 w-9 h-9 bg-white border border-gray-200 rounded-lg flex items-center justify-center shadow-sm"
        onClick={() => setMobileOpen(!mobileOpen)}
      >
        {mobileOpen ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
      </button>

      {/* Mobile sidebar overlay */}
      {mobileOpen && (
        <>
          <div className="md:hidden fixed inset-0 bg-black/40 z-40" onClick={() => setMobileOpen(false)} />
          <aside className="md:hidden fixed left-0 top-0 bottom-0 w-64 bg-white z-50 flex flex-col shadow-xl">
            <SidebarContent />
          </aside>
        </>
      )}
    </>
  );
}
