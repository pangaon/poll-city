"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Users, BarChart2, User } from "lucide-react";
import { cn } from "@/lib/utils";

const tabs = [
  { href: "/social", icon: Home, label: "Discover" },
  { href: "/social/officials", icon: Users, label: "Officials" },
  { href: "/social/polls", icon: BarChart2, label: "Polls" },
  { href: "/social/profile", icon: User, label: "Profile" },
];

export default function SocialNav() {
  const pathname = usePathname();
  return (
    <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-lg bg-white border-t border-gray-200 flex z-40 safe-area-inset-bottom">
      {tabs.map(({ href, icon: Icon, label }) => {
        const active = pathname === href || (href !== "/social" && (pathname ?? "").startsWith(href));
        return (
          <Link key={href} href={href} className={cn("flex-1 flex flex-col items-center gap-0.5 py-2.5 text-xs font-medium transition-colors", active ? "text-blue-600" : "text-gray-500 hover:text-gray-700")}>
            <Icon className={cn("w-5 h-5", active && "fill-blue-100")} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
