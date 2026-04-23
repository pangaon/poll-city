"use client";

import Link from "next/link";
import Image from "next/image";
import { useSession } from "next-auth/react";
import { useEffect, useRef, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Bell,
  Search,
  LogOut,
  Settings,
  User,
  ChevronDown,
  Sun,
  Moon,
  Loader2,
} from "lucide-react";
import { signOut } from "next-auth/react";
import { cn } from "@/lib/utils";

export default function PCSHeader() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [unread, setUnread] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(true);
  const menuRef = useRef<HTMLDivElement>(null);

  /* ── Theme init: read from pcs-root class ── */
  useEffect(() => {
    const el = document.getElementById("pcs-root");
    setIsDark(el?.classList.contains("dark") ?? true);
  }, []);

  /* ── Unread notification count ── */
  useEffect(() => {
    if (!session?.user) return;
    const load = () =>
      fetch("/api/social/notifications?unread=true&limit=1")
        .then((r) => r.json())
        .then((d) => setUnread(d.unreadCount ?? 0))
        .catch(() => {});
    load();
    const id = setInterval(load, 60_000);
    return () => clearInterval(id);
  }, [session, pathname]);

  /* ── Close dropdown on outside click ── */
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function toggleTheme() {
    const el = document.getElementById("pcs-root");
    if (!el) return;
    const next = !isDark;
    setIsDark(next);
    if (next) el.classList.add("dark");
    else el.classList.remove("dark");
    try {
      localStorage.setItem("pcs-theme", next ? "dark" : "light");
    } catch {}
  }

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    const q = query.trim();
    if (!q) return;
    router.push(`/social/officials?q=${encodeURIComponent(q)}`);
    setQuery("");
  }

  const avatarUrl = session?.user?.image;
  const displayName = session?.user?.name ?? "";

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-[57px] bg-[#080D14]/80 dark:bg-[#080D14]/80 bg-white/80 backdrop-blur-xl border-b border-white/[0.06] dark:border-white/[0.06]">
      <div className="max-w-[1400px] mx-auto h-full px-3 sm:px-4 lg:px-6 flex items-center gap-3">

        {/* ── Brand ── */}
        <Link href="/social" className="flex items-center gap-2 flex-shrink-0 group">
          <div className="relative">
            <Image
              src="/logo.png"
              alt="Poll City"
              width={28}
              height={28}
              className="rounded-lg group-hover:scale-105 transition-transform duration-200"
            />
          </div>
          <div className="flex items-baseline gap-1 hidden sm:flex">
            <span className="font-black text-[15px] tracking-tight text-white">
              POLL CITY
            </span>
            <span className="text-[10px] font-black tracking-widest uppercase text-[#00D4C8]">
              SOCIAL
            </span>
          </div>
        </Link>

        {/* ── Search ── */}
        <form
          onSubmit={handleSearch}
          className="flex-1 max-w-sm hidden md:flex items-center"
        >
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/30 pointer-events-none" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reps, candidates, polls…"
              className="w-full h-8 pl-9 pr-3 text-sm bg-white/[0.06] hover:bg-white/[0.09] focus:bg-white/[0.09] border border-white/[0.08] focus:border-[#00D4C8]/40 rounded-full text-white placeholder:text-white/30 outline-none transition-all duration-200"
            />
          </div>
        </form>

        {/* ── Right actions ── */}
        <div className="ml-auto flex items-center gap-2">

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="hidden md:flex w-8 h-8 rounded-full items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all duration-200"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Notifications */}
          {session?.user && (
            <Link
              href="/social/notifications"
              className="relative w-8 h-8 rounded-full flex items-center justify-center text-white/40 hover:text-white/80 hover:bg-white/[0.06] transition-all duration-200"
            >
              <Bell className="w-4 h-4" />
              <AnimatePresence>
                {unread > 0 && (
                  <motion.span
                    key="badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    className="absolute top-0.5 right-0.5 min-w-[14px] h-[14px] bg-red-500 rounded-full text-[9px] font-bold text-white flex items-center justify-center px-0.5"
                  >
                    {unread > 9 ? "9+" : unread}
                  </motion.span>
                )}
              </AnimatePresence>
            </Link>
          )}

          {/* Auth state */}
          {status === "loading" ? (
            <Loader2 className="w-4 h-4 text-white/30 animate-spin" />
          ) : session?.user ? (
            /* User avatar + dropdown */
            <div ref={menuRef} className="relative">
              <button
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-1.5 h-8 px-1.5 rounded-full hover:bg-white/[0.06] transition-all duration-200 group"
              >
                {avatarUrl ? (
                  <Image
                    src={avatarUrl}
                    alt={displayName}
                    width={26}
                    height={26}
                    className="rounded-full object-cover ring-1 ring-white/10"
                  />
                ) : (
                  <div className="w-[26px] h-[26px] rounded-full bg-[#1D9E75]/20 flex items-center justify-center text-[#1D9E75] text-xs font-bold">
                    {displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <ChevronDown
                  className={cn(
                    "w-3 h-3 text-white/30 transition-transform duration-200",
                    menuOpen && "rotate-180"
                  )}
                />
              </button>

              <AnimatePresence>
                {menuOpen && (
                  <motion.div
                    key="menu"
                    initial={{ opacity: 0, y: -6, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: -6, scale: 0.95 }}
                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                    className="absolute right-0 top-full mt-2 w-52 bg-[#111822] border border-white/[0.08] rounded-2xl shadow-xl shadow-black/40 overflow-hidden"
                  >
                    {/* User info */}
                    <div className="px-4 py-3 border-b border-white/[0.06]">
                      <p className="text-sm font-semibold text-white truncate">{displayName}</p>
                      <p className="text-xs text-white/40 truncate">{session.user.email}</p>
                    </div>

                    {/* Links */}
                    <div className="py-1.5">
                      {[
                        { href: "/social/profile", icon: User, label: "My Profile" },
                        { href: "/social/notifications", icon: Bell, label: "Notifications" },
                        { href: "/settings", icon: Settings, label: "Settings" },
                      ].map(({ href, icon: Icon, label }) => (
                        <Link
                          key={href}
                          href={href}
                          onClick={() => setMenuOpen(false)}
                          className="flex items-center gap-3 px-4 py-2 text-sm text-white/70 hover:text-white hover:bg-white/[0.05] transition-colors"
                        >
                          <Icon className="w-3.5 h-3.5" />
                          {label}
                        </Link>
                      ))}
                    </div>

                    <div className="border-t border-white/[0.06] py-1.5">
                      <button
                        onClick={() => signOut({ callbackUrl: "/social" })}
                        className="w-full flex items-center gap-3 px-4 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/[0.06] transition-colors"
                      >
                        <LogOut className="w-3.5 h-3.5" />
                        Sign out
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                href="/login"
                className="text-sm text-white/50 hover:text-white transition-colors hidden sm:block"
              >
                Sign in
              </Link>
              <Link
                href="/login"
                className="sm:hidden h-8 px-4 text-sm font-bold rounded-full bg-[#00D4C8] text-[#080D14] hover:bg-[#00BFB4] transition-colors flex items-center"
              >
                Sign in
              </Link>
              <Link
                href="/signup"
                className="hidden sm:flex h-8 px-4 text-sm font-bold rounded-full bg-[#00D4C8] text-[#080D14] hover:bg-[#00BFB4] transition-colors items-center"
              >
                Get started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
