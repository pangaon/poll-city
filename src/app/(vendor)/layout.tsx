"use client";

import { useSession } from "next-auth/react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { LayoutDashboard, Briefcase, FileText, LogOut, Printer } from "lucide-react";
import { signOut } from "next-auth/react";

const NAV = [
  { href: "/vendor/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/vendor/jobs", label: "Available Jobs", icon: Briefcase },
  { href: "/vendor/bids", label: "My Bids", icon: FileText },
];

export default function VendorLayout({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const router = useRouter();
  const pathname = usePathname();

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-gray-500">Loading…</div>
      </div>
    );
  }

  if (!session || session.user?.role !== "PRINT_VENDOR") {
    router.push("/login");
    return null;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Sidebar */}
      <aside className="w-56 bg-[#0A2342] text-white flex flex-col">
        <div className="px-5 py-6 flex items-center gap-2 border-b border-white/10">
          <Printer className="w-5 h-5 text-[#1D9E75]" />
          <span className="font-semibold text-sm">Poll City Print</span>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {NAV.map(({ href, label, icon: Icon }) => {
            const active = pathname === href || pathname.startsWith(href + "/");
            return (
              <Link
                key={href}
                href={href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[#1D9E75] text-white"
                    : "text-white/70 hover:text-white hover:bg-white/10"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="px-3 py-4 border-t border-white/10">
          <div className="px-3 py-2 text-xs text-white/50 truncate">{session.user?.email}</div>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm text-white/70 hover:text-white hover:bg-white/10 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  );
}
