"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, RotateCcw, X, Send, CheckCircle2, XCircle, DollarSign, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";

interface Reimbursement {
  id: string;
  title: string;
  amountRequested: string;
  amountApproved: string | null;
  status: string;
  payoutMethod: string | null;
  createdAt: string;
  submittedDate: string | null;
  decidedDate: string | null;
  notes: string | null;
  rejectionReason: string | null;
  user: { id: string; name: string; email: string };
  approver: { id: string; name: string } | null;
  budgetLine: { id: string; name: string } | null;
}

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  approved: "bg-emerald-100 text-emerald-700",
  partially_approved: "bg-teal-100 text-teal-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-purple-100 text-purple-700",
  cancelled: "bg-gray-100 text-gray-400",
};

const PAYOUT_METHODS = ["e-Transfer", "Cheque", "Direct Deposit", "Cash"];

function cad(v: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(v));
}

function ApproveModal({ item, onClose, onDone }: { item: Reimbursement; onClose: () => void; onDone: () => void }) {
  const requested = Number(item.amountRequested);
  const [approveAmt, setApproveAmt] = useState(String(requested));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const isPartial = Number(approveAmt) < requested;

  async function submit() {
    const amt = Number(approveAmt);
    if (!amt || amt <= 0) { toast.error("Enter a valid amount"); return; }
    setSaving(true);
    const res = await fetch(`/api/finance/reimbursements/${item.id}/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...(amt !== requested ? { approvedAmount: amt } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) { toast.success(isPartial ? "Partially approved" : "Approved"); onDone(); onClose(); }
    else toast.error(res.error ?? "Failed");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Approve Reimbursement</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{item.title} — requested {cad(item.amountRequested)}</p>
        <div className="space-y-3">
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Approved Amount (CAD) *</label>
            <input
              type="number"
              value={approveAmt}
              onChange={(e) => setApproveAmt(e.target.value)}
              className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
            />
            {isPartial && Number(approveAmt) > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" /> Partial — {cad(requested - Number(approveAmt))} less than requested
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Notes (optional)</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Any approval notes..."
              className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none resize-none"
            />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium text-white disabled:opacity-50 ${isPartial ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-600 hover:bg-emerald-700"}`}
          >
            {saving ? "Saving…" : isPartial ? "Partially Approve" : "Approve"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function RejectModal({ item, onClose, onDone }: { item: Reimbursement; onClose: () => void; onDone: () => void }) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reason.trim()) { toast.error("Rejection reason is required"); return; }
    setSaving(true);
    const res = await fetch(`/api/finance/reimbursements/${item.id}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: reason.trim() }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) { toast.success("Rejected"); onDone(); onClose(); }
    else toast.error(res.error ?? "Failed");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-red-600">Reject Reimbursement</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-4">{item.title} — {cad(item.amountRequested)}</p>
        <div>
          <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Reason *</label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Why is this being rejected?"
            className="mt-1 w-full px-3 py-2 border border-red-200 dark:border-red-800 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
          />
        </div>
        <div className="flex gap-2 mt-4">
          <button onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">Cancel</button>
          <button
            onClick={submit}
            disabled={saving || !reason.trim()}
            className="flex-1 px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Rejecting…" : "Reject"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function MarkPaidModal({ item, onClose, onDone }: { item: Reimbursement; onClose: () => void; onDone: () => void }) {
  const [saving, setSaving] = useState(false);

  async function submit() {
    setSaving(true);
    const res = await fetch(`/api/finance/reimbursements/${item.id}/mark-paid`, { method: "POST" }).then((r) => r.json());
    setSaving(false);
    if (res.data) { toast.success("Marked as paid"); onDone(); onClose(); }
    else toast.error(res.error ?? "Failed");
  }

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <motion.div
        initial={{ scale: 0.95 }} animate={{ scale: 1 }}
        className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-sm shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-900 dark:text-white">Mark as Paid</h2>
          <button onClick={onClose}><X className="w-4 h-4 text-gray-400" /></button>
        </div>
        <p className="text-sm text-gray-600 dark:text-slate-400 mb-1">{item.title}</p>
        <p className="text-lg font-bold text-purple-600 mb-4">
          {cad(item.amountApproved ?? item.amountRequested)}
          {item.payoutMethod && <span className="text-xs font-normal text-gray-400 ml-2">via {item.payoutMethod}</span>}
        </p>
        <div className="flex gap-2">
          <button onClick={onClose} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">Cancel</button>
          <button
            onClick={submit}
            disabled={saving}
            className="flex-1 px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Confirm Paid"}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
}

function ReimbursementRow({
  item,
  isManager,
  onAction,
  onReload,
}: {
  item: Reimbursement;
  isManager: boolean;
  onAction: (action: "approve" | "reject" | "markPaid", item: Reimbursement) => void;
  onReload: () => void;
}) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{item.title}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[item.status] ?? "bg-gray-100"}`}>
              {item.status.replace(/_/g, " ")}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 flex-wrap">
            <span>{new Date(item.createdAt).toLocaleDateString("en-CA")}</span>
            <span>· {item.user.name}</span>
            {item.budgetLine && <span>· {item.budgetLine.name}</span>}
            {item.payoutMethod && <span>· {item.payoutMethod}</span>}
            {item.approver && <span>· {item.status === "rejected" ? "rejected by" : "approved by"} {item.approver.name}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <div className="text-right">
            <div className="font-semibold text-gray-900 dark:text-white text-sm">{cad(item.amountRequested)}</div>
            {item.amountApproved && Number(item.amountApproved) !== Number(item.amountRequested) && (
              <div className="text-xs text-emerald-600">approved {cad(item.amountApproved)}</div>
            )}
          </div>

          {isManager && item.status === "submitted" && (
            <>
              <button
                onClick={() => onAction("approve", item)}
                className="text-xs px-2 py-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 flex items-center gap-1"
              >
                <CheckCircle2 className="w-3 h-3" /> Approve
              </button>
              <button
                onClick={() => onAction("reject", item)}
                className="text-xs px-2 py-1 bg-red-600 text-white rounded hover:bg-red-700 flex items-center gap-1"
              >
                <XCircle className="w-3 h-3" /> Reject
              </button>
            </>
          )}

          {isManager && (item.status === "approved" || item.status === "partially_approved") && (
            <button
              onClick={() => onAction("markPaid", item)}
              className="text-xs px-2 py-1 bg-purple-600 text-white rounded hover:bg-purple-700 flex items-center gap-1"
            >
              <DollarSign className="w-3 h-3" /> Mark Paid
            </button>
          )}

          {item.status === "draft" && (
            <button
              onClick={async () => {
                await fetch(`/api/finance/reimbursements/${item.id}/submit`, { method: "POST" });
                toast.success("Submitted for approval");
                onReload();
              }}
              className="text-xs px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1 hover:bg-blue-700"
            >
              <Send className="w-3 h-3" /> Submit
            </button>
          )}

          <button onClick={() => setExpanded((p) => !p)} className="text-gray-400 hover:text-gray-600 p-0.5">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <div className="mt-3 pt-3 border-t border-gray-100 dark:border-slate-800 space-y-1.5 text-xs">
              {item.notes && <p className="text-gray-500 dark:text-slate-400"><span className="font-medium text-gray-700 dark:text-slate-300">Notes:</span> {item.notes}</p>}
              {item.decidedDate && <p className="text-gray-500 dark:text-slate-400"><span className="font-medium text-gray-700 dark:text-slate-300">Decided:</span> {new Date(item.decidedDate).toLocaleDateString("en-CA")}</p>}
              {item.rejectionReason && (
                <p className="text-red-600 dark:text-red-400"><span className="font-medium">Rejection reason:</span> {item.rejectionReason}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function ReimbursementsClient({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<Reimbursement[]>([]);
  const [loading, setLoading] = useState(true);
  const [isManager, setIsManager] = useState(false);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [budgetLines, setBudgetLines] = useState<Array<{ id: string; name: string }>>([]);
  const [form, setForm] = useState({ title: "", amountRequested: "", notes: "", payoutMethod: "", budgetLineId: "" });
  const [approving, setApproving] = useState<Reimbursement | null>(null);
  const [rejecting, setRejecting] = useState<Reimbursement | null>(null);
  const [markingPaid, setMarkingPaid] = useState<Reimbursement | null>(null);

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
    fetch(`/api/campaigns/${campaignId}/membership`).then((r) => r.json()).then((res) => {
      if (res.role && ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(res.role)) setIsManager(true);
    }).catch(() => null);
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

  function handleAction(action: "approve" | "reject" | "markPaid", item: Reimbursement) {
    if (action === "approve") setApproving(item);
    else if (action === "reject") setRejecting(item);
    else setMarkingPaid(item);
  }

  const totalRequested = items.reduce((s, r) => s + Number(r.amountRequested), 0);
  const totalApproved = items.filter((r) => ["approved", "partially_approved", "paid"].includes(r.status)).reduce((s, r) => s + Number(r.amountApproved ?? 0), 0);
  const submittedCount = items.filter((r) => r.status === "submitted").length;

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
        {["", "draft", "submitted", "approved", "partially_approved", "paid", "rejected"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors relative
              ${statusFilter === s
                ? "bg-[#0A2342] text-white border-[#0A2342]"
                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-slate-400 border-gray-200 dark:border-slate-700 hover:border-gray-300"
              }`}
          >
            {s === "" ? "All" : s.replace(/_/g, " ")}
            {s === "submitted" && submittedCount > 0 && (
              <span className="ml-1.5 px-1.5 py-0.5 bg-blue-600 text-white rounded-full text-[10px] font-bold">{submittedCount}</span>
            )}
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
              <ReimbursementRow key={item.id} item={item} isManager={isManager} onAction={handleAction} onReload={load} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }}
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
                      {PAYOUT_METHODS.map((m) => <option key={m} value={m}>{m}</option>)}
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

      <AnimatePresence>
        {approving && <ApproveModal item={approving} onClose={() => setApproving(null)} onDone={load} />}
        {rejecting && <RejectModal item={rejecting} onClose={() => setRejecting(null)} onDone={load} />}
        {markingPaid && <MarkPaidModal item={markingPaid} onClose={() => setMarkingPaid(null)} onDone={load} />}
      </AnimatePresence>
    </div>
  );
}
