"use client";
import { useEffect, useState, useCallback } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  UtensilsCrossed,
  ClipboardList,
  ShoppingBag,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  ArrowRight,
  Truck,
} from "lucide-react";

interface DashboardStats {
  openRequests: number;
  pendingOrders: number;
  overdueOutreach: number;
  deliveredThisMonth: number;
  totalVendors: number;
  recentOrders: Array<{
    id: string;
    status: string;
    scheduledFor: string | null;
    request: { requestType: string; headcount: number; location: string | null };
  }>;
  urgentRequests: Array<{
    id: string;
    requestType: string;
    headcount: number;
    neededBy: string;
    status: string;
    location: string | null;
  }>;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
  confirmed: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  in_preparation: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  out_for_delivery: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  issue_flagged: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  quoting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  quoted: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  ordered: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
};

function StatusBadge({ status }: { status: string }) {
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[status] ?? STATUS_COLORS.draft}`}>
      {status.replace(/_/g, " ")}
    </span>
  );
}

function hoursUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 3_600_000);
}

export default function FuelDashboardClient({ campaignId }: { campaignId: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    const [requestsRes, ordersRes, outreachRes, vendorsRes] = await Promise.all([
      fetch(`/api/fuel/requests?campaignId=${campaignId}`).then((r) => r.json()),
      fetch(`/api/fuel/orders?campaignId=${campaignId}`).then((r) => r.json()),
      fetch(`/api/fuel/outreach?campaignId=${campaignId}`).then((r) => r.json()),
      fetch(`/api/fuel/vendors?campaignId=${campaignId}`).then((r) => r.json()),
    ]);

    const requests: Array<{ id: string; requestType: string; headcount: number; neededBy: string; status: string; location: string | null }> = requestsRes.data ?? [];
    const orders: Array<{ id: string; status: string; scheduledFor: string | null; request: { requestType: string; headcount: number; location: string | null } }> = ordersRes.data ?? [];
    const outreach: Array<{ status: string }> = outreachRes.data ?? [];

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    setStats({
      openRequests: requests.filter((r) => !["delivered", "cancelled"].includes(r.status)).length,
      pendingOrders: orders.filter((o) => ["confirmed", "in_preparation", "out_for_delivery"].includes(o.status)).length,
      overdueOutreach: outreach.filter((o) => o.status === "sent").length,
      deliveredThisMonth: orders.filter((o) => o.status === "delivered").length,
      totalVendors: (vendorsRes.data ?? []).length,
      recentOrders: orders.slice(0, 5),
      urgentRequests: requests
        .filter((r) => !["delivered", "cancelled"].includes(r.status) && hoursUntil(r.neededBy) <= 48)
        .sort((a, b) => new Date(a.neededBy).getTime() - new Date(b.neededBy).getTime())
        .slice(0, 5),
    });
    setLoading(false);
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 dark:bg-slate-800 rounded-xl" />
        ))}
      </div>
    );
  }

  const s = stats!;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">FuelOps</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400 mt-0.5">Campaign food, catering & vendor logistics</p>
        </div>
        <Link
          href="/fuel/requests/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Request
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Open Requests", value: s.openRequests, icon: ClipboardList, color: "text-blue-600", href: "/fuel/requests" },
          { label: "Active Orders", value: s.pendingOrders, icon: Truck, color: "text-amber-600", href: "/fuel/orders" },
          { label: "Follow-ups Pending", value: s.overdueOutreach, icon: AlertTriangle, color: "text-red-600", href: "/fuel/outreach" },
          { label: "Network Vendors", value: s.totalVendors, icon: UtensilsCrossed, color: "text-[#1D9E75]", href: "/fuel/vendors" },
        ].map((card) => (
          <Link key={card.label} href={card.href}>
            <motion.div
              whileHover={{ scale: 1.02 }}
              className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-4 cursor-pointer hover:border-[#0A2342]/30 transition-colors"
            >
              <div className="flex items-center justify-between mb-2">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <ArrowRight className="w-3 h-3 text-gray-400" />
              </div>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{card.value}</p>
              <p className="text-xs text-gray-500 dark:text-slate-400 mt-0.5">{card.label}</p>
            </motion.div>
          </Link>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent requests */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Urgent — next 48 hours</span>
            </div>
            <Link href="/fuel/requests" className="text-xs text-[#0A2342] dark:text-blue-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {s.urgentRequests.length === 0 ? (
              <p className="px-4 py-6 text-sm text-gray-500 dark:text-slate-400 text-center">No urgent requests</p>
            ) : (
              s.urgentRequests.map((req) => {
                const h = hoursUntil(req.neededBy);
                return (
                  <Link key={req.id} href={`/fuel/requests/${req.id}`} className="flex items-center justify-between px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors">
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                        {req.requestType.replace(/_/g, " ")} — {req.headcount} people
                      </p>
                      <p className="text-xs text-gray-500 dark:text-slate-400">{req.location ?? "No location"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={req.status} />
                      <span className={`text-xs font-semibold ${h <= 12 ? "text-red-600" : "text-amber-600"}`}>
                        {h <= 0 ? "OVERDUE" : `${h}h`}
                      </span>
                    </div>
                  </Link>
                );
              })
            )}
          </div>
        </div>

        {/* Recent orders */}
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <ShoppingBag className="w-4 h-4 text-[#0A2342]" />
              <span className="text-sm font-semibold text-gray-900 dark:text-white">Recent Orders</span>
            </div>
            <Link href="/fuel/orders" className="text-xs text-[#0A2342] dark:text-blue-400 hover:underline">
              View all
            </Link>
          </div>
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {s.recentOrders.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <CheckCircle2 className="w-8 h-8 text-gray-300 dark:text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-gray-500 dark:text-slate-400">No orders yet</p>
                <Link href="/fuel/requests/new" className="mt-2 inline-block text-xs text-[#0A2342] dark:text-blue-400 hover:underline">
                  Create first request
                </Link>
              </div>
            ) : (
              s.recentOrders.map((order) => (
                <div key={order.id} className="flex items-center justify-between px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                      {order.request.requestType.replace(/_/g, " ")} — {order.request.headcount} people
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">
                      {order.scheduledFor ? new Date(order.scheduledFor).toLocaleDateString("en-CA") : "No date set"}
                    </p>
                  </div>
                  <StatusBadge status={order.status} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
