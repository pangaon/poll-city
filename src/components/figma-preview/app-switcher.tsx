"use client";
import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronDown, LayoutDashboard, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const APPS = [
  {
    id: "app",
    name: "Campaign Command",
    desc: "Enterprise SaaS",
    path: "/design-preview/app/dashboard",
    icon: LayoutDashboard,
    color: "#2979FF",
  },
  {
    id: "social",
    name: "Poll City Social",
    desc: "Public Mobile App",
    path: "/design-preview/social/feed",
    icon: Smartphone,
    color: "#FF3B30",
  },
  {
    id: "marketing",
    name: "Ecosystem Home",
    desc: "Marketing",
    path: "/design-preview/marketing/home",
    icon: LayoutDashboard,
    color: "#00E5FF",
  },
];

export function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  const current =
    APPS.find((a) => pathname?.startsWith(a.path.split("/").slice(0, 4).join("/"))) ??
    APPS[0];

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 px-3 py-2 rounded-lg text-[11px] font-black uppercase tracking-widest text-[#AAB2FF] hover:text-[#F5F7FF] hover:bg-[#2979FF]/10 transition-all border border-transparent hover:border-[#2979FF]/30"
      >
        <span
          className="w-2 h-2 rounded-full"
          style={{ backgroundColor: current.color, boxShadow: `0 0 6px ${current.color}` }}
        />
        {current.name}
        <ChevronDown
          size={12}
          className={cn("transition-transform", open && "rotate-180")}
        />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="absolute top-full left-0 mt-2 w-[240px] bg-[#0F1440] border border-[#2979FF]/30 rounded-xl overflow-hidden shadow-[0_10px_40px_rgba(0,0,0,0.8)] z-[100]"
          >
            {APPS.map((app) => {
              const Icon = app.icon;
              const isActive = pathname?.startsWith(app.path.split("/").slice(0, 4).join("/")) ?? false;
              return (
                <Link
                  key={app.id}
                  href={app.path}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "flex items-center gap-3 px-4 py-3 transition-all hover:bg-[#2979FF]/10",
                    isActive && "bg-[#2979FF]/10"
                  )}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center"
                    style={{ backgroundColor: `${app.color}20`, border: `1px solid ${app.color}40` }}
                  >
                    <Icon size={16} style={{ color: app.color }} />
                  </div>
                  <div>
                    <div className="text-[12px] font-black text-[#F5F7FF] uppercase tracking-wide">{app.name}</div>
                    <div className="text-[10px] text-[#6B72A0] uppercase tracking-widest">{app.desc}</div>
                  </div>
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
