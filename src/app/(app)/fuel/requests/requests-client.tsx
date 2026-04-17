"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { Plus, ClipboardList, Clock, CheckCircle2, XCircle, ChevronRight, Filter } from "lucide-react";

interface FoodRequest {
  id: string;
  requestType: string;
  status: string;
  headcount: number;
  neededBy: string;
  location: string | null;
  budgetCapCad: number | null;
  dietaryNotes: string | null;
  requestedBy: { name: string | null };
  _count: { quotes: number };
  order: { id: string; status: string } | null;
}

const STATUS_COLORS: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300",
  quoting: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  quoted: "bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400",
  ordered: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400",
  delivered: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  cancelled: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

const REQUEST_TYPE_LABELS: Record<string, string> = {
  hq_daily: "HQ Daily", event: "Event", phone_bank: "Phone Bank",
  canvassing: "Canvassing", sign_crew: "Sign Crew", volunteer_meal: "Volunteer Meal", other: "Other",
};

function hoursUntil(dateStr: string) {
  return Math.round((new Date(dateStr).getTime() - Date.now()) / 3_600_000);
}

export default function RequestsClient({ campaignId }: { campaignId: string }) {
  const [requests, setRequests] = useState<FoodRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (statusFilter) params.set("status", statusFilter);
    const res = await fetch(`/api/fuel/requests?${params}`).then((r) => r.json());
    if (res.data) setRequests(res.data);
    setLoading(false);
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Food Requests</h1>
          <p className="text-sm text-gray-500 dark:text-slate-400">{requests.length} requests</p>
        </div>
        <Link
          href="/fuel/requests/new"
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> New Request
        </Link>
      </div>

      <div className="flex gap-1 flex-wrap">
        {["", "draft", "quoting", "quoted", "ordered", "delivered", "cancelled"].map((s) => (
          <button
            key={s}
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
              statusFilter === s ? "bg-[#0A2342] text-white" : "bg-gray-100 dark:bg-slate-800 text-gray-600 dark:text-slate-400 hover:bg-gray-200 dark:hover:bg-slate-700"
            }`}
          >
            {s === "" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-2">
          {[...Array(5)].map((_, i) => <div key={i} className="h-16 bg-gray-100 dark:bg-slate-800 rounded-lg animate-pulse" />)}
        </div>
      ) : requests.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl">
          <ClipboardList className="w-10 h-10 text-gray-300 dark:text-slate-600 mx-auto mb-3" />
          <p className="text-gray-500 dark:text-slate-400 font-medium">No food requests</p>
          <Link href="/fuel/requests/new" className="mt-2 inline-block text-sm text-[#0A2342] dark:text-blue-400 hover:underline">Create first request</Link>
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {requests.map((req) => {
              const h = hoursUntil(req.neededBy);
              const isUrgent = h <= 48 && !["delivered", "cancelled"].includes(req.status);
              return (
                <Link
                  key={req.id}
                  href={`/fuel/requests/${req.id}`}
                  className="flex items-center gap-4 px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800 transition-colors group"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-semibold text-gray-900 dark:text-white">
                        {REQUEST_TYPE_LABELS[req.requestType] ?? req.requestType} — {req.headcount} people
                      </p>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[req.status]}`}>
                        {req.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-0.5 flex-wrap">
                      <span className={`flex items-center gap-1 text-xs ${isUrgent ? (h <= 0 ? "text-red-600 font-semibold" : "text-amber-600 font-medium") : "text-gray-500 dark:text-slate-400"}`}>
                        <Clock className="w-3 h-3" />
                        {h <= 0 ? "OVERDUE" : h <= 48 ? `${h}h` : new Date(req.neededBy).toLocaleDateString("en-CA")}
                      </span>
                      {req.location && <span className="text-xs text-gray-500 dark:text-slate-400">{req.location}</span>}
                      {req._count.quotes > 0 && <span className="text-xs text-gray-500 dark:text-slate-400">{req._count.quotes} quote{req._count.quotes !== 1 ? "s" : ""}</span>}
                      {req.budgetCapCad && <span className="text-xs text-gray-500 dark:text-slate-400">Budget: ${Number(req.budgetCapCad).toFixed(0)}</span>}
                    </div>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600 flex-shrink-0" />
                </Link>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
