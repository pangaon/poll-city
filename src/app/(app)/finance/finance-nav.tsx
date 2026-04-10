"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Receipt, Building2, ShoppingCart, FileText, RotateCcw, CheckCircle2, BarChart3 } from "lucide-react";

const NAV = [
  { href: "/finance", label: "Overview", icon: LayoutDashboard, exact: true },
  { href: "/finance/budget", label: "Budget", icon: BarChart3 },
  { href: "/finance/expenses", label: "Expenses", icon: Receipt },
  { href: "/finance/vendors", label: "Vendors", icon: Building2 },
  { href: "/finance/purchase-requests", label: "Requests", icon: ShoppingCart },
  { href: "/finance/reimbursements", label: "Reimburse", icon: RotateCcw },
  { href: "/finance/approvals", label: "Approvals", icon: CheckCircle2 },
  { href: "/finance/reports", label: "Reports", icon: FileText },
] as const;

export default function FinanceNav({ campaignId: _campaignId }: { campaignId: string }) {
  const pathname = usePathname();

  return (
    <div className="mb-4 overflow-x-auto">
      <nav className="flex gap-1 min-w-max p-1 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
        {NAV.map((item) => {
          const { href, label, icon: Icon } = item;
          const exact = "exact" in item ? item.exact : false;
          const active = exact ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors
                ${active
                  ? "bg-[#0A2342] text-white"
                  : "text-gray-600 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-800"
                }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
