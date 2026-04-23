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
  { href: "/social",                             label: "Feed",              icon: Home,      exact: true  },
  { href: "/social/polls",                       label: "Polls",             icon: BarChart2, exact: false },
  { href: "/social/officials",                   label: "Representatives",   icon: Landmark,  exact: false },
  { href: "/social/officials?level=municipal",   label: "Elections 2026",    icon: Vote,      exact: false },
  { href: "/social/groups",                      label: "Civic Groups",      icon: Users,     exact: false },
];

const YOU_LINKS = [
  { href: "/social/profile",       label: "My Profile",    icon: User  },
  { href: "/social/notifications", label: "Notifications", icon: Bell  },
];

interface NavLinkProps {
  href: string;
  label: string;
  icon: React.ElementType;
  exact?: boolean;
  badge?: number;
}

function NavLink({ href, label, icon: Icon, exact = false, badge }: NavLinkProps) {
  const pathname = usePathname() ?? "";
  const active = exact ? pathname === href : pathname.startsWith(href);

  return (
    <Link href={href} className="relative group flex items-center gap-3 px-3 py-2 rounded-xl transition-all duration-200">
      {active && (
        <motion.div
          layoutId="pcs-nav-active"
          className="absolute inset-0 bg-white/[0.06] rounded-xl"
          transition={{ type: "spring", stiffness: 400, damping: 35 }}
        />
      )}
      <div className={cn(
        "relative z-10 w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200",
        active
          ? "bg-[#00D4C8]/15 text-[#00D4C8]"
          : "bg-white/[0.04] text-white/40 group-hover:bg-white/[0.07] group-hover:text-white/70"
      )}>
        <Icon className="w-4 h-4" strokeWidth={active ? 2.2 : 1.8} />
      </div>
      <span className={cn(
        "relative z-10 text-sm font-medium transition-colors duration-200",
        active ? "text-white" : "text-white/50 group-hover:text-white/80"
      )}>
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span className="relative z-10 ml-auto min-w-[18px] h-[18px] bg-red-500 rounded-full text-[10px] font-bold text-white flex items-center justify-center px-1">
          {badge > 99 ? "99+" : badge}
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
    <div className="flex flex-col h-full gap-1">

      {/* ── Discover section ── */}
      <div className="mb-1">
        <p className="px-3 pb-1 text-[10px] font-bold tracking-widest uppercase text-white/20">
          Discover
        </p>
        <nav className="flex flex-col gap-0.5">
          {DISCOVER_LINKS.map((link) => (
            <NavLink key={link.href} {...link} />
          ))}
        </nav>
      </div>

      {/* ── You section (signed in only) ── */}
      {session?.user && (
        <div className="mt-3">
          <p className="px-3 pb-1 text-[10px] font-bold tracking-widest uppercase text-white/20">
            You
          </p>
          <nav className="flex flex-col gap-0.5">
            {YOU_LINKS.map((link) => (
              <NavLink key={link.href} {...link} />
            ))}
          </nav>
        </div>
      )}

      {/* ── Spacer ── */}
      <div className="flex-1" />

      {/* ── Trending tag ── */}
      <div className="mt-4 px-3 py-3 rounded-2xl bg-gradient-to-br from-[#1D9E75]/10 to-[#00D4C8]/5 border border-[#1D9E75]/15">
        <div className="flex items-center gap-2 mb-2">
          <Flame className="w-3.5 h-3.5 text-[#EF9F27]" />
          <span className="text-xs font-bold text-white/70">Trending</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {["#MunicipalElections", "#Budget2026", "#Housing", "#Transit"].map((tag) => (
            <span
              key={tag}
              className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-white/[0.05] text-white/50 hover:text-white/80 hover:bg-white/[0.08] cursor-pointer transition-all duration-150"
            >
              {tag}
            </span>
          ))}
        </div>
      </div>

      {/* ── Auth CTA or user card ── */}
      {session?.user ? (
        <Link
          href="/social/profile"
          className="mt-3 flex items-center gap-3 px-3 py-2.5 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.06] transition-all duration-200 group"
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
            <div className="w-[34px] h-[34px] rounded-full bg-[#1D9E75]/20 flex items-center justify-center text-[#1D9E75] text-sm font-bold flex-shrink-0">
              {displayName.charAt(0).toUpperCase()}
            </div>
          )}
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            <p className="text-[11px] text-white/35">View profile</p>
          </div>
        </Link>
      ) : (
        <div className="mt-3 p-3 rounded-2xl bg-gradient-to-br from-[#00D4C8]/8 to-[#1D9E75]/5 border border-[#00D4C8]/15">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-3.5 h-3.5 text-[#00D4C8]" />
            <span className="text-xs font-bold text-white/70">Join Poll City</span>
          </div>
          <p className="text-[11px] text-white/40 mb-3 leading-relaxed">
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

      {/* ── Footer links ── */}
      <div className="mt-3 px-2 flex flex-wrap gap-x-3 gap-y-1">
        {["About", "Privacy", "Terms", "Help"].map((l) => (
          <span key={l} className="text-[10px] text-white/20 hover:text-white/40 cursor-pointer transition-colors">
            {l}
          </span>
        ))}
        <span className="text-[10px] text-white/15 w-full mt-0.5">© 2026 Poll City</span>
      </div>
    </div>
  );
}
