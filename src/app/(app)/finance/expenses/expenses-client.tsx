"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, Receipt, FileWarning, Search, Filter, X, ChevronRight, Check, AlertTriangle } from "lucide-react";
import Link from "next/link";

interface Expense {
  id: string;
  description: string;
  amount: string;
  taxAmount: string;
  expenseDate: string;
  expenseStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  missingReceipt: boolean;
  vendor: { id: string; name: string } | null;
  budgetLine: { id: string; name: string; category: string } | null;
  enteredBy: { id: string; name: string };
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  needs_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-purple-100 text-purple-700",
  archived: "bg-gray-100 text-gray-400",
};

function cad(v: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(v));
}

interface NewExpenseForm {
  description: string;
  amount: string;
  taxAmount: string;
  expenseDate: string;
  budgetLineId: string;
  vendorName: string;
  paymentMethod: string;
  notes: string;
}

const PAYMENT_METHODS = ["cash", "cheque", "credit_card", "debit", "etransfer", "wire", "invoice", "other"];

export default function ExpensesClient({ campaignId }: { campaignId: string }) {
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [budgetLines, setBudgetLines] = useState<Array<{ id: string; name: string; category: string }>>([]);
  const [form, setForm] = useState<NewExpenseForm>({
    description: "", amount: "", taxAmount: "0", expenseDate: new Date().toISOString().split("T")[0],
    budgetLineId: "", vendorName: "", paymentMethod: "credit_card", notes: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("q", search);
    const res = await fetch(`/api/finance/expenses?${params}`).then((r) => r.json());
    if (res.data) { setExpenses(res.data); setTotal(res.total ?? res.data.length); }
    setLoading(false);
  }, [campaignId, statusFilter, search]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`/api/finance/budget-lines?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((j) => { if (j.data) setBudgetLines(j.data); });
  }, [campaignId]);

  async function submit() {
    if (!form.description.trim() || !form.amount) { toast.error("Description and amount required"); return; }
    setSaving(true);
    const res = await fetch("/api/finance/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        description: form.description,
        amount: Number(form.amount),
        taxAmount: Number(form.taxAmount) || 0,
        expenseDate: form.expenseDate,
        budgetLineId: form.budgetLineId || null,
        paymentMethod: form.paymentMethod || null,
        notes: form.notes || null,
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) {
      toast.success("Expense added");
      setShowAdd(false);
      setForm({ description: "", amount: "", taxAmount: "0", expenseDate: new Date().toISOString().split("T")[0], budgetLineId: "", vendorName: "", paymentMethod: "credit_card", notes: "" });
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  async function approve(id: string) {
    await fetch(`/api/finance/expenses/${id}/approve`, { method: "POST" });
    toast.success("Approved");
    load();
  }

  async function submitForApproval(id: string) {
    await fetch(`/api/finance/expenses/${id}/submit`, { method: "POST" });
    toast.success("Submitted for approval");
    load();
  }

  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);
  const pendingCount = expenses.filter((e) => e.expenseStatus === "submitted").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500">{total} total · {cad(totalAmount)} captured</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> Add Expense
        </button>
      </div>

      {pendingCount > 0 && (
        <Link href="/finance/approvals" className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg text-sm text-amber-800 dark:text-amber-300">
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">{pendingCount} expense{pendingCount !== 1 ? "s" : ""} awaiting approval</span>
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </Link>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="">All statuses</option>
          {["draft", "submitted", "needs_review", "approved", "rejected", "paid"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
      </div>

      {/* Expense list */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3 flex gap-3">
                <div className="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No expenses yet. Add your first expense above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {expenses.map((expense) => (
              <div key={expense.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{expense.description}</span>
                      {expense.missingReceipt && (
                        <span title="Missing receipt" className="text-amber-500">
                          <FileWarning className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{new Date(expense.expenseDate).toLocaleDateString("en-CA")}</span>
                      {expense.vendor && <span>· {expense.vendor.name}</span>}
                      {expense.budgetLine && <span>· {expense.budgetLine.name}</span>}
                      <span>· {expense.enteredBy.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{cad(expense.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[expense.expenseStatus] ?? "bg-gray-100 text-gray-500"}`}>
                      {expense.expenseStatus.replace(/_/g, " ")}
                    </span>
                    {expense.expenseStatus === "draft" && (
                      <button
                        onClick={() => submitForApproval(expense.id)}
                        className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Submit
                      </button>
                    )}
                    {expense.expenseStatus === "submitted" && (
                      <button
                        onClick={() => approve(expense.id)}
                        className="text-xs px-2 py-0.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                      >
                        <Check className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense drawer */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl p-5 w-full sm:max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Add Expense</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Description *</label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="What was this expense for?"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Amount (CAD) *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Tax</label>
                    <input
                      type="number"
                      step="0.01"
                      value={form.taxAmount}
                      onChange={(e) => setForm((p) => ({ ...p, taxAmount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                    />
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Date *</label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Budget Line</label>
                  <select
                    value={form.budgetLineId}
                    onChange={(e) => setForm((p) => ({ ...p, budgetLineId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  >
                    <option value="">No budget line</option>
                    {budgetLines.map((bl) => (
                      <option key={bl.id} value={bl.id}>{bl.name} ({bl.category.replace(/_/g, " ")})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Payment Method</label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  >
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Notes</label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342] resize-none"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">Cancel</button>
                <button
                  onClick={submit}
                  disabled={saving}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Saving..." : "Add Expense"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
