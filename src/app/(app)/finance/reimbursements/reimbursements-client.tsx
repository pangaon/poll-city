"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, RotateCcw, Clock, X, Send, CheckCircle2, XCircle, DollarSign } from "lucide-react";

interface Reimbursement {
  id: string;
  title: string;
  amountRequested: string;
  amountApproved: string | null;
  status: string;
  payoutMethod: string | null;
  createdAt: string;
  submittedAt: string | null;
  notes: string | null;
  user: { id: string; name: string; email: string };
  approver: { id: string; name: string } | null;
  budgetLine: { id: string; name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-purple-100 text-purple-700",
  cancelled: "bg-gray-100 text-gray-400",
};

function cad(v: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Number(v));
}

export default function ReimbursementsClient({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [budgetLines, setBudgetLines] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ title: "", amountRequested: "", notes: "", payoutMethod: "", budgetLineId: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/finance/reimbursements?${params}`).then((r) => r.json());
    if (res.data) setItems(res.data);
    setLoading(false);
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`/api/finance/budget-lines?campaignId=${campaignId}`).then((r) => r.json()).then((res) => {
      if (res.data) setBudgetLines(res.data);
    });
  }, [campaignId]);

  async function create() {
    if (!form.title.trim() || !form.amountRequested) { toast.error("Title and amount required"); return; }
    setSaving(true);
    const res = await fetch("/api/finance/reimbursements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        title: form.title,
        amountRequested: Number(form.amountRequested),
        notes: form.notes || null,
        payoutMethod: form.payoutMethod || null,
        budgetLineId: form.budgetLineId || null,
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) {
      toast.success("Reimbursement request created");
      setShowAdd(false);
      setForm({ title: "", amountRequested: "", notes: "", payoutMethod: "", budgetLineId: "" });
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  async function submitItem(id: string) {
    await fetch(`/api/finance/reimbursements/${id}/submit`, { method: "POST" });
    toast.success("Submitted for approval");
    load();
  }

  const totalRequested = items.reduce((s, r) => s + Number(r.amountRequested), 0);
  const totalApproved = items.filter((r) => ["approved", "paid"].includes(r.status)).reduce((s, r) => s + Number(r.amountApproved ?? 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Reimbursements</h1>
          <p className="text-sm text-gray-500">{items.length} total · {cad(totalRequested)} requested · {cad(totalApproved)} approved</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> New Request
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "draft", "submitted", "approved", "paid", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
              ${statusFilter === s
                ? "bg-[#0A2342] text-white border-[#0A2342]"
                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300"
              }`}
          >
            {s === "" ? "All" : s}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 mx-4 my-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="text-center py-12">
            <RotateCcw className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No reimbursement requests. Submit one to get repaid.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {items.map((item) => (
              <div key={item.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.title}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
                      <span>{new Date(item.createdAt).toLocaleDateString("en-CA")}</span>
                      <span>· {item.user.name}</span>
                      {item.budgetLine && <span>· {item.budgetLine.name}</span>}
                      {item.payoutMethod && <span>· {item.payoutMethod}</span>}
                      {item.approver && <span>· approved by {item.approver.name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <div className="text-right">
                      <div className="font-semibold text-gray-900 dark:text-white text-sm">{cad(item.amountRequested)}</div>
                      {item.amountApproved && Number(item.amountApproved) !== Number(item.amountRequested) && (
                        <div className="text-xs text-emerald-600">approved {cad(item.amountApproved)}</div>
                      )}
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[item.status] ?? "bg-gray-100"}`}>
                      {item.status}
                    </span>
                    {item.status === "draft" && (
                      <button
                        onClick={() => submitItem(item.id)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1 hover:bg-blue-700"
                      >
                        <Send className="w-3 h-3" /> Submit
                      </button>
                    )}
                    {item.status === "approved" && (
                      <span className="flex items-center gap-1 text-xs text-emerald-600">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved
                      </span>
                    )}
                    {item.status === "paid" && (
                      <span className="flex items-center gap-1 text-xs text-purple-600">
                        <DollarSign className="w-3.5 h-3.5" /> Paid
                      </span>
                    )}
                  </div>
                </div>
                {item.notes && (
                  <p className="mt-1 text-xs text-gray-400 truncate pl-0">{item.notes}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">New Reimbursement Request</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">What was purchased? *</label>
                  <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Office supplies from Staples" className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Amount (CAD) *</label>
                    <input type="number" value={form.amountRequested} onChange={(e) => setForm((p) => ({ ...p, amountRequested: e.target.value }))} placeholder="0.00" className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Payout Method</label>
                    <select value={form.payoutMethod} onChange={(e) => setForm((p) => ({ ...p, payoutMethod: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none">
                      <option value="">Not specified</option>
                      {["e-Transfer", "Cheque", "Direct Deposit", "Cash"].map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Budget Line</label>
                  <select value={form.budgetLineId} onChange={(e) => setForm((p) => ({ ...p, budgetLineId: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none">
                    <option value="">None</option>
                    {budgetLines.map((bl) => <option key={bl.id} value={bl.id}>{bl.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Notes / Receipt Description</label>
                  <textarea value={form.notes} onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))} rows={2} placeholder="Add receipt details, purpose, or any context..." className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none resize-none" />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowAdd(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">Cancel</button>
                <button onClick={create} disabled={saving} className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50">
                  {saving ? "Creating..." : "Create Request"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
