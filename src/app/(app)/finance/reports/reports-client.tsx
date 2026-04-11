"use client";
import { useEffect, useState, useCallback } from "react";
import { AlertTriangle, CheckCircle2, Download, TrendingDown, TrendingUp, BarChart3, Clock, FileText, Scale } from "lucide-react";
import Link from "next/link";

interface VarianceLine {
  id: string; code: string; name: string; category: string;
  planned: number; committed: number; actual: number;
  variance: number; variancePct: number; status: "ok" | "warning" | "over";
}
interface CategoryRow {
  category: string; planned: number; committed: number; actual: number; pct: number;
}
interface MonthBurn {
  month: string; amount: number; cumulative: number;
}
interface Overview {
  budgets: Array<{ id: string; name: string; status: string; totalBudget: number; currency: string; startDate: string | null; endDate: string | null }>;
  summary: { totalPlanned: number; totalCommitted: number; totalActual: number; remaining: number; burnPct: number; commitPct: number; utilizationPct: number };
  varianceLines: VarianceLine[];
  byCategory: CategoryRow[];
  atRiskLines: VarianceLine[];
  monthlyBurn: MonthBurn[];
  alerts: { pendingApprovals: number; missingReceipts: number; unpaidBillsCount: number; unpaidBillsAmount: number; openPurchaseRequests: number };
}

interface ReconciliationData {
  totalBudget: number;
  totalSpent: number;
  totalTax: number;
  totalRaised: number;
  totalPledged: number;
  totalRefunded: number;
  netPosition: number;
  budgetRemaining: number;
  fundingGap: number;
  donationCount: number;
  byDonationType: Array<{ type: string; raised: number; pledged: number; count: number }>;
}

function cad(v: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(v);
}
function pct(v: number) {
  return `${Math.round(v * 100)}%`;
}
function fmtMonth(ym: string) {
  const [y, m] = ym.split("-");
  return new Date(Number(y), Number(m) - 1, 1).toLocaleDateString("en-CA", { month: "short", year: "2-digit" });
}

export default function ReportsClient({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<"budget" | "reconciliation">("budget");
  const [overview, setOverview] = useState<Overview | null>(null);
  const [recon, setRecon] = useState<ReconciliationData | null>(null);
  const [loading, setLoading] = useState(true);
  const [reconLoading, setReconLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/reports/overview?campaignId=${campaignId}`).then((r) => r.json());
    if (res.data) setOverview(res.data);
    setLoading(false);
  }, [campaignId]);

  const loadRecon = useCallback(async () => {
    if (recon) return;
    setReconLoading(true);
    const res = await fetch(`/api/finance/reconciliation?campaignId=${campaignId}`).then((r) => r.json());
    if (res.data) setRecon(res.data);
    setReconLoading(false);
  }, [campaignId, recon]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (tab === "reconciliation") loadRecon(); }, [tab, loadRecon]);

  async function handleExport() {
    setExporting(true);
    try {
      const res = await fetch(`/api/finance/exports/expenses?campaignId=${campaignId}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${campaignId}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance Reports</h1>
        </div>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
        </div>
        <div className="h-48 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-64 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!overview || overview.budgets.length === 0) {
    return (
      <div className="text-center py-20">
        <BarChart3 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
        <p className="text-sm text-gray-500 dark:text-slate-400">No budget data yet.</p>
        <Link href="/finance/budget" className="mt-3 inline-block text-sm text-[#0A2342] dark:text-blue-400 underline">
          Create a budget to see reports
        </Link>
      </div>
    );
  }

  const { summary, varianceLines, byCategory, atRiskLines, monthlyBurn, alerts, budgets } = overview;
  const hasAlerts = alerts.pendingApprovals > 0 || alerts.missingReceipts > 0 || alerts.unpaidBillsCount > 0 || alerts.openPurchaseRequests > 0;
  const maxMonthAmount = Math.max(...monthlyBurn.map((m) => m.amount), 1);
  const maxCumulative = Math.max(...monthlyBurn.map((m) => m.cumulative), 1);

  // Reconciliation panel rendered in place of budget view
  if (tab === "reconciliation") {
    return (
      <div className="space-y-6">
        {/* Tab bar */}
        <div className="flex items-center gap-1 border-b border-gray-200 dark:border-slate-700">
          <button onClick={() => setTab("budget")} className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors">Budget &amp; Variance</button>
          <button className="px-4 py-2 text-sm font-semibold text-[#0A2342] dark:text-blue-400 border-b-2 border-[#0A2342] dark:border-blue-400 -mb-px">Reconciliation</button>
        </div>

        {reconLoading || !recon ? (
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[...Array(6)].map((_, i) => <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />)}
          </div>
        ) : (
          <>
            {/* Net position banner */}
            <div className={`rounded-xl p-4 flex items-center gap-3 ${recon.netPosition >= 0 ? "bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800" : "bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800"}`}>
              {recon.netPosition >= 0
                ? <TrendingUp className="w-5 h-5 text-emerald-600 shrink-0" />
                : <TrendingDown className="w-5 h-5 text-red-600 shrink-0" />}
              <div>
                <p className={`text-sm font-semibold ${recon.netPosition >= 0 ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"}`}>
                  Net cash position: {cad(recon.netPosition)}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">
                  Raised {cad(recon.totalRaised)} confirmed − Spent {cad(recon.totalSpent)} approved
                </p>
              </div>
            </div>

            {/* KPI grid */}
            <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { label: "Total Budget", value: cad(recon.totalBudget), colour: "text-gray-800 dark:text-white", sub: "active + draft budgets" },
                { label: "Confirmed Raised", value: cad(recon.totalRaised), colour: "text-[#1D9E75]", sub: `${recon.donationCount} donations` },
                { label: "Pledged", value: cad(recon.totalPledged), colour: "text-amber-600", sub: "not yet processed" },
                { label: "Approved Spend", value: cad(recon.totalSpent), colour: recon.totalSpent > recon.totalRaised ? "text-red-600" : "text-[#0A2342] dark:text-blue-300", sub: recon.totalTax > 0 ? `incl. ${cad(recon.totalTax)} tax` : "approved + paid" },
                { label: "Budget Remaining", value: cad(recon.budgetRemaining), colour: recon.budgetRemaining < 0 ? "text-red-600" : "text-[#1D9E75]", sub: "budget − approved spend" },
                { label: "Funding Gap", value: recon.fundingGap > 0 ? cad(recon.fundingGap) : "None", colour: recon.fundingGap > 0 ? "text-red-600" : "text-[#1D9E75]", sub: recon.fundingGap > 0 ? "still need to raise" : "budget covered" },
              ].map((card) => (
                <div key={card.label} className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                  <p className="text-xs text-gray-500 dark:text-slate-400 mb-1">{card.label}</p>
                  <p className={`text-xl font-bold ${card.colour}`}>{card.value}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
                </div>
              ))}
            </div>

            {/* By donation type */}
            {recon.byDonationType.length > 0 && (
              <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
                  <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Donations by Type</h2>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
                      <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-2.5">Type</th>
                      <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 px-3 py-2.5">Count</th>
                      <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 px-3 py-2.5">Confirmed</th>
                      <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-2.5">Pledged</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                    {recon.byDonationType.map((row) => (
                      <tr key={row.type} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30">
                        <td className="px-4 py-2.5 text-xs font-medium text-gray-800 dark:text-slate-200 capitalize">{row.type.replace(/_/g, " ")}</td>
                        <td className="px-3 py-2.5 text-right text-xs text-gray-500 dark:text-slate-400">{row.count}</td>
                        <td className="px-3 py-2.5 text-right text-xs font-medium text-[#1D9E75]">{row.raised > 0 ? cad(row.raised) : "—"}</td>
                        <td className="px-4 py-2.5 text-right text-xs text-amber-600">{row.pledged > 0 ? cad(row.pledged) : "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {recon.totalRefunded > 0 && (
              <p className="text-xs text-gray-400 text-right">Total refunded: {cad(recon.totalRefunded)} (already deducted from confirmed raised)</p>
            )}
          </>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Tab bar */}
      <div className="flex items-center gap-1 border-b border-gray-200 dark:border-slate-700">
        <button className="px-4 py-2 text-sm font-semibold text-[#0A2342] dark:text-blue-400 border-b-2 border-[#0A2342] dark:border-blue-400 -mb-px">Budget &amp; Variance</button>
        <button onClick={() => setTab("reconciliation")} className="px-4 py-2 text-sm text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors flex items-center gap-1.5">
          <Scale className="w-3.5 h-3.5" /> Reconciliation
        </button>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Finance Reports</h1>
          <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{budgets[0]?.name}</p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/finance/audit"
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm text-gray-600 dark:text-slate-400 border border-gray-200 dark:border-slate-700 rounded-lg hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" /> Audit Trail
          </Link>
          <button
            onClick={handleExport}
            disabled={exporting}
            className="flex items-center gap-1.5 px-3 py-1.5 text-sm bg-[#0A2342] text-white rounded-lg hover:bg-[#0A2342]/90 disabled:opacity-50 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            {exporting ? "Exporting…" : "Export CSV"}
          </button>
        </div>
      </div>

      {/* Alerts bar */}
      {hasAlerts && (
        <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded-xl px-4 py-3 flex flex-wrap gap-3 text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          {alerts.pendingApprovals > 0 && <span><strong>{alerts.pendingApprovals}</strong> expenses pending approval</span>}
          {alerts.missingReceipts > 0 && <span><strong>{alerts.missingReceipts}</strong> missing receipts</span>}
          {alerts.unpaidBillsCount > 0 && <span><strong>{alerts.unpaidBillsCount}</strong> unpaid bills ({cad(alerts.unpaidBillsAmount)})</span>}
          {alerts.openPurchaseRequests > 0 && <span><strong>{alerts.openPurchaseRequests}</strong> open purchase requests</span>}
        </div>
      )}

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: "Total Budget", value: cad(summary.totalPlanned), sub: "planned", icon: null, colour: "text-gray-800 dark:text-white" },
          { label: "Committed", value: cad(summary.totalCommitted), sub: pct(summary.commitPct) + " of budget", icon: Clock, colour: "text-amber-600" },
          { label: "Actual Spend", value: cad(summary.totalActual), sub: pct(summary.burnPct) + " burned", icon: summary.burnPct > 0.9 ? TrendingDown : TrendingUp, colour: summary.burnPct > 0.9 ? "text-red-600" : "text-[#0A2342] dark:text-blue-300" },
          { label: "Remaining", value: cad(summary.remaining), sub: "uncommitted + unspent", icon: null, colour: summary.remaining < 0 ? "text-red-600" : "text-[#1D9E75]" },
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
          <span className="text-sm font-semibold text-gray-700 dark:text-slate-200">Budget Utilisation</span>
          <span className="text-xs text-gray-400">{pct(summary.utilizationPct)} of {cad(summary.totalPlanned)} committed or spent</span>
        </div>
        <div className="h-4 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
          <div className="h-full bg-[#0A2342] dark:bg-blue-600 transition-all" style={{ width: `${Math.min(summary.burnPct * 100, 100)}%` }} />
          <div className="h-full bg-amber-300 dark:bg-amber-500 transition-all" style={{ width: `${Math.min(summary.commitPct * 100, 100 - summary.burnPct * 100)}%` }} />
        </div>
        <div className="flex gap-4 mt-2 text-xs text-gray-400">
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#0A2342] dark:bg-blue-600 inline-block" /> Spent {pct(summary.burnPct)}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-amber-300 dark:bg-amber-500 inline-block" /> Committed {pct(summary.commitPct)}</span>
          <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-gray-100 dark:bg-slate-700 inline-block border border-gray-200 dark:border-slate-600" /> Available {pct(1 - summary.utilizationPct)}</span>
        </div>
      </div>

      {/* Monthly burn chart + at-risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Monthly spend bars */}
        {monthlyBurn.length > 0 && (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Monthly Spend</h2>
            <div className="space-y-2">
              {monthlyBurn.map((m) => (
                <div key={m.month} className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-slate-400 w-12 shrink-0">{fmtMonth(m.month)}</span>
                  <div className="flex-1 h-5 bg-gray-100 dark:bg-slate-800 rounded-sm overflow-hidden">
                    <div
                      className="h-full bg-[#0A2342] dark:bg-blue-600 rounded-sm transition-all"
                      style={{ width: `${(m.amount / maxMonthAmount) * 100}%` }}
                    />
                  </div>
                  <span className="text-xs text-gray-700 dark:text-slate-300 w-16 text-right shrink-0">{m.amount > 0 ? cad(m.amount) : "—"}</span>
                </div>
              ))}
            </div>
            {monthlyBurn.length > 0 && (
              <p className="text-xs text-gray-400 mt-3">
                Cumulative: {cad(monthlyBurn[monthlyBurn.length - 1]?.cumulative ?? 0)} of {cad(summary.totalPlanned)}
              </p>
            )}
          </div>
        )}

        {/* At-risk lines */}
        {atRiskLines.length > 0 ? (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
            <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-3 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 text-amber-500" /> At-Risk Budget Lines
            </h2>
            <div className="space-y-3">
              {atRiskLines.map((line) => (
                <div key={line.id}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-gray-700 dark:text-slate-300 font-medium truncate flex-1">{line.name}</span>
                    <span className={`ml-2 shrink-0 font-bold ${line.status === "over" ? "text-red-600" : "text-amber-600"}`}>
                      {pct(line.variancePct)} {line.status === "over" && "⚠ OVER"}
                    </span>
                  </div>
                  <div className="h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${line.status === "over" ? "bg-red-500" : "bg-amber-400"}`}
                      style={{ width: `${Math.min(line.variancePct * 100, 100)}%` }}
                    />
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{cad(line.actual + line.committed)} of {cad(line.planned)}</p>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex flex-col items-center justify-center gap-2 py-12">
            <CheckCircle2 className="w-10 h-10 text-emerald-400" />
            <p className="text-sm font-medium text-gray-700 dark:text-slate-300">All lines within budget</p>
            <p className="text-xs text-gray-400">No lines are approaching their threshold.</p>
          </div>
        )}
      </div>

      {/* Variance table */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm">Budget vs Actual — All Lines</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-800/30">
                <th className="text-left text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-2.5">Line</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 px-3 py-2.5">Planned</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 px-3 py-2.5">Committed</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 px-3 py-2.5">Actual</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 px-3 py-2.5">Variance</th>
                <th className="text-right text-xs font-medium text-gray-500 dark:text-slate-400 px-4 py-2.5">Used</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
              {varianceLines.map((line) => (
                <tr key={line.id} className="hover:bg-gray-50/50 dark:hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                          line.status === "over" ? "bg-red-500" :
                          line.status === "warning" ? "bg-amber-400" :
                          "bg-emerald-400"
                        }`}
                      />
                      <div>
                        <p className="text-xs font-medium text-gray-800 dark:text-slate-200">{line.name}</p>
                        <p className="text-xs text-gray-400">{line.category.replace(/_/g, " ")}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-right text-xs text-gray-600 dark:text-slate-400">{cad(line.planned)}</td>
                  <td className="px-3 py-2.5 text-right text-xs text-amber-600">{line.committed > 0 ? cad(line.committed) : "—"}</td>
                  <td className="px-3 py-2.5 text-right text-xs font-medium text-gray-800 dark:text-slate-200">{line.actual > 0 ? cad(line.actual) : "—"}</td>
                  <td className={`px-3 py-2.5 text-right text-xs font-medium ${line.variance < 0 ? "text-red-600" : "text-[#1D9E75]"}`}>
                    {line.variance >= 0 ? "+" : ""}{cad(line.variance)}
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2 justify-end">
                      <div className="w-20 h-1.5 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            line.status === "over" ? "bg-red-500" :
                            line.status === "warning" ? "bg-amber-400" :
                            "bg-[#1D9E75]"
                          }`}
                          style={{ width: `${Math.min(line.variancePct * 100, 100)}%` }}
                        />
                      </div>
                      <span className={`text-xs w-9 text-right ${
                        line.status === "over" ? "text-red-600 font-medium" :
                        line.status === "warning" ? "text-amber-600" :
                        "text-gray-500 dark:text-slate-400"
                      }`}>{pct(line.variancePct)}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-gray-200 dark:border-slate-700 bg-gray-50/50 dark:bg-slate-800/30">
                <td className="px-4 py-2.5 text-xs font-semibold text-gray-700 dark:text-slate-300">Total</td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-700 dark:text-slate-300">{cad(summary.totalPlanned)}</td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold text-amber-600">{cad(summary.totalCommitted)}</td>
                <td className="px-3 py-2.5 text-right text-xs font-semibold text-gray-800 dark:text-slate-200">{cad(summary.totalActual)}</td>
                <td className={`px-3 py-2.5 text-right text-xs font-semibold ${summary.remaining < 0 ? "text-red-600" : "text-[#1D9E75]"}`}>
                  {summary.remaining >= 0 ? "+" : ""}{cad(summary.remaining)}
                </td>
                <td className="px-4 py-2.5 text-right text-xs font-semibold text-gray-700 dark:text-slate-300">{pct(summary.utilizationPct)}</td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Category spend */}
      {byCategory.length > 0 && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
          <h2 className="font-semibold text-gray-900 dark:text-white text-sm mb-4">Spend by Category</h2>
          <div className="space-y-2.5">
            {byCategory.map((cat) => (
              <div key={cat.category}>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="text-gray-600 dark:text-slate-400 capitalize">{cat.category.replace(/_/g, " ")}</span>
                  <span className="font-medium text-gray-900 dark:text-white">
                    {cad(cat.actual)}
                    {cat.committed > 0 && <span className="text-amber-500"> +{cad(cat.committed)}</span>}
                    <span className="text-gray-400 font-normal"> / {cad(cat.planned)}</span>
                  </span>
                </div>
                <div className="h-2 bg-gray-100 dark:bg-slate-800 rounded-full overflow-hidden flex">
                  <div
                    className={`h-full transition-all ${cat.pct > 100 ? "bg-red-500" : cat.pct > 85 ? "bg-amber-400" : "bg-[#1D9E75]"}`}
                    style={{ width: `${Math.min((cat.actual / cat.planned) * 100, 100)}%` }}
                  />
                  {cat.committed > 0 && (
                    <div
                      className="h-full bg-amber-200 dark:bg-amber-700 transition-all"
                      style={{ width: `${Math.min((cat.committed / cat.planned) * 100, 100 - (cat.actual / cat.planned) * 100)}%` }}
                    />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
