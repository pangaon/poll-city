"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Home, BarChart2, Landmark, User, Plus } from "lucide-react";
import { cn } from "@/lib/utils";

const LEFT_TABS = [
  { href: "/social",           icon: Home,       label: "Feed"     },
  { href: "/social/polls",     icon: BarChart2,  label: "Polls"    },
];

const RIGHT_TABS = [
  { href: "/social/officials", icon: Landmark,   label: "Reps"     },
  { href: "/social/profile",   icon: User,       label: "Profile"  },
];

export default function SocialNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    if (!session?.user) return;
    fetch("/api/social/notifications?unread=true&limit=1")
      .then((r) => r.json())
      .then((d) => setUnreadCount(d.unreadCount ?? 0))
      .catch(() => {});
  }, [session, pathname]);

  function isActive(href: string) {
    if (href === "/social") return pathname === "/social";
    return (pathname ?? "").startsWith(href);
  }

  function Tab({ href, icon: Icon, label }: { href: string; icon: React.ElementType; label: string }) {
    const active = isActive(href);
    return (
      <Link
        href={href}
        className="flex-1 flex flex-col items-center justify-center gap-0.5 py-2 relative"
      >
        <div className={cn(
          "w-5 h-5 transition-colors",
          active ? "text-[#00D4C8]" : "text-gray-400 dark:text-white/30"
        )}>
          <Icon className="w-full h-full" strokeWidth={active ? 2.5 : 1.8} />
        </div>
        <span className={cn(
          "text-[10px] font-semibold tracking-wide transition-colors",
          active ? "text-[#00D4C8]" : "text-gray-400 dark:text-white/30"
        )}>
          {label}
          {label === "Feed" && unreadCount > 0 && (
            <span className="ml-1 inline-flex items-center justify-center w-3.5 h-3.5 bg-red-500 rounded-full text-[8px] text-white font-bold">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </span>
      </Link>
    );
  }

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white dark:bg-[#080D14] border-t border-gray-200 dark:border-white/[0.06] flex items-stretch safe-area-inset-bottom">
      {LEFT_TABS.map((tab) => (
        <Tab key={tab.href} {...tab} />
      ))}

      {/* Centre + button */}
      <div className="flex-shrink-0 flex items-center justify-center px-4">
        <Link
          href="/social/polls"
          className="w-12 h-12 rounded-full bg-[#00D4C8] flex items-center justify-center shadow-lg shadow-[#00D4C8]/30 hover:bg-[#00BFB4] transition-colors"
        >
          <Plus className="w-5 h-5 text-[#080D14]" strokeWidth={2.5} />
        </Link>
      </div>

      {RIGHT_TABS.map((tab) => (
        <Tab key={tab.href} {...tab} />
      ))}
    </nav>
  );
}
