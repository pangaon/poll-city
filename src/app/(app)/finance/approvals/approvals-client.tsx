"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { CheckCircle2, XCircle, Clock, Receipt, ShoppingCart, RotateCcw, AlertTriangle } from "lucide-react";

interface QueueItem {
  type: "expense" | "purchase_request" | "reimbursement";
  id: string;
  title: string;
  amount: number;
  submittedBy: { id: string; name: string } | null;
  submittedAt: string | null;
  urgency: string;
  budgetLine: { id: string; name: string } | null;
  vendor: { id: string; name: string } | null;
}

interface QueueSummary {
  total: number;
  expenses: number;
  purchaseRequests: number;
  reimbursements: number;
}

const TYPE_CONFIG = {
  expense: { label: "Expense", icon: Receipt, colour: "bg-blue-100 text-blue-700" },
  purchase_request: { label: "Purchase Request", icon: ShoppingCart, colour: "bg-amber-100 text-amber-700" },
  reimbursement: { label: "Reimbursement", icon: RotateCcw, colour: "bg-purple-100 text-purple-700" },
};

const URGENCY_STYLES: Record<string, string> = {
  urgent: "bg-red-100 text-red-700",
  high: "bg-orange-100 text-orange-700",
  normal: "bg-gray-100 text-gray-500",
  low: "bg-gray-50 text-gray-400",
};

function cad(v: number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(v);
}

export default function ApprovalsClient({ campaignId }: { campaignId: string }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [summary, setSummary] = useState<QueueSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/approvals?campaignId=${campaignId}`).then((r) => r.json());
    if (res.data) { setQueue(res.data); setSummary(res.summary); }
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  async function approve(item: QueueItem) {
    setActing(item.id);
    const path = item.type === "expense"
      ? `/api/finance/expenses/${item.id}/approve`
      : item.type === "purchase_request"
        ? `/api/finance/purchase-requests/${item.id}/approve`
        : `/api/finance/reimbursements/${item.id}/approve`;
    const res = await fetch(path, { method: "POST" }).then((r) => r.json());
    setActing(null);
    if (res.data) { toast.success("Approved"); load(); }
    else toast.error(res.error ?? "Failed");
  }

  async function reject(item: QueueItem) {
    const reason = prompt("Rejection reason (required):");
    if (!reason?.trim()) return;
    setActing(item.id);
    const path = item.type === "expense"
      ? `/api/finance/expenses/${item.id}/reject`
      : item.type === "purchase_request"
        ? `/api/finance/purchase-requests/${item.id}/reject`
        : `/api/finance/reimbursements/${item.id}/reject`;
    const res = await fetch(path, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    }).then((r) => r.json());
    setActing(null);
    if (res.data) { toast.success("Rejected"); load(); }
    else toast.error(res.error ?? "Failed");
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Approval Queue</h1>
          {summary && (
            <p className="text-sm text-gray-500 mt-0.5">
              {summary.total} pending · {summary.expenses} expense{summary.expenses !== 1 ? "s" : ""} · {summary.purchaseRequests} request{summary.purchaseRequests !== 1 ? "s" : ""} · {summary.reimbursements} reimbursement{summary.reimbursements !== 1 ? "s" : ""}
            </p>
          )}
        </div>
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : queue.length === 0 ? (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 dark:text-slate-300">All clear</h3>
          <p className="text-sm text-gray-400 mt-1">No pending approvals.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {queue.map((item) => {
            const cfg = TYPE_CONFIG[item.type];
            const Icon = cfg.icon;
            return (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg shrink-0 ${cfg.colour}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-medium text-gray-900 dark:text-white text-sm">{item.title}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${cfg.colour}`}>{cfg.label}</span>
                      {item.urgency !== "normal" && (
                        <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${URGENCY_STYLES[item.urgency] ?? ""}`}>
                          {item.urgency}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-xs text-gray-400 flex-wrap">
                      <span className="font-semibold text-gray-700 dark:text-slate-300">{cad(item.amount)}</span>
                      {item.submittedBy && <span>by {item.submittedBy.name}</span>}
                      {item.budgetLine && <span>· {item.budgetLine.name}</span>}
                      {item.vendor && <span>· {item.vendor.name}</span>}
                      {item.submittedAt && (
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {new Date(item.submittedAt).toLocaleDateString("en-CA")}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => approve(item)}
                      disabled={acting === item.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50 transition-colors"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                    </button>
                    <button
                      onClick={() => reject(item)}
                      disabled={acting === item.id}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
                    >
                      <XCircle className="w-3.5 h-3.5" /> Reject
                    </button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
}
