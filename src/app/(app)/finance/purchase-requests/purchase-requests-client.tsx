"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, ShoppingCart, CheckCircle2, XCircle, Clock, X, Send,
  AlertTriangle, ChevronDown, ChevronRight, Loader2,
} from "lucide-react";

interface PR {
  id: string;
  title: string;
  description: string | null;
  requestedAmount: string;
  approvedAmount: string | null;
  requestStatus: string;
  urgency: string;
  requestedDate: string;
  decidedDate: string | null;
  notes: string | null;
  rejectionReason: string | null;
  vendor: { id: string; name: string } | null;
  budgetLine: { id: string; name: string; category: string } | null;
  requestedBy: { id: string; name: string };
  approver: { id: string; name: string } | null;
}

interface BudgetLineDetail {
  plannedAmount: string;
  committedAmount: string;
  actualAmount: string;
}

const STATUS_STYLES: Record<string, string> = {
  draft:             "bg-gray-100 text-gray-600",
  submitted:         "bg-blue-100 text-blue-700",
  approved:          "bg-emerald-100 text-emerald-700",
  partially_approved:"bg-amber-100 text-amber-700",
  rejected:          "bg-red-100 text-red-700",
  cancelled:         "bg-gray-100 text-gray-400",
};

const URGENCY_COLOURS: Record<string, string> = {
  urgent: "text-red-600 font-semibold",
  high:   "text-orange-600",
  normal: "text-gray-400",
  low:    "text-gray-300",
};

const STATUS_ICONS: Record<string, React.ElementType> = {
  approved: CheckCircle2,
  partially_approved: CheckCircle2,
  rejected: XCircle,
  submitted: Clock,
};

function cad(v: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Number(v));
}

function ApproveModal({
  pr,
  campaignId,
  onClose,
  onDone,
}: {
  pr: PR;
  campaignId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [amount, setAmount] = useState(String(Number(pr.requestedAmount)));
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [budgetLine, setBudgetLine] = useState<BudgetLineDetail | null>(null);

  useEffect(() => {
    if (!pr.budgetLine) return;
    fetch(`/api/finance/budget-lines/${pr.budgetLine.id}`)
      .then((r) => r.json())
      .then((j: { data?: BudgetLineDetail }) => { if (j.data) setBudgetLine(j.data); })
      .catch(() => null);
  }, [pr.budgetLine]);

  const requested = Number(pr.requestedAmount);
  const approveAmt = parseFloat(amount) || 0;
  const isPartial = approveAmt < requested;

  const remaining = budgetLine
    ? Number(budgetLine.plannedAmount) - Number(budgetLine.committedAmount) - Number(budgetLine.actualAmount)
    : null;
  const wouldOverrun = remaining !== null && approveAmt > remaining;

  async function submit() {
    if (approveAmt <= 0) { toast.error("Approved amount must be positive"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/finance/purchase-requests/${pr.id}/approve`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          approvedAmount: approveAmt !== requested ? approveAmt : undefined,
          notes: notes.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? "Approval failed");
        return;
      }
      toast.success(isPartial ? "Partially approved" : "Approved");
      onDone();
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40" onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Approve Request</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-slate-400 mb-4 bg-gray-50 dark:bg-slate-800 rounded-lg p-3">
          <p className="font-medium text-gray-900 dark:text-white">{pr.title}</p>
          <p className="text-xs mt-0.5">Requested: <span className="font-semibold">{cad(pr.requestedAmount)}</span>
            {pr.vendor && <> · {pr.vendor.name}</>}
          </p>
        </div>

        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Approved Amount <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full h-11 pl-6 pr-3 border-2 border-slate-300 rounded-lg focus:border-[#0A2342] focus:outline-none text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white"
              />
            </div>
            {isPartial && approveAmt > 0 && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Partial approval — {cad(requested - approveAmt)} below requested
              </p>
            )}
            {wouldOverrun && (
              <p className="text-xs text-red-600 mt-1 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Budget line only has {cad(remaining!)} remaining — this would overrun
              </p>
            )}
            {budgetLine && !wouldOverrun && remaining !== null && (
              <p className="text-xs text-gray-400 mt-1">
                Budget line remaining: {cad(remaining)}
              </p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
              Approval Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional note to the requester..."
              className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-[#0A2342] focus:outline-none text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white resize-none"
            />
          </div>
        </div>

        <div className="flex gap-2 pt-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 border-2 border-slate-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || approveAmt <= 0}
            className={`flex-1 h-10 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 ${
              wouldOverrun ? "bg-amber-600 hover:bg-amber-700" : "bg-[#1D9E75] hover:bg-[#1D9E75]/90"
            }`}
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Approving…</> : (
              wouldOverrun ? "Approve (over budget)" : (isPartial ? "Partially Approve" : "Approve")
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function RejectModal({
  pr,
  onClose,
  onDone,
}: {
  pr: PR;
  onClose: () => void;
  onDone: () => void;
}) {
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);

  async function submit() {
    if (!reason.trim()) { toast.error("Rejection reason is required"); return; }
    setSaving(true);
    try {
      const res = await fetch(`/api/finance/purchase-requests/${pr.id}/reject`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ reason: reason.trim() }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? "Rejection failed");
        return;
      }
      toast.success("Request rejected");
      onDone();
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
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/40" onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 40 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl shadow-2xl p-5"
      >
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-900 dark:text-white">Reject Request</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-800">
            <X className="w-4 h-4 text-gray-400" />
          </button>
        </div>

        <div className="text-sm text-gray-600 dark:text-slate-400 mb-4 bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <p className="font-medium text-gray-900 dark:text-white">{pr.title}</p>
          <p className="text-xs mt-0.5">Amount: <span className="font-semibold">{cad(pr.requestedAmount)}</span></p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-300 mb-1">
            Reason for rejection <span className="text-red-500">*</span>
          </label>
          <textarea
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
            placeholder="Explain why this request is being rejected..."
            autoFocus
            className="w-full px-3 py-2 border-2 border-slate-300 rounded-lg focus:border-red-400 focus:outline-none text-sm dark:bg-slate-800 dark:border-slate-600 dark:text-white resize-none"
          />
        </div>

        <div className="flex gap-2 pt-3">
          <button
            onClick={onClose}
            className="flex-1 h-10 border-2 border-slate-300 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Cancel
          </button>
          <button
            onClick={submit}
            disabled={saving || !reason.trim()}
            className="flex-1 h-10 bg-red-600 text-white rounded-lg text-sm font-bold disabled:opacity-50 flex items-center justify-center gap-2 hover:bg-red-700"
          >
            {saving ? <><Loader2 className="w-4 h-4 animate-spin" /> Rejecting…</> : "Reject Request"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

function PRRow({
  pr,
  isManager,
  onApprove,
  onReject,
  onSubmit,
}: {
  pr: PR;
  isManager: boolean;
  onApprove: (pr: PR) => void;
  onReject: (pr: PR) => void;
  onSubmit: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const StatusIcon = STATUS_ICONS[pr.requestStatus];

  return (
    <>
      <div
        className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
        onClick={() => setExpanded((e) => !e)}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              {expanded
                ? <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                : <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />}
              <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{pr.title}</span>
              <span className={`text-xs ${URGENCY_COLOURS[pr.urgency] ?? ""}`}>{pr.urgency}</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400 pl-5">
              <span>{new Date(pr.requestedDate).toLocaleDateString("en-CA", { month: "short", day: "numeric" })}</span>
              {pr.vendor && <span>· {pr.vendor.name}</span>}
              {pr.budgetLine && <span>· {pr.budgetLine.name}</span>}
              <span>· by {pr.requestedBy.name}</span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
            <div className="text-right">
              <p className="font-semibold text-gray-900 dark:text-white text-sm">{cad(pr.requestedAmount)}</p>
              {pr.approvedAmount && pr.approvedAmount !== pr.requestedAmount && (
                <p className="text-xs text-amber-600">approved: {cad(pr.approvedAmount)}</p>
              )}
            </div>
            <div className={`flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[pr.requestStatus] ?? "bg-gray-100"}`}>
              {StatusIcon && <StatusIcon className="w-3 h-3" />}
              {pr.requestStatus.replace(/_/g, " ")}
            </div>
            {pr.requestStatus === "draft" && (
              <button
                onClick={() => onSubmit(pr.id)}
                className="text-xs px-2 py-1 bg-blue-600 text-white rounded flex items-center gap-1 hover:bg-blue-700"
              >
                <Send className="w-3 h-3" /> Submit
              </button>
            )}
            {isManager && pr.requestStatus === "submitted" && (
              <>
                <button
                  onClick={() => onApprove(pr)}
                  className="text-xs px-2 py-1 bg-[#1D9E75] text-white rounded flex items-center gap-1 hover:bg-[#1D9E75]/90"
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => onReject(pr)}
                  className="text-xs px-2 py-1 bg-red-600 text-white rounded flex items-center gap-1 hover:bg-red-700"
                >
                  <XCircle className="w-3 h-3" /> Reject
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 pt-1 bg-gray-50 dark:bg-slate-800/40 text-sm space-y-2">
              {pr.description && (
                <p className="text-gray-600 dark:text-slate-400">{pr.description}</p>
              )}
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                {pr.budgetLine && (
                  <span>Budget: <span className="font-medium capitalize">{pr.budgetLine.category.replace(/_/g, " ")} — {pr.budgetLine.name}</span></span>
                )}
                {pr.decidedDate && (
                  <span>Decided: {new Date(pr.decidedDate).toLocaleDateString("en-CA")}</span>
                )}
                {pr.approver && (
                  <span>By: {pr.approver.name}</span>
                )}
              </div>
              {pr.rejectionReason && (
                <div className="flex items-start gap-1.5 px-3 py-2 bg-red-50 dark:bg-red-900/20 rounded-lg text-xs text-red-700 dark:text-red-300">
                  <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                  <span><span className="font-semibold">Rejection reason:</span> {pr.rejectionReason}</span>
                </div>
              )}
              {pr.notes && (
                <div className="text-xs text-gray-500 italic">{pr.notes}</div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default function PurchaseRequestsClient({ campaignId }: { campaignId: string }) {
  const [prs, setPRs] = useState<PR[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [budgetLines, setBudgetLines] = useState<Array<{ id: string; name: string }>>([]);
  const [vendors, setVendors] = useState<Array<{ id: string; name: string }>>([]);
  const [approvingPR, setApprovingPR] = useState<PR | null>(null);
  const [rejectingPR, setRejectingPR] = useState<PR | null>(null);
  const [isManager, setIsManager] = useState(false);
  const [form, setForm] = useState({
    title: "", requestedAmount: "", description: "", urgency: "normal", budgetLineId: "", vendorId: "",
  });

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/finance/purchase-requests?${params}`).then((r) => r.json()) as { data?: PR[] };
    if (res.data) setPRs(res.data);
    setLoading(false);
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/finance/budget-lines?campaignId=${campaignId}`).then((r) => r.json()),
      fetch(`/api/finance/vendors?campaignId=${campaignId}`).then((r) => r.json()),
      fetch(`/api/campaigns/${campaignId}/membership`).then((r) => r.json()),
    ]).then(([linesRes, vendorsRes, memberRes]) => {
      const l = linesRes as { data?: Array<{ id: string; name: string }> };
      const v = vendorsRes as { data?: Array<{ id: string; name: string }> };
      const m = memberRes as { data?: { role: string } };
      if (l.data) setBudgetLines(l.data);
      if (v.data) setVendors(v.data);
      if (m.data) setIsManager(["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(m.data.role));
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
    }).then((r) => r.json()) as { data?: unknown; error?: string };
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
    const res = await fetch(`/api/finance/purchase-requests/${id}/submit`, { method: "POST" });
    if (res.ok) {
      toast.success("Submitted for approval");
      load();
    } else {
      const d = await res.json() as { error?: string };
      toast.error(d.error ?? "Submit failed");
    }
  }

  const byStatus = (s: string) => prs.filter((p) => p.requestStatus === s).length;
  const submittedCount = byStatus("submitted");
  const totalRequested = prs.reduce((s, p) => s + Number(p.requestedAmount), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Purchase Requests</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {prs.length} total · {cad(totalRequested)} requested
            {submittedCount > 0 && (
              <span className="ml-2 text-amber-600 font-medium">
                · {submittedCount} awaiting approval
              </span>
            )}
          </p>
        </div>
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> New Request
        </button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 flex-wrap">
        {["", "submitted", "approved", "partially_approved", "rejected", "draft"].map((s) => (
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
            {s === "submitted" && submittedCount > 0 && (
              <span className="ml-1 bg-amber-500 text-white rounded-full px-1.5 py-0.5 text-[10px]">{submittedCount}</span>
            )}
          </button>
        ))}
      </div>

      {/* PR list */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="divide-y">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-16 mx-4 my-3 bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
            ))}
          </div>
        ) : prs.length === 0 ? (
          <div className="text-center py-12">
            <ShoppingCart className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No purchase requests. Create one to start the approval workflow.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {prs.map((pr) => (
              <PRRow
                key={pr.id}
                pr={pr}
                isManager={isManager}
                onApprove={setApprovingPR}
                onReject={setRejectingPR}
                onSubmit={submitPR}
              />
            ))}
          </div>
        )}
      </div>

      {/* New PR modal */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowAdd(false); }}
          >
            <motion.div
              initial={{ scale: 0.95 }} animate={{ scale: 1 }} exit={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">New Purchase Request</h2>
                <button onClick={() => setShowAdd(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Title *</label>
                  <input
                    value={form.title}
                    onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
                    placeholder="e.g. Lawn sign order — 500 units"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Amount (CAD) *</label>
                    <input
                      type="number"
                      value={form.requestedAmount}
                      onChange={(e) => setForm((p) => ({ ...p, requestedAmount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                    />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Urgency</label>
                    <select
                      value={form.urgency}
                      onChange={(e) => setForm((p) => ({ ...p, urgency: e.target.value }))}
                      className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
                    >
                      {["low", "normal", "high", "urgent"].map((u) => <option key={u} value={u}>{u}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Budget Line</label>
                  <select
                    value={form.budgetLineId}
                    onChange={(e) => setForm((p) => ({ ...p, budgetLineId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="">None</option>
                    {budgetLines.map((bl) => <option key={bl.id} value={bl.id}>{bl.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Vendor</label>
                  <select
                    value={form.vendorId}
                    onChange={(e) => setForm((p) => ({ ...p, vendorId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none"
                  >
                    <option value="">None</option>
                    {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    rows={2}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none resize-none"
                  />
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

      {/* Approve / Reject modals */}
      <AnimatePresence>
        {approvingPR && (
          <ApproveModal
            pr={approvingPR}
            campaignId={campaignId}
            onClose={() => setApprovingPR(null)}
            onDone={() => { load(); setApprovingPR(null); }}
          />
        )}
        {rejectingPR && (
          <RejectModal
            pr={rejectingPR}
            onClose={() => setRejectingPR(null)}
            onDone={() => { load(); setRejectingPR(null); }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
