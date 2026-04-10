"use client";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock, FileWarning, ShoppingCart, CheckCircle2, ArrowRight } from "lucide-react";
import Link from "next/link";

interface OverviewData {
  budgets: Array<{ id: string; name: string; status: string; totalBudget: number; currency: string }>;
  summary: { totalPlanned: number; totalCommitted: number; totalActual: number; remaining: number; utilizationPct: number };
  categories: Record<string, { planned: number; committed: number; actual: number }>;
  atRiskLines: Array<{ id: string; name: string; category: string; planned: number; committed: number; actual: number; utilizationPct: number }>;
  alerts: { pendingApprovals: number; missingReceipts: number; unpaidBillsCount: number; unpaidBillsAmount: number; openPurchaseRequests: number };
}

function cad(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}

function StatCard({ label, value, sub, colour, icon: Icon, href }: {
  label: string; value: string; sub?: string; colour: string; icon: React.ElementType; href?: string;
}) {
  const inner = (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex items-start gap-3"
    >
      <div className={`p-2 rounded-lg ${colour}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-500 dark:text-slate-400 font-medium">{label}</p>
        <p className="text-xl font-bold text-gray-900 dark:text-white mt-0.5 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {href && <ArrowRight className="w-4 h-4 text-gray-400 mt-1 shrink-0" />}
    </motion.div>
  );
  return href ? <Link href={href} className="block">{inner}</Link> : inner;
}

function ProgressBar({ value, max, colour }: { value: number; max: number; colour: string }) {
  const pctVal = max > 0 ? Math.min(value / max, 1) : 0;
  return (
    <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: `${pctVal * 100}%` }}
        transition={{ duration: 0.6, type: "spring", stiffness: 80, damping: 20 }}
        className={`h-full rounded-full ${colour}`}
      />
    </div>
  );
}

export default function FinanceOverviewClient({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/finance/reports/overview?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((j) => { if (j.data) setData(j.data); })
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading) {
    return (
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[...Array(8)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  const s = data?.summary ?? { totalPlanned: 0, totalCommitted: 0, totalActual: 0, remaining: 0, utilizationPct: 0 };
  const alerts = data?.alerts ?? { pendingApprovals: 0, missingReceipts: 0, unpaidBillsCount: 0, unpaidBillsAmount: 0, openPurchaseRequests: 0 };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Budget · Expenses · Procurement · Approvals</p>
        </div>
        <Link
          href="/finance/expenses"
          className="flex items-center gap-2 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90 transition-colors"
        >
          + Add Expense
        </Link>
      </div>

      {/* Alerts */}
      {(alerts.pendingApprovals > 0 || alerts.missingReceipts > 0 || alerts.unpaidBillsCount > 0) && (
        <div className="flex flex-wrap gap-2">
          {alerts.pendingApprovals > 0 && (
            <Link href="/finance/approvals" className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-lg text-sm text-amber-800 dark:text-amber-300 font-medium">
              <Clock className="w-3.5 h-3.5" />
              {alerts.pendingApprovals} pending approval{alerts.pendingApprovals !== 1 ? "s" : ""}
            </Link>
          )}
          {alerts.missingReceipts > 0 && (
            <Link href="/finance/expenses?missingReceipt=true" className="flex items-center gap-1.5 px-3 py-1.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-800 dark:text-red-300 font-medium">
              <FileWarning className="w-3.5 h-3.5" />
              {alerts.missingReceipts} missing receipt{alerts.missingReceipts !== 1 ? "s" : ""}
            </Link>
          )}
          {alerts.unpaidBillsCount > 0 && (
            <div className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-700 rounded-lg text-sm text-orange-800 dark:text-orange-300 font-medium">
              <AlertTriangle className="w-3.5 h-3.5" />
              {alerts.unpaidBillsCount} unpaid bill{alerts.unpaidBillsCount !== 1 ? "s" : ""} · {cad(alerts.unpaidBillsAmount)}
            </div>
          )}
          {alerts.openPurchaseRequests > 0 && (
            <Link href="/finance/purchase-requests?status=submitted" className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg text-sm text-blue-800 dark:text-blue-300 font-medium">
              <ShoppingCart className="w-3.5 h-3.5" />
              {alerts.openPurchaseRequests} open purchase request{alerts.openPurchaseRequests !== 1 ? "s" : ""}
            </Link>
          )}
        </div>
      )}

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard label="Total Budget" value={cad(s.totalPlanned)} sub={data?.budgets.length ? `${data.budgets.length} budget(s)` : undefined} colour="bg-blue-100 text-blue-700" icon={DollarSign} href="/finance/budget" />
        <StatCard label="Committed" value={cad(s.totalCommitted)} sub="approved spend" colour="bg-amber-100 text-amber-700" icon={ShoppingCart} href="/finance/purchase-requests" />
        <StatCard label="Actual Spend" value={cad(s.totalActual)} sub={pct(s.utilizationPct) + " of budget"} colour="bg-emerald-100 text-emerald-700" icon={TrendingUp} href="/finance/expenses" />
        <StatCard label="Remaining" value={cad(s.remaining)} sub={s.remaining < 0 ? "OVER BUDGET" : undefined} colour={s.remaining < 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"} icon={s.remaining < 0 ? TrendingDown : CheckCircle2} />
      </div>

      {/* Overall burn bar */}
      {s.totalPlanned > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <div className="flex justify-between text-sm mb-2">
            <span className="font-medium text-gray-700 dark:text-slate-300">Budget Utilisation</span>
            <span className="text-gray-500">{cad(s.totalActual)} of {cad(s.totalPlanned)}</span>
          </div>
          <ProgressBar
            value={s.totalActual + s.totalCommitted}
            max={s.totalPlanned}
            colour={s.utilizationPct > 0.9 ? "bg-red-500" : s.utilizationPct > 0.75 ? "bg-amber-500" : "bg-[#1D9E75]"}
          />
          <div className="flex justify-between text-xs text-gray-400 mt-1.5">
            <span>Actual {pct(s.utilizationPct)}</span>
            <span>Committed {pct(s.totalPlanned > 0 ? s.totalCommitted / s.totalPlanned : 0)}</span>
          </div>
        </div>
      )}

      {/* Budget line breakdown */}
      {data?.atRiskLines && data.atRiskLines.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" />
            <span className="font-semibold text-gray-900 dark:text-white text-sm">At-Risk Budget Lines</span>
          </div>
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {data.atRiskLines.slice(0, 8).map((line) => (
              <div key={line.id} className="px-4 py-3">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-sm font-medium text-gray-800 dark:text-slate-200">{line.name}</span>
                  <span className={`text-xs font-semibold ${line.utilizationPct > 1 ? "text-red-600" : "text-amber-600"}`}>
                    {pct(line.utilizationPct)}
                  </span>
                </div>
                <ProgressBar
                  value={line.actual + line.committed}
                  max={line.planned}
                  colour={line.utilizationPct > 1 ? "bg-red-500" : "bg-amber-500"}
                />
                <div className="flex justify-between text-xs text-gray-400 mt-1">
                  <span>{cad(line.actual)} actual · {cad(line.committed)} committed</span>
                  <span>of {cad(line.planned)}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Category breakdown */}
      {data?.categories && Object.keys(data.categories).length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <span className="font-semibold text-gray-900 dark:text-white text-sm">Spend by Category</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-50 dark:border-slate-800">
                  <th className="px-4 py-2 text-left">Category</th>
                  <th className="px-4 py-2 text-right">Planned</th>
                  <th className="px-4 py-2 text-right">Actual</th>
                  <th className="px-4 py-2 text-right">Remaining</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {Object.entries(data.categories)
                  .sort((a, b) => b[1].actual - a[1].actual)
                  .slice(0, 12)
                  .map(([cat, vals]) => (
                    <tr key={cat} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                      <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-slate-300 capitalize">
                        {cat.replace(/_/g, " ")}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{cad(vals.planned)}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-slate-200">{cad(vals.actual)}</td>
                      <td className={`px-4 py-2.5 text-right font-medium ${vals.planned - vals.actual < 0 ? "text-red-600" : "text-gray-600 dark:text-slate-400"}`}>
                        {cad(vals.planned - vals.actual)}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!loading && (!data || data.budgets.length === 0) && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-300 mb-1">No budget set up yet</h3>
          <p className="text-sm text-gray-400 mb-4">Create your campaign budget to start tracking spend.</p>
          <Link href="/finance/budget" className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium">
            Create Budget
          </Link>
        </div>
      )}
    </div>
  );
}
