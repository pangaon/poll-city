"use client";
import { useEffect, useState, useCallback } from "react";
import { BarChart3, TrendingDown, TrendingUp, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Overview {
  budget: { totalPlanned: number; totalCommitted: number; totalActual: number; remaining: number };
  byCategory: Array<{ category: string; planned: number; actual: number; pct: number }>;
  atRisk: Array<{ id: string; name: string; planned: number; actual: number; committed: number; pct: number }>;
  alerts: { overBudget: number; pendingApprovals: number; overdueReimbursements: number };
}

function cad(v: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
}

function pct(v: number) {
  return `${Math.round(v)}%`;
}

export default function ReportsClient({ campaignId }: { campaignId: string }) {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/reports/overview?campaignId=${campaignId}`).then((r) => r.json());
    if (res.data) setOverview(res.data);
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance Reports</h1>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  if (!overview) {
    return (
      <div className="text-center py-16">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500">No budget data yet. Create a budget to see reports.</p>
      </div>
    );
  }

  const { budget, byCategory, atRisk, alerts } = overview;
  const burnPct = budget.totalPlanned > 0 ? (budget.totalActual / budget.totalPlanned) * 100 : 0;
  const commitPct = budget.totalPlanned > 0 ? (budget.totalCommitted / budget.totalPlanned) * 100 : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance Reports</h1>
        {(alerts.overBudget > 0 || alerts.pendingApprovals > 0) && (
          <div className="flex items-center gap-1.5 text-amber-600 text-sm">
            <AlertTriangle className="w-4 h-4" />
            {alerts.overBudget > 0 && <span>{alerts.overBudget} over budget</span>}
            {alerts.pendingApprovals > 0 && <span>· {alerts.pendingApprovals} pending approval</span>}
          </div>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Budget", value: cad(budget.totalPlanned), sub: "planned", colour: "text-gray-700 dark:text-slate-200" },
          { label: "Committed", value: cad(budget.totalCommitted), sub: `${pct(commitPct)} of budget`, colour: "text-amber-600" },
          { label: "Actual Spend", value: cad(budget.totalActual), sub: `${pct(burnPct)} burned`, colour: burnPct > 90 ? "text-red-600" : "text-[#0A2342]" },
          { label: "Remaining", value: cad(budget.remaining), sub: "available", colour: budget.remaining < 0 ? "text-red-600" : "text-[#1D9E75]" },
        ].map((card) => (
          <div key={card.label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{card.label}</p>
            <p className={`text-xl font-bold ${card.colour}`}>{card.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
          </div>
        ))}
      </div>

      {/* Burn bar */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700 dark:text-slate-300">Budget Burn</span>
          <span className="text-xs text-gray-400">{pct(burnPct + commitPct)} committed + spent</span>
        </div>
        <div className="h-3 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-[#0A2342] rounded-l-full transition-all" style={{ width: `${Math.min(burnPct, 100)}%` }} />
          <div className="h-full bg-amber-300 transition-all" style={{ width: `${Math.min(commitPct, 100 - burnPct)}%` }} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#0A2342] inline-block" /> Spent</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-300 inline-block" /> Committed</span>
          <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-gray-100 dark:bg-slate-700 inline-block border border-gray-200 dark:border-slate-600" /> Available</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Spend by category */}
        {byCategory.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3">Spend by Category</h2>
            <div className="space-y-2">
              {byCategory.map((cat) => (
                <div key={cat.category}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-600 dark:text-slate-400 capitalize">{cat.category.replace(/_/g, " ")}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{cad(cat.actual)} <span className="text-gray-400 font-normal">of {cad(cat.planned)}</span></span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${cat.pct > 100 ? "bg-red-500" : cat.pct > 80 ? "bg-amber-400" : "bg-[#1D9E75]"}`}
                      style={{ width: `${Math.min(cat.pct, 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* At-risk lines */}
        {atRisk.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> At-Risk Lines
            </h2>
            <div className="space-y-2">
              {atRisk.map((line) => (
                <div key={line.id} className="flex items-center justify-between text-xs">
                  <span className="text-gray-600 dark:text-slate-400 truncate flex-1">{line.name}</span>
                  <span className={`font-semibold ml-2 shrink-0 ${line.pct > 100 ? "text-red-600" : "text-amber-600"}`}>{pct(line.pct)}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col items-center justify-center text-center gap-2 py-8">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
            <p className="text-sm text-gray-500">No budget lines at risk.</p>
          </div>
        )}
      </div>
    </div>
  );
}
