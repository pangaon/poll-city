"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSwitcher } from "./app-switcher";
import {
  LayoutDashboard, Users, Map as MapIcon, BarChart2,
  MessageSquare, Calendar, CheckSquare, Heart,
  DollarSign, MapPin, Printer, PlaySquare,
  FileText, Settings, Search, Bell, Plus, Shield,
  Crosshair, BookOpen, List, User, Building2,
} from "lucide-react";
import { cn } from "@/lib/utils";

const SIDEBAR_NAV = [
  {
    group: "War Room",
    items: [
      { name: "Command Center", path: "/design-preview/app/dashboard", icon: LayoutDashboard },
      { name: "Voter Matrix", path: "/design-preview/app/contacts", icon: Users },
      { name: "Signal Polling", path: "/design-preview/app/polling", icon: BarChart2 },
    ],
  },
  {
    group: "Candidate",
    items: [
      { name: "Candidate Hub", path: "/design-preview/app/candidate", icon: User },
      { name: "Elected Officials", path: "/design-preview/app/officials", icon: Building2 },
    ],
  },
  {
    group: "Field Ops",
    items: [
      { name: "Field Command", path: "/design-preview/app/field-ops", icon: Crosshair },
      { name: "Live Turf", path: "/design-preview/app/canvassing", icon: MapIcon },
      { name: "Walk Lists", path: "/design-preview/app/walk-list", icon: List },
      { name: "Lit Drops", path: "/design-preview/app/lit-drops", icon: BookOpen },
      { name: "Ground Force", path: "/design-preview/app/volunteers", icon: Heart },
      { name: "Deployments", path: "/design-preview/app/signs", icon: MapPin },
    ],
  },
  {
    group: "Outreach",
    items: [
      { name: "Comms Grid", path: "/design-preview/app/communications", icon: MessageSquare },
      { name: "Timeline", path: "/design-preview/app/calendar", icon: Calendar },
      { name: "Action Items", path: "/design-preview/app/tasks", icon: CheckSquare },
    ],
  },
  {
    group: "Resources",
    items: [
      { name: "Capital", path: "/design-preview/app/donations", icon: DollarSign },
      { name: "Logistics", path: "/design-preview/app/print", icon: Printer },
      { name: "Media Assets", path: "/design-preview/app/media", icon: PlaySquare },
    ],
  },
  {
    group: "System",
    items: [
      { name: "Intelligence", path: "/design-preview/app/reports", icon: FileText },
      { name: "Protocols", path: "/design-preview/app/settings", icon: Settings },
      { name: "God Mode", path: "/design-preview/app/admin", icon: Shield },
    ],
  },
];

export function AppLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full bg-[#050A1F] text-[#F5F7FF] font-sans overflow-hidden selection:bg-[#00E5FF]/30 selection:text-[#00E5FF]">
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 4px; height: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background-color: #2979FF; border-radius: 4px; }
        .neon-border { box-shadow: inset 0 0 0 1px rgba(41,121,255,0.2), 0 0 15px rgba(41,121,255,0.1); }
        .neon-active { box-shadow: inset 0 0 0 1px rgba(0,229,255,0.5), 0 0 20px rgba(0,229,255,0.2); }
        .neon-text { text-shadow: 0 0 10px rgba(0,229,255,0.5); }
        .neon-red-text { text-shadow: 0 0 10px rgba(255,59,48,0.5); }
      `}</style>

      {/* Sidebar */}
      <aside className="w-[260px] flex-shrink-0 bg-[#0F1440]/90 backdrop-blur-xl border-r border-[#2979FF]/20 flex flex-col h-full relative z-20">
        <div className="h-16 flex items-center px-4 border-b border-[#2979FF]/20 bg-[#050A1F]/50">
          <Link
            href="/design-preview"
            className="flex items-center gap-3 text-[#00E5FF] font-black tracking-widest uppercase text-sm neon-text hover:text-[#F5F7FF] transition-colors"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/logo.png"
              alt="Poll City Logo"
              className="w-8 h-8 object-contain drop-shadow-[0_0_15px_rgba(0,229,255,0.8)] hover:-translate-y-1 transition-transform"
            />
            Poll City OS
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 custom-scrollbar">
          {SIDEBAR_NAV.map((group, i) => (
            <div key={i} className="mb-6">
              <div className="px-3 mb-2 text-[10px] font-bold text-[#6B72A0] uppercase tracking-[0.2em]">
                {group.group}
              </div>
              <nav className="space-y-1">
                {group.items.map((item) => {
                  const isActive = pathname === item.path;
                  return (
                    <Link
                      key={item.name}
                      href={item.path}
                      className={cn(
                        "flex items-center gap-3 px-3 py-2 rounded-lg text-[13px] font-semibold transition-all duration-200 group relative overflow-hidden",
                        isActive
                          ? "bg-[#2979FF]/20 text-[#00E5FF] neon-active"
                          : "text-[#AAB2FF] hover:text-[#F5F7FF] hover:bg-[#2979FF]/10"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]" />
                      )}
                      <item.icon
                        size={16}
                        className={cn(
                          "transition-all duration-200",
                          isActive
                            ? "text-[#00E5FF] drop-shadow-[0_0_8px_rgba(0,229,255,0.8)]"
                            : "text-[#6B72A0] group-hover:text-[#2979FF]"
                        )}
                      />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="h-16 border-t border-[#2979FF]/20 flex items-center px-4 bg-[#050A1F]/80 hover:bg-[#2979FF]/10 cursor-pointer transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded bg-[#2979FF] text-[#F5F7FF] flex items-center justify-center text-sm font-black shadow-[0_0_15px_rgba(41,121,255,0.4)]">
              JD
            </div>
            <div className="flex flex-col">
              <span className="text-sm font-bold text-[#F5F7FF]">Jane Doe</span>
              <span className="text-[10px] text-[#00E5FF] font-bold tracking-wider uppercase">Campaign Dir.</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 bg-[#050A1F] relative">
        <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#2979FF]/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] bg-[#00E5FF]/5 rounded-full blur-[100px] pointer-events-none" />

        <header className="h-14 flex items-center justify-between px-6 border-b border-[#2979FF]/20 bg-[#0F1440]/70 backdrop-blur-md flex-shrink-0 z-50 relative">
          <div className="flex-1 flex items-center gap-6">
            <div className="hidden md:block">
              <AppSwitcher />
            </div>
            <div className="relative w-80 group">
              <Search
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[#2979FF] group-focus-within:text-[#00E5FF] transition-colors"
                size={16}
              />
              <input
                type="text"
                placeholder="Query database... (Cmd+K)"
                className="w-full bg-[#050A1F]/80 border border-[#2979FF]/30 text-[#F5F7FF] text-xs rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-1 focus:ring-[#00E5FF] focus:border-[#00E5FF] transition-all shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] placeholder:text-[#6B72A0]"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-md bg-[#FF3B30]/10 border border-[#FF3B30]/30 text-[#FF3B30] text-[11px] font-bold uppercase tracking-wider animate-pulse">
              <span className="w-2 h-2 rounded-full bg-[#FF3B30] shadow-[0_0_8px_#FF3B30]" />
              Live: 4 Alerts
            </div>
            <button className="relative text-[#6B72A0] hover:text-[#00E5FF] transition-colors p-2 rounded-lg hover:bg-[#2979FF]/10">
              <Bell size={18} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#FF3B30] shadow-[0_0_8px_#FF3B30]" />
            </button>
            <button className="flex items-center gap-2 bg-[#2979FF] text-white px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider hover:bg-[#00E5FF] transition-all shadow-[0_0_15px_rgba(41,121,255,0.4)] hover:shadow-[0_0_25px_rgba(0,229,255,0.6)] active:scale-95">
              <Plus size={16} /> Deploy Action
            </button>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto custom-scrollbar relative z-10">{children}</div>
      </main>
    </div>
  );
}
