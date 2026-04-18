"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { Home, Users, BarChart2, User, Bell, Users2 } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/social",               icon: Home,   label: "Feed"      },
  { href: "/social/officials",     icon: Users,  label: "Officials" },
  { href: "/social/polls",         icon: BarChart2, label: "Polls"  },
  { href: "/social/groups",        icon: Users2, label: "Groups"    },
  { href: "/social/notifications", icon: Bell,   label: "Alerts"    },
  { href: "/social/profile",       icon: User,   label: "Profile"   },
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

  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex z-40 safe-area-inset-bottom overflow-x-auto">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== "/social" && (pathname ?? "").startsWith(href));
        const isAlerts = href === "/social/notifications";
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors relative min-w-[52px]",
              active ? "text-blue-600" : "text-gray-500 hover:text-gray-700"
            )}
          >
            <div className="relative">
              <Icon className={cn("w-5 h-5", active && "fill-blue-100")} />
              {isAlerts && unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-white text-[9px] font-bold flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
