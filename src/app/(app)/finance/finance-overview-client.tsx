"use client";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Clock,
  FileWarning, ShoppingCart, CheckCircle2, ArrowRight, Receipt,
  Shield, X, Loader2,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";

interface RecentExpense {
  id: string;
  description: string;
  amount: number;
  expenseDate: string;
  expenseStatus: string;
  category: string;
}

interface OverviewData {
  budgets: Array<{ id: string; name: string; status: string; totalBudget: number; currency: string }>;
  summary: { totalPlanned: number; totalCommitted: number; totalActual: number; remaining: number; utilizationPct: number; burnPct: number; commitPct: number };
  byCategory: Array<{ category: string; planned: number; committed: number; actual: number; pct: number }>;
  atRiskLines: Array<{ id: string; name: string; category: string; planned: number; committed: number; actual: number; variancePct: number; status: string }>;
  monthlyBurn: Array<{ month: string; amount: number; cumulative: number }>;
  recentExpenses: RecentExpense[];
  alerts: { pendingApprovals: number; missingReceipts: number; unpaidBillsCount: number; unpaidBillsAmount: number; openPurchaseRequests: number };
}

function cad(n: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(n);
}
function pct(n: number) {
  return `${Math.round(n * 100)}%`;
}
function shortMonth(yyyyMm: string) {
  const [y, m] = yyyyMm.split("-").map(Number);
  return new Date(y, m - 1).toLocaleString("en-CA", { month: "short" });
}

const STATUS_COLOURS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  needs_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  paid: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
};

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
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className={`h-full rounded-full ${colour}`}
      />
    </div>
  );
}

// ── Compliance status — computed from existing overview data ──────────────────
function ComplianceCard({ data }: { data: OverviewData }) {
  const overCount = data.atRiskLines.filter((l) => l.status === "over").length;
  const warnCount = data.atRiskLines.filter((l) => l.status === "warning").length;
  const missing = data.alerts.missingReceipts;

  let iconColour = "bg-emerald-100 text-emerald-700";
  let label = "On Track";
  let desc = "All budget lines within limits";
  let reviewHref: string | null = null;

  if (overCount > 0 || data.summary.remaining < 0) {
    iconColour = "bg-red-100 text-red-700";
    label = "Over Budget";
    desc = `${overCount} line${overCount !== 1 ? "s" : ""} exceeded`;
    reviewHref = "/finance/budget";
  } else if (warnCount > 0 || missing > 0) {
    iconColour = "bg-amber-100 text-amber-700";
    label = "Attention Required";
    desc = [
      warnCount > 0 ? `${warnCount} line${warnCount !== 1 ? "s" : ""} near limit` : null,
      missing > 0 ? `${missing} receipt${missing !== 1 ? "s" : ""} missing` : null,
    ].filter(Boolean).join(" · ");
    reviewHref = "/finance/expenses";
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4 flex items-center gap-4">
      <div className={`p-2.5 rounded-lg ${iconColour}`}>
        <Shield className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 font-medium">Compliance Status</p>
        <p className="text-base font-bold text-gray-900 dark:text-white">{label}</p>
        <p className="text-xs text-gray-400 mt-0.5">{desc}</p>
      </div>
      {reviewHref ? (
        <Link href={reviewHref} className="shrink-0 text-xs font-semibold text-blue-700 hover:underline">
          Review
        </Link>
      ) : (
        <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
      )}
    </div>
  );
}

// ── Quick-add expense modal ───────────────────────────────────────────────────
function QuickAddModal({
  campaignId,
  onClose,
  onSaved,
}: {
  campaignId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    description: "",
    amount: "",
    expenseDate: new Date().toISOString().slice(0, 10),
    paymentMethod: "",
  });
  const [saving, setSaving] = useState(false);
  const descRef = useRef<HTMLInputElement>(null);

  useEffect(() => { descRef.current?.focus(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(form.amount);
    if (!form.description.trim() || isNaN(amt) || amt <= 0) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          campaignId,
          description: form.description.trim(),
          amount: amt,
          expenseDate: form.expenseDate,
          sourceType: "manual",
          ...(form.paymentMethod ? { paymentMethod: form.paymentMethod } : {}),
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? "Failed to save expense");
        return;
      }
      toast.success("Expense recorded");
      onSaved();
      onClose();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Quick Add Expense</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Description <span className="text-red-500">*</span>
            </label>
            <input
              ref={descRef}
              required
              type="text"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="e.g. Lawn signs, door-knock printing"
              maxLength={500}
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-[#0A2342] focus:outline-none text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Amount <span className="text-red-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                <input
                  required
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="w-full h-11 pl-6 pr-3 border-2 border-slate-300 rounded-lg focus:border-[#0A2342] focus:outline-none text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
                Date <span className="text-red-500">*</span>
              </label>
              <input
                required
                type="date"
                value={form.expenseDate}
                onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))}
                className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-[#0A2342] focus:outline-none text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Payment Method
            </label>
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm((f) => ({ ...f, paymentMethod: e.target.value }))}
              className="w-full h-11 px-3 border-2 border-slate-300 rounded-lg focus:border-[#0A2342] focus:outline-none text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
            >
              <option value="">— select —</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="credit_card">Credit card</option>
              <option value="debit">Debit</option>
              <option value="etransfer">e-Transfer</option>
              <option value="invoice">Invoice</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 border-2 border-slate-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="flex-1 h-11 bg-[#0A2342] text-white rounded-lg text-sm font-bold hover:bg-[#0A2342]/90 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Saving…</> : "Save Expense"}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
export default function FinanceOverviewClient({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [rev, setRev] = useState(0);

  useEffect(() => {
    setLoading(true);
    setError(null);
    fetch(`/api/finance/reports/overview?campaignId=${campaignId}`)
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then((j: { data?: OverviewData }) => { if (j.data) setData(j.data); })
      .catch(() => setError("Failed to load finance overview"))
      .finally(() => setLoading(false));
  }, [campaignId, rev]);

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 w-48 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
        <div className="h-40 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center gap-2 px-4 py-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-300">
        <AlertTriangle className="w-4 h-4 shrink-0" />
        <span>{error}</span>
      </div>
    );
  }

  const s = data?.summary ?? { totalPlanned: 0, totalCommitted: 0, totalActual: 0, remaining: 0, utilizationPct: 0, burnPct: 0, commitPct: 0 };
  const alerts = data?.alerts ?? { pendingApprovals: 0, missingReceipts: 0, unpaidBillsCount: 0, unpaidBillsAmount: 0, openPurchaseRequests: 0 };
  const chartData = (data?.monthlyBurn ?? []).map((d) => ({ ...d, label: shortMonth(d.month) }));
  const hasData = data && data.budgets.length > 0;

  return (
    <>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Finance Overview</h1>
            <p className="text-sm text-gray-500 mt-1">Budget · Expenses · Procurement · Approvals</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90 transition-colors"
          >
            + Add Expense
          </button>
        </div>

        {/* Alerts */}
        {(alerts.pendingApprovals > 0 || alerts.missingReceipts > 0 || alerts.unpaidBillsCount > 0 || alerts.openPurchaseRequests > 0) && (
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
                {alerts.openPurchaseRequests} open PR{alerts.openPurchaseRequests !== 1 ? "s" : ""}
              </Link>
            )}
          </div>
        )}

        {/* Summary cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard label="Total Budget" value={cad(s.totalPlanned)} sub={data?.budgets.length ? `${data.budgets.length} budget(s)` : undefined} colour="bg-blue-100 text-blue-700" icon={DollarSign} href="/finance/budget" />
          <StatCard label="Committed" value={cad(s.totalCommitted)} sub="approved spend" colour="bg-amber-100 text-amber-700" icon={ShoppingCart} href="/finance/purchase-requests" />
          <StatCard label="Actual Spend" value={cad(s.totalActual)} sub={pct(s.burnPct) + " of budget"} colour="bg-emerald-100 text-emerald-700" icon={TrendingUp} href="/finance/expenses" />
          <StatCard label="Remaining" value={cad(s.remaining)} sub={s.remaining < 0 ? "OVER BUDGET" : undefined} colour={s.remaining < 0 ? "bg-red-100 text-red-700" : "bg-green-100 text-green-700"} icon={s.remaining < 0 ? TrendingDown : CheckCircle2} />
        </div>

        {hasData && (
          <>
            {/* Compliance status */}
            <ComplianceCard data={data} />

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
                  <span>Actual {pct(s.burnPct)}</span>
                  <span>Committed {pct(s.commitPct)}</span>
                </div>
              </div>
            )}

            {/* Spend chart + recent transactions — side by side on desktop */}
            {(chartData.length > 0 || (data.recentExpenses?.length ?? 0) > 0) && (
              <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">
                {/* Monthly burn chart */}
                {chartData.length > 1 && (
                  <div className="lg:col-span-3 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4">
                    <p className="text-sm font-semibold text-gray-900 dark:text-white mb-3">Monthly Spend</p>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={chartData} margin={{ top: 4, right: 4, left: 0, bottom: 0 }}>
                        <defs>
                          <linearGradient id="burnGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.25} />
                            <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
                          </linearGradient>
                        </defs>
                        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} />
                        <YAxis tick={{ fontSize: 11, fill: "#9ca3af" }} axisLine={false} tickLine={false} tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} width={42} />
                        <Tooltip
                          formatter={(v) => [cad(Number(v)), "Spent"]}
                          contentStyle={{ fontSize: 12, borderRadius: 8, border: "1px solid #e5e7eb" }}
                        />
                        <Area type="monotone" dataKey="amount" stroke="#1D9E75" strokeWidth={2} fill="url(#burnGrad)" />
                      </AreaChart>
                    </ResponsiveContainer>
                  </div>
                )}

                {/* Recent transactions */}
                {(data.recentExpenses?.length ?? 0) > 0 && (
                  <div className={`${chartData.length > 1 ? "lg:col-span-2" : "lg:col-span-5"} bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700`}>
                    <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Receipt className="w-4 h-4 text-gray-400" />
                        <span className="text-sm font-semibold text-gray-900 dark:text-white">Recent Expenses</span>
                      </div>
                      <Link href="/finance/expenses" className="text-xs text-[#1D9E75] hover:underline font-medium">View all</Link>
                    </div>
                    <div className="divide-y divide-gray-50 dark:divide-slate-800">
                      {(data.recentExpenses ?? []).map((e) => (
                        <div key={e.id} className="px-4 py-2.5 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate">{e.description}</p>
                            <p className="text-xs text-gray-400 capitalize">
                              {e.category.replace(/_/g, " ")} · {new Date(e.expenseDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${STATUS_COLOURS[e.expenseStatus] ?? "bg-gray-100 text-gray-500"}`}>
                              {e.expenseStatus}
                            </span>
                            <span className="text-sm font-semibold text-gray-900 dark:text-white">{cad(e.amount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* At-risk budget lines */}
            {data.atRiskLines.length > 0 && (
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
                        <span className={`text-xs font-semibold ${line.status === "over" ? "text-red-600" : "text-amber-600"}`}>
                          {pct(line.variancePct)}
                          {line.status === "over" && " OVER"}
                        </span>
                      </div>
                      <ProgressBar
                        value={line.actual + line.committed}
                        max={line.planned}
                        colour={line.status === "over" ? "bg-red-500" : "bg-amber-500"}
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
            {data.byCategory.length > 0 && (
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
                        <th className="px-4 py-2 text-right">Used</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                      {data.byCategory.slice(0, 12).map(({ category, planned, actual, pct: usedPct }) => (
                        <tr key={category} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                          <td className="px-4 py-2.5 font-medium text-gray-700 dark:text-slate-300 capitalize">
                            {category.replace(/_/g, " ")}
                          </td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{cad(planned)}</td>
                          <td className="px-4 py-2.5 text-right font-medium text-gray-800 dark:text-slate-200">{cad(actual)}</td>
                          <td className={`px-4 py-2.5 text-right font-medium ${planned - actual < 0 ? "text-red-600" : "text-gray-600 dark:text-slate-400"}`}>
                            {cad(planned - actual)}
                          </td>
                          <td className="px-4 py-2.5 text-right">
                            <span className={`text-xs font-semibold ${usedPct > 100 ? "text-red-600" : usedPct > 80 ? "text-amber-600" : "text-emerald-600"}`}>
                              {Math.round(usedPct)}%
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </>
        )}

        {/* Empty state */}
        {!loading && !hasData && (
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

      {/* Quick-add expense modal */}
      <AnimatePresence>
        {showModal && (
          <QuickAddModal
            campaignId={campaignId}
            onClose={() => setShowModal(false)}
            onSaved={() => setRev((v) => v + 1)}
          />
        )}
      </AnimatePresence>
    </>
  );
}
