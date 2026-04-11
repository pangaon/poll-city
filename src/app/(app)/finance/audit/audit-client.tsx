"use client";
import { useState, useEffect, useCallback } from "react";
import { ScrollText, ChevronLeft, ChevronRight, Filter } from "lucide-react";
import { motion } from "framer-motion";

interface AuditEntry {
  id: string;
  entityType: string;
  entityId: string;
  action: string;
  actorName: string;
  oldValue: unknown;
  newValue: unknown;
  createdAt: string;
}

const ENTITY_TYPES = [
  { value: "", label: "All Types" },
  { value: "FinanceExpense", label: "Expenses" },
  { value: "FinancePurchaseRequest", label: "Purchase Requests" },
  { value: "FinancePurchaseOrder", label: "Purchase Orders" },
  { value: "FinanceVendorBill", label: "Vendor Bills" },
  { value: "FinanceReimbursement", label: "Reimbursements" },
  { value: "CampaignBudget", label: "Budgets" },
  { value: "BudgetLine", label: "Budget Lines" },
  { value: "BudgetTransfer", label: "Budget Transfers" },
];

const ACTION_COLORS: Record<string, string> = {
  created: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  updated: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  deleted: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  approved: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  submitted: "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  paid: "bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400",
};

function actionBadge(action: string) {
  const cls = ACTION_COLORS[action] ?? "bg-gray-100 text-gray-700 dark:bg-slate-700 dark:text-slate-300";
  return (
    <span className={`inline-block px-2 py-0.5 rounded text-xs font-medium ${cls}`}>
      {action}
    </span>
  );
}

function fmtDate(iso: string) {
  const d = new Date(iso);
  return d.toLocaleDateString("en-CA", { year: "numeric", month: "short", day: "numeric" }) +
    " " +
    d.toLocaleTimeString("en-CA", { hour: "2-digit", minute: "2-digit" });
}

function JsonDiff({ old: oldVal, next }: { old: unknown; next: unknown }) {
  const format = (v: unknown) => {
    if (v === null || v === undefined) return null;
    try {
      return JSON.stringify(v, null, 2);
    } catch {
      return String(v);
    }
  };
  const o = format(oldVal);
  const n = format(next);
  if (!o && !n) return null;
  return (
    <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
      {o && (
        <div>
          <div className="text-xs text-gray-500 mb-1">Before</div>
          <pre className="bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-300 p-2 rounded overflow-x-auto max-h-32 text-[11px]">
            {o}
          </pre>
        </div>
      )}
      {n && (
        <div>
          <div className="text-xs text-gray-500 mb-1">After</div>
          <pre className="bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-300 p-2 rounded overflow-x-auto max-h-32 text-[11px]">
            {n}
          </pre>
        </div>
      )}
    </div>
  );
}

export default function AuditClient({ campaignId }: { campaignId: string }) {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(0);
  const [entityType, setEntityType] = useState("");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const limit = 50;

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId, limit: String(limit), offset: String(page * limit) });
    if (entityType) params.set("entityType", entityType);
    if (from) params.set("from", from);
    if (to) params.set("to", to);
    const res = await fetch(`/api/finance/audit-trail?${params}`);
    if (res.ok) {
      const json = await res.json();
      setLogs(json.data);
      setTotal(json.total);
    }
    setLoading(false);
  }, [campaignId, page, entityType, from, to]);

  useEffect(() => { load(); }, [load]);

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ScrollText className="w-5 h-5 text-[#0A2342]" />
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Finance Audit Trail</h2>
        </div>
        <div className="text-sm text-gray-500">{total.toLocaleString()} entries</div>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl p-3 flex flex-wrap gap-3 items-end">
        <Filter className="w-4 h-4 text-gray-400 self-center" />
        <div>
          <label className="block text-xs text-gray-500 mb-1">Entity Type</label>
          <select
            value={entityType}
            onChange={(e) => { setEntityType(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          >
            {ENTITY_TYPES.map((t) => (
              <option key={t.value} value={t.value}>{t.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">From</label>
          <input
            type="date"
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">To</label>
          <input
            type="date"
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(0); }}
            className="text-sm border border-gray-200 dark:border-slate-600 rounded-lg px-2 py-1.5 bg-white dark:bg-slate-800 text-gray-900 dark:text-white"
          />
        </div>
        {(entityType || from || to) && (
          <button
            onClick={() => { setEntityType(""); setFrom(""); setTo(""); setPage(0); }}
            className="text-sm text-gray-500 hover:text-gray-700 self-end pb-1.5"
          >
            Clear
          </button>
        )}
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">No audit entries found.</div>
        ) : (
          <div className="divide-y divide-gray-100 dark:divide-slate-800">
            {logs.map((entry) => (
              <motion.div
                key={entry.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="p-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 cursor-pointer"
                onClick={() => setExpanded(expanded === entry.id ? null : entry.id)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 flex-wrap min-w-0">
                    {actionBadge(entry.action)}
                    <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                      {entry.entityType.replace(/^Finance/, "")}
                    </span>
                    <span className="text-xs text-gray-400 font-mono truncate max-w-[120px]">
                      {entry.entityId.slice(-8)}
                    </span>
                  </div>
                  <div className="text-right shrink-0">
                    <div className="text-xs text-gray-500">{fmtDate(entry.createdAt)}</div>
                    <div className="text-xs text-gray-400">{entry.actorName}</div>
                  </div>
                </div>
                {expanded === entry.id && (
                  <JsonDiff old={entry.oldValue} next={entry.newValue} />
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <button
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" /> Prev
          </button>
          <span className="text-sm text-gray-500">
            Page {page + 1} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="flex items-center gap-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-slate-600 rounded-lg disabled:opacity-40 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Next <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
