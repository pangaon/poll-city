"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AppSwitcher } from "./app-switcher";
import { Home, Flame, PlusSquare, Crosshair, User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { path: "/design-preview/social/feed", icon: Home, label: "Feed" },
  { path: "/design-preview/social/trending", icon: Flame, label: "Trending" },
  { path: "/design-preview/social/create", icon: PlusSquare, highlight: true, label: "" },
  { path: "/design-preview/social/command", icon: Crosshair, label: "Field" },
  { path: "/design-preview/social/profile", icon: UserIcon, label: "Profile" },
];

export function SocialLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="flex h-screen w-full bg-[#050A1F] items-center justify-center relative overflow-hidden font-sans">
      {/* Background Decor */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#00E676]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#FF3B30]/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="absolute top-[30%] left-[50%] -translate-x-1/2 w-[500px] h-[500px] bg-[#2979FF]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* App Switcher */}
      <div className="absolute top-4 left-4 z-50 bg-[#0B0B0F]/80 backdrop-blur-xl rounded-xl shadow-[0_0_30px_rgba(0,0,0,0.8)] border border-[#2979FF]/20">
        <AppSwitcher />
      </div>

      {/* Mobile Phone Frame */}
      <div
        className="relative bg-[#0B0B0F] shadow-[0_0_80px_rgba(0,229,255,0.08),0_0_0_1px_rgba(41,121,255,0.15),0_30px_80px_rgba(0,0,0,0.9)] overflow-hidden flex flex-col border-[3px] border-[#1a1a22] transition-all"
        style={{
          width: "min(414px, 100vw)",
          height: "min(896px, 100dvh)",
          borderRadius: "clamp(0px, min(44px, 6vw), 44px)",
        }}
      >
        {/* Neon edges */}
        <div className="absolute top-0 left-[15%] right-[15%] h-[1px] bg-gradient-to-r from-transparent via-[#2979FF]/60 to-transparent z-50 pointer-events-none" />
        <div className="absolute bottom-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#00E5FF]/30 to-transparent z-50 pointer-events-none" />

        {/* iOS-style Status Bar */}
        <div className="h-12 w-full flex-shrink-0 absolute top-0 left-0 z-50 flex justify-between px-6 items-center pointer-events-none select-none">
          <div className="text-white text-[13px] font-bold tracking-wider drop-shadow-md mt-1">9:41</div>
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[110px] h-[30px] bg-black rounded-b-[22px] flex items-center justify-center gap-2 px-3">
            <div className="w-2 h-2 bg-[#1a1a22] rounded-full border border-[#2979FF]/20" />
            <div className="w-12 h-1.5 bg-[#1a1a22] rounded-full" />
          </div>
          <div className="flex gap-1.5 items-center mt-1">
            <div className="flex items-end gap-[2px] h-3">
              {[3, 5, 7, 9].map((h, i) => (
                <div
                  key={i}
                  className="w-[3px] rounded-sm bg-white"
                  style={{ height: `${h}px`, opacity: i < 3 ? 1 : 0.4 }}
                />
              ))}
            </div>
            <div className="text-white opacity-90">
              <svg width="14" height="10" viewBox="0 0 14 10" fill="none">
                <path d="M7 8.5a1 1 0 100-2 1 1 0 000 2z" fill="white" />
                <path d="M4.1 6.4A4.1 4.1 0 017 5.2c1.1 0 2.1.45 2.9 1.2" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" />
                <path d="M1.5 4A8 8 0 017 2c2.1 0 4 .8 5.5 2" stroke="white" strokeWidth="1.2" strokeLinecap="round" fill="none" opacity="0.6" />
              </svg>
            </div>
            <div className="flex items-center">
              <div className="w-6 h-3 border border-white/70 rounded-[3px] relative flex items-center pl-[2px]">
                <div className="h-[8px] w-[70%] bg-white rounded-[2px]" />
              </div>
              <div className="w-[2px] h-[6px] bg-white/50 rounded-r ml-[1px]" />
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="flex-1 bg-[#0B0B0F] overflow-hidden relative z-0">{children}</main>

        {/* Bottom Navigation */}
        <nav
          className="flex-shrink-0 bg-[#0B0B0F]/95 backdrop-blur-xl border-t border-[#1a1a22] flex items-center justify-around px-6 z-50 shadow-[0_-8px_30px_rgba(0,0,0,0.6)] relative"
          style={{ height: "min(82px, 11dvh)", paddingBottom: "clamp(4px, 2dvh, 20px)" }}
        >
          <div className="absolute top-0 left-[20%] right-[20%] h-[1px] bg-gradient-to-r from-transparent via-[#2979FF]/30 to-transparent pointer-events-none" />

          {NAV_ITEMS.map((item, i) => {
            const isActive = pathname === item.path;
            return (
              <Link
                key={i}
                href={item.path}
                className={cn(
                  "flex flex-col items-center gap-0.5 transition-all active:scale-90 relative",
                  item.highlight ? "-mt-4" : ""
                )}
              >
                {isActive && !item.highlight && (
                  <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-1 h-1 bg-[#00E5FF] rounded-full shadow-[0_0_8px_#00E5FF]" />
                )}
                <div
                  className={cn(
                    "flex items-center justify-center rounded-2xl transition-all duration-200",
                    item.highlight
                      ? "w-12 h-12 bg-gradient-to-tr from-[#00E5FF] to-[#2979FF] text-[#050A1F] shadow-[0_0_20px_rgba(0,229,255,0.5),0_0_0_1px_rgba(0,229,255,0.2)] hover:shadow-[0_0_30px_rgba(0,229,255,0.7)]"
                      : isActive
                      ? "w-10 h-10 text-white"
                      : "w-10 h-10 text-[#4A4E6A] hover:text-[#8888AA]"
                  )}
                >
                  <item.icon
                    size={item.highlight ? 22 : 20}
                    className={cn(
                      "transition-all",
                      isActive && !item.highlight ? "drop-shadow-[0_0_6px_rgba(255,255,255,0.4)]" : ""
                    )}
                  />
                </div>
                {!item.highlight && item.label && (
                  <span
                    className={cn(
                      "text-[9px] font-bold uppercase tracking-[0.08em] transition-all",
                      isActive ? "text-white" : "text-[#4A4E6A]"
                    )}
                  >
                    {item.label}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
