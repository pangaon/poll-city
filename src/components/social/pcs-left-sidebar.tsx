"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { motion } from "framer-motion";
import {
  Home,
  BarChart2,
  Landmark,
  Users,
  Bell,
  User,
  Flame,
  Vote,
  LogIn,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

const DISCOVER_LINKS = [
  { href: "/social",                           label: "Feed",            icon: Home,      exact: true  },
  { href: "/social/polls",                     label: "Polls",           icon: BarChart2, exact: false },
  { href: "/social/officials",                 label: "Representatives", icon: Landmark,  exact: false },
  { href: "/social/officials",                 label: "Elections 2026",  icon: Vote,      exact: false, badge: "NEW" as const },
  { href: "/social/groups",                    label: "Civic Groups",    icon: Users,     exact: false },
];

const YOU_LINKS = [
  { href: "/social/profile",       label: "My Profile",    icon: User },
  { href: "/social/notifications", label: "Notifications", icon: Bell },
];

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: string;
}

function NavLink({ href, label, icon: Icon, exact = false, badge }: NavLinkProps) {
  const pathname = usePathname() ?? "";
  // Strip query from href for active check
  const hrefPath = href.split("?")[0];
  const active = exact ? pathname === hrefPath : pathname.startsWith(hrefPath) && pathname !== "/social";

  // Fix for Home: only active on exact /social
  const isActive = label === "Feed" ? pathname === "/social" : active;

  return (
    <Link href={href} className="relative group flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200">
      {isActive && (
        <motion.div
          layoutId="pcs-nav-active"
          className="absolute inset-0 bg-white/[0.07] rounded-2xl"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      <div className={cn(
        "relative z-10 w-8 h-8 rounded-xl flex items-center justify-center transition-all duration-200 flex-shrink-0",
        isActive
          ? "bg-[#00D4C8]/20 text-[#00D4C8]"
          : "bg-white/[0.05] text-slate-400 group-hover:bg-white/[0.08] group-hover:text-slate-200"
      )}>
        <Icon className="w-4 h-4" strokeWidth={isActive ? 2.2 : 1.8} />
      </div>
      <span className={cn(
        "relative z-10 text-sm font-semibold transition-colors duration-200",
        isActive ? "text-white" : "text-slate-400 group-hover:text-slate-100"
      )}>
        {label}
      </span>
      {badge && (
        <span className="relative z-10 ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-[#1D9E75]/20 text-[#1D9E75] uppercase tracking-wide">
          {badge}
        </span>
      )}
    </Link>
  );
}

export default function PCSLeftSidebar() {
  const { data: session } = useSession();
  const displayName = session?.user?.name ?? "";
  const avatarUrl = session?.user?.image;

  return (
    <div className="flex flex-col h-full gap-0.5">

      {/* ── Discover ── */}
      <div className="mb-2">
        <p className="px-3 pb-2 text-[10px] font-bold tracking-widest uppercase text-slate-600">
          Discover
        </p>
        <nav className="flex flex-col gap-0.5">
          {DISCOVER_LINKS.map((link) => (
            <NavLink key={link.label} {...link} />
          ))}
        </nav>
      </div>

      {/* ── You (signed in only) ── */}
      {session?.user && (
        <div className="mt-2">
          <p className="px-3 pb-2 text-[10px] font-bold tracking-widest uppercase text-slate-600">
            You
          </p>
          <nav className="flex flex-col gap-0.5">
            {YOU_LINKS.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
        </div>
      )}

      <div className="flex-1" />

      {/* ── Trending tags ── */}
      <div className="mt-4 px-3 py-3 rounded-2xl bg-[#111827] border border-white/[0.06]">
        <div className="flex items-center gap-2 mb-2.5">
          <Flame className="w-3.5 h-3.5 text-[#EF9F27]" />
          <span className="text-xs font-bold text-slate-300">Trending</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["#MunicipalElections", "#Budget2026", "#Housing", "#Transit"].map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full bg-white/[0.05] text-slate-400 hover:text-slate-100 hover:bg-white/[0.09] cursor-pointer transition-all duration-150"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── User card or sign-in CTA ── */}
      {session?.user ? (
        <Link
          href="/social/profile"
          className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-2xl bg-white/[0.04] hover:bg-white/[0.07] border border-white/[0.06] transition-all duration-200 group"
        >
          {avatarUrl ? (
            <Image
              src={avatarUrl}
              alt={displayName}
              width={34}
              height={34}
              className="rounded-full object-cover ring-1 ring-white/10 flex-shrink-0"
            />
          ) : (
            <div className="w-[34px] h-[34px] rounded-full bg-[#1D9E75]/25 flex items-center justify-center text-[#1D9E75] text-sm font-bold flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-[11px] text-slate-500">View profile</p>
          </div>
        </Link>
      ) : (
        <div className="mt-3 p-3.5 rounded-2xl bg-gradient-to-br from-[#00D4C8]/8 to-[#1D9E75]/4 border border-[#00D4C8]/15">
          <div className="flex items-center gap-2 mb-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#00D4C8]" />
            <span className="text-xs font-bold text-slate-200">Join Poll City Social</span>
          </div>
          <p className="text-[11px] text-slate-400 mb-3 leading-relaxed">
            Follow your reps, vote on polls, and make your voice heard.
          </p>
          <Link
            href="/signup"
            className="flex items-center justify-center gap-2 h-8 w-full rounded-full bg-[#00D4C8] text-[#080D14] text-xs font-bold hover:bg-[#00BFB4] transition-colors"
          >
            <LogIn className="w-3 h-3" />
            Get started — free
          </Link>
        </div>
      )}

      {/* ── Footer ── */}
      <div className="mt-3 px-2 flex flex-wrap gap-x-3 gap-y-1">
        {["About", "Privacy", "Terms", "Help"].map((l) => (
          <span key={l} className="text-[10px] text-slate-600 hover:text-slate-400 cursor-pointer transition-colors">
            {l}
          </span>
        ))}
        <span className="text-[10px] text-slate-700 w-full mt-0.5">© 2026 Poll City</span>
      </div>
    </div>
  );
}
