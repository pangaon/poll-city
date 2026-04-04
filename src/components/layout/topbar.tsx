"use client";
import { signOut } from "next-auth/react";
import { LogOut, User, ChevronDown } from "lucide-react";
import { useState } from "react";

type Role = "SUPER_ADMIN" | "ADMIN" | "CAMPAIGN_MANAGER" | "VOLUNTEER" | string;

interface TopBarProps {
  user: { name?: string | null; email?: string | null; role: Role };
}

const roleBadge: Record<string, string> = {
  SUPER_ADMIN: "bg-purple-100 text-purple-700",
  ADMIN: "bg-blue-100 text-blue-700",
  CAMPAIGN_MANAGER: "bg-green-100 text-green-700",
  VOLUNTEER: "bg-gray-100 text-gray-600",
};

const roleLabel: Record<string, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  CAMPAIGN_MANAGER: "Manager",
  VOLUNTEER: "Volunteer",
};

export default function TopBar({ user }: TopBarProps) {
  const [open, setOpen] = useState(false);
  const initials = user.name?.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase() ?? "??";

  return (
    <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6 flex-shrink-0">
      <div className="flex-1" />
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2.5 hover:bg-gray-50 rounded-lg px-2 py-1.5 transition-colors"
        >
          <div className="w-7 h-7 bg-blue-600 rounded-full flex items-center justify-center">
            <span className="text-xs font-bold text-white">{initials}</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user.name ?? user.email}</p>
            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${roleBadge[user.role] ?? roleBadge.VOLUNTEER}`}>
              {roleLabel[user.role] ?? user.role}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
        </button>

        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-52 bg-white border border-gray-200 rounded-xl shadow-lg z-20 py-1">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user.name}</p>
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <button
                onClick={() => signOut({ callbackUrl: "/login" })}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
              >
                <LogOut className="w-4 h-4" />
                Sign out
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  );
}