"use client";
import { useEffect, useState, useCallback } from "react";
import { toast } from "sonner";
import { ShoppingBag, CheckCircle2, Truck, AlertTriangle, Clock } from "lucide-react";

interface FoodOrder {
  id: string;
  status: string;
  deliveryMode: string;
  scheduledFor: string | null;
  deliveredAt: string | null;
  confirmedAmountCad: number | null;
  receiptAmountCad: number | null;
  fulfillmentRef: string | null;
  expenseId: string | null;
  issueNotes: string | null;
  request: { requestType: string; headcount: number; location: string | null; neededBy: string };
  quote: { totalAmountCad: number; pricePerHead: number; includesDelivery: boolean } | null;
  createdBy: { name: string | null };
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: React.ReactNode }> = {
  draft: { label: "Draft", color: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300", icon: <Clock className="w-3.5 h-3.5" /> },
  confirmed: { label: "Confirmed", color: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  in_preparation: { label: "In Preparation", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400", icon: <Clock className="w-3.5 h-3.5" /> },
  out_for_delivery: { label: "Out for Delivery", color: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400", icon: <Truck className="w-3.5 h-3.5" /> },
  delivered: { label: "Delivered", color: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400", icon: <CheckCircle2 className="w-3.5 h-3.5" /> },
  cancelled: { label: "Cancelled", color: "bg-gray-100 text-gray-500", icon: null },
  issue_flagged: { label: "Issue Flagged", color: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400", icon: <AlertTriangle className="w-3.5 h-3.5" /> },
};

const NEXT_STATUS: Record<string, string[]> = {
  confirmed: ["in_preparation", "cancelled", "issue_flagged"],
  in_preparation: ["out_for_delivery", "cancelled", "issue_flagged"],
  out_for_delivery: ["delivered", "issue_flagged"],
  issue_flagged: ["confirmed", "cancelled"],
};

export default function OrdersClient({ campaignId }: { campaignId: string }) {
  const [orders, setOrders] = useState<FoodOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/fuel/orders?${params}`).then((r) => r.json());
    if (res.data) setOrders(res.data);
    setLoading(false);
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function advanceStatus(orderId: string, newStatus: string) {
    setUpdating(orderId);
    const body: Record<string, unknown> = { campaignId, orderId, status: newStatus };
    if (newStatus === "delivered") body.deliveredAt = new Date().toISOString();
    const res = await fetch("/api/fuel/orders", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => r.json());
    setUpdating(null);
    if (res.data) { toast.success(`Status → ${newStatus.replace(/_/g, " ")}`); load(); }
    else toast.error(res.error ?? "Failed");
  }

  const activeOrders = orders.filter((o) => !["delivered", "cancelled"].includes(o.status));
  const completedOrders = orders.filter((o) => ["delivered", "cancelled"].includes(o.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Orders</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{orders.length} total · {activeOrders.length} active</p>
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {["", "confirmed", "in_preparation", "out_for_delivery", "delivered", "issue_flagged", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-[#0A2342] text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {s === "" ? "All" : s.replace(/_/g, " ")}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">{[...Array(4)].map((_, i) => <div key={i} className="h-20 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}</div>
      ) : orders.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
          <ShoppingBag className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400">No orders yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((order) => {
            const cfg = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.draft;
            const nextStatuses = NEXT_STATUS[order.status] ?? [];
            return (
              <div key={order.id} className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white capitalize">
                        {order.request.requestType.replace(/_/g, " ")} — {order.request.headcount} people
                      </p>
                      <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${cfg.color}`}>
                        {cfg.icon}{cfg.label}
                      </span>
                      {order.issueNotes && <span className="text-xs text-red-600">⚠ {order.issueNotes}</span>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 flex-wrap text-xs text-gray-500 dark:text-slate-400">
                      {order.scheduledFor && <span><Clock className="w-3 h-3 inline mr-0.5" />{new Date(order.scheduledFor).toLocaleString("en-CA")}</span>}
                      {order.request.location && <span>{order.request.location}</span>}
                      {order.confirmedAmountCad && <span className="font-medium text-gray-900 dark:text-white">${Number(order.confirmedAmountCad).toFixed(2)}</span>}
                      {order.expenseId && <span className="text-[#1D9E75]">✓ Expense recorded</span>}
                      {order.fulfillmentRef && <span>Ref: {order.fulfillmentRef}</span>}
                    </div>
                  </div>
                  {nextStatuses.length > 0 && (
                    <div className="flex gap-1 flex-wrap">
                      {nextStatuses.map((ns) => (
                        <button
                          key={ns}
                          onClick={() => advanceStatus(order.id, ns)}
                          disabled={updating === order.id}
                          className={`px-2 py-1 rounded text-xs font-medium border transition-colors disabled:opacity-50 ${
                            ns === "cancelled" || ns === "issue_flagged"
                              ? "border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-900/20"
                              : "border-[#0A2342]/20 text-[#0A2342] dark:text-blue-400 hover:bg-[#0A2342]/5 dark:border-blue-800 dark:hover:bg-blue-900/20"
                          }`}
                        >
                          {ns.replace(/_/g, " ")}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
