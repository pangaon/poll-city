"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, ShoppingCart, CheckCircle2, XCircle, Clock, X, Send } from "lucide-react";

interface PR {
  id: string;
  title: string;
  requestedAmount: string;
  approvedAmount: string | null;
  requestStatus: string;
  urgency: string;
  requestedDate: string;
  vendor: { id: string; name: string } | null;
  budgetLine: { id: string; name: string } | null;
  requestedBy: { id: string; name: string };
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  partially_approved: "bg-amber-100 text-amber-700",
  rejected: "bg-red-100 text-red-700",
  cancelled: "bg-gray-100 text-gray-400",
};

const URGENCY_COLOURS: Record<string, string> = {
  urgent: "text-red-600",
  high: "text-orange-600",
  normal: "text-gray-500",
  low: "text-gray-400",
};

function cad(v: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Number(v));
}

export default function PurchaseRequestsClient({ campaignId }: { campaignId: string }) {
  const [prs, setPRs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [budgetLines, setBudgetLines] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ title: "", requestedAmount: "", description: "", urgency: "normal", budgetLineId: "", vendorId: "" });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/finance/purchase-requests?${params}`).then((r) => r.json());
    if (res.data) setPRs(res.data);
    setLoading(false);
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/finance/budget-lines?campaignId=${campaignId}`).then((r) => r.json()),
      fetch(`/api/finance/vendors?campaignId=${campaignId}`).then((r) => r.json()),
    ]).then(([linesRes, vendorsRes]) => {
      if (linesRes.data) setBudgetLines(linesRes.data);
      if (vendorsRes.data) setVendors(vendorsRes.data);
    });
  }, [campaignId]);

  async function create() {
    if (!form.title.trim() || !form.requestedAmount) { toast.error("Title and amount required"); return; }
    setSaving(true);
    const res = await fetch("/api/finance/purchase-requests", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        title: form.title,
        requestedAmount: Number(form.requestedAmount),
        description: form.description || null,
        urgency: form.urgency,
        budgetLineId: form.budgetLineId || null,
        vendorId: form.vendorId || null,
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) {
      toast.success("Purchase request created");
      setShowAdd(false);
      setForm({ title: "", requestedAmount: "", description: "", urgency: "normal", budgetLineId: "", vendorId: "" });
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  async function submitPR(id: string) {
    await fetch(`/api/finance/purchase-requests/${id}/submit`, { method: "POST" });
    toast.success("Submitted for approval");
    load();
  }

  const totalRequested = prs.reduce((s, p) => s + Number(p.requestedAmount), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Purchase Requests</h1>
          <p className="text-sm text-gray-500">{prs.length} total · {cad(totalRequested)} requested</p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> New Request
        </button>
      </div>

      <div className="flex gap-2 flex-wrap">
        {["", "draft", "submitted", "approved", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors
              ${statusFilter === s
                ? "bg-[#0A2342] text-white border-[#0A2342]"
                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300"
              }`}
          >
            {s === "" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {[...Array(4)].map((_, i) => <div key={i} className="h-16 mx-4 my-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />)}
          </div>
        ) : prs.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No purchase requests. Create one to start the approval workflow.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {prs.map((pr) => (
              <div key={pr.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{pr.title}</span>
                      <span className={`text-xs ${URGENCY_COLOURS[pr.urgency] ?? ""} font-medium`}>{pr.urgency}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{new Date(pr.requestedDate).toLocaleDateString("en-CA")}</span>
                      {pr.vendor && <span>· {pr.vendor.name}</span>}
                      {pr.budgetLine && <span>· {pr.budgetLine.name}</span>}
                      <span>· {pr.requestedBy.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{cad(pr.requestedAmount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[pr.requestStatus] ?? "bg-gray-100"}`}>
                      {pr.requestStatus.replace(/_/g, " ")}
                    </span>
                    {pr.requestStatus === "draft" && (
                      <button
                        onClick={() => submitPR(pr.id)}
                        className="text-xs px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1 hover:bg-blue-700"
                      >
                        <Send className="w-3 h-3" /> Submit
                      </button>
                    )}
                  </div>
                </div>
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
                <h2 className="font-semibold text-gray-900 dark:text-white">New Purchase Request</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Title *</label>
                  <input value={form.title} onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))} placeholder="e.g. Lawn sign order — 500 units" className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]" />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Amount (CAD) *</label>
                    <input type="number" value={form.requestedAmount} onChange={(e) => setForm((p) => ({ ...p, requestedAmount: e.target.value }))} placeholder="0.00" className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]" />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Urgency</label>
                    <select value={form.urgency} onChange={(e) => setForm((p) => ({ ...p, urgency: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none">
                      {["low", "normal", "high", "urgent"].map((u) => <option key={u} value={u}>{u}</option>)}
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
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Vendor</label>
                  <select value={form.vendorId} onChange={(e) => setForm((p) => ({ ...p, vendorId: e.target.value }))} className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none">
                    <option value="">None</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Description</label>
                  <textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} rows={2} className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none resize-none" />
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
