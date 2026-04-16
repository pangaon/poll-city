import React, { useState, useRef, useEffect } from "react";
import { Link, useLocation } from "react-router";
import { ChevronDown, BarChart2, MessageCircle, LayoutDashboard, Search, Smartphone } from "lucide-react";
import { cn } from "../utils/cn";
import { motion, AnimatePresence } from "motion/react";

const APPS = [
  { id: "marketing", name: "Poll City Marketing", path: "/", icon: BarChart2, desc: "Public Website" },
  { id: "saas", name: "Poll City App", path: "/social/command", icon: Smartphone, desc: "Mobile Command Center" },
  { id: "desktop", name: "Enterprise Dashboard", path: "/app", icon: LayoutDashboard, desc: "Desktop SaaS" },
  { id: "social", name: "Poll City Social", path: "/social", icon: Smartphone, desc: "Public Swiping App" },
];

export function AppSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();
  const dropdownRef = useRef<HTMLDivElement>(null);

  const currentApp = APPS.find((a) => location.pathname === a.path || (a.id !== 'marketing' && location.pathname.startsWith(a.path))) || APPS[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-md hover:bg-[#2979FF]/20 transition-colors text-sm font-bold tracking-wider uppercase text-[#AAB2FF] border border-transparent hover:border-[#2979FF]/50"
      >
        <div className="w-6 h-6 rounded bg-[#00E5FF]/20 flex items-center justify-center text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.2)]">
          <currentApp.icon size={14} />
        </div>
        <span className="hidden sm:block">{currentApp.name}</span>
        <ChevronDown size={14} className="text-[#2979FF]" />
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -5, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -5, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 sm:left-0 mt-2 w-72 bg-[#0A0F2C]/95 backdrop-blur-xl border border-[#2979FF]/30 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] overflow-hidden z-50"
          >
            <div className="p-2">
              <div className="flex items-center gap-2 px-3 py-2 text-[10px] font-black text-[#6B72A0] uppercase tracking-[0.2em]">
                Switch Application
              </div>
              <div className="space-y-1">
                {APPS.map((app) => {
                  const isActive = currentApp.id === app.id;
                  return (
                    <Link
                      key={app.id}
                      to={app.path}
                      onClick={() => setIsOpen(false)}
                      className={cn(
                        "flex items-center gap-3 w-full p-2 rounded-lg text-left transition-all group relative overflow-hidden",
                        isActive 
                          ? "bg-[#2979FF]/20 border border-[#2979FF]/30" 
                          : "hover:bg-[#2979FF]/10 border border-transparent"
                      )}
                    >
                      {isActive && (
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#00E5FF] shadow-[0_0_10px_#00E5FF]"></div>
                      )}
                      <div className={cn(
                        "w-8 h-8 rounded-md flex items-center justify-center transition-colors",
                        isActive ? "bg-[#00E5FF]/20 text-[#00E5FF] shadow-[0_0_10px_rgba(0,229,255,0.3)]" : "bg-[#0F1440] text-[#6B72A0] group-hover:text-[#2979FF]"
                      )}>
                        <app.icon size={16} />
                      </div>
                      <div>
                        <div className={cn("text-sm font-bold tracking-wider uppercase", isActive ? "text-[#00E5FF] drop-shadow-[0_0_5px_rgba(0,229,255,0.5)]" : "text-[#AAB2FF] group-hover:text-[#F5F7FF]")}>
                          {app.name}
                        </div>
                        <div className="text-[10px] text-[#6B72A0] font-mono tracking-widest uppercase mt-0.5">{app.desc}</div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
