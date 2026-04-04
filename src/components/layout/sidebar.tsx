"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard, Users, Map, CheckSquare, Upload,
  Settings, Sparkles, ChevronDown, Vote, Menu, X,
  Phone, Search, Target, Zap
} from "lucide-react";
import CampaignSwitcher from "@/components/layout/campaign-switcher";

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard" },
  { href: "/contacts", icon: Users, label: "Contacts" },
  { href: "/volunteers", icon: Users, label: "Volunteers" },
  { href: "/canvassing", icon: Map, label: "Canvassing" },
  { href: "/canvassing/walk", icon: Map, label: "Walk List" },
  { href: "/tasks", icon: CheckSquare, label: "Tasks" },
  { href: "/gotv", icon: Target, label: "GOTV" },
  { href: "/call-list", icon: Phone, label: "Call List" },
  { href: "/lookup", icon: Search, label: "Address Lookup" },
  { href: "/capture", icon: Zap, label: "Quick Capture" },
  { href: "/import-export", icon: Upload, label: "Import / Export" },
  { href: "/ai-assist", icon: Sparkles, label: "AI Assist" },
  { href: "/settings", icon: Settings, label: "Settings" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo */}
      <div className="px-4 py-5 border-b border-gray-200">
        <Link href="/dashboard" className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <Vote className="w-4 h-4 text-white" />
          </div>
          <span className="font-bold text-gray-900 text-lg tracking-tight">Poll City</span>
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
                "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                active
                  ? "bg-blue-600 text-white"
                  : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
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
