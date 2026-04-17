"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, ChevronRight, ChevronDown, Lock, Unlock, AlertTriangle,
  DollarSign, X, Trash2, Loader2, CheckCheck,
} from "lucide-react";

interface BudgetLine {
  id: string;
  name: string;
  category: string;
  plannedAmount: string;
  committedAmount: string;
  actualAmount: string;
  isLocked: boolean;
  isActive: boolean;
  warningThresholdPct: number;
  parentBudgetLineId: string | null;
  children?: BudgetLine[];
  _count?: { expenses: number };
}

interface CampaignBudget {
  id: string;
  name: string;
  status: string;
  totalBudget: string;
  currency: string;
  electionCycle: string | null;
  budgetLines: BudgetLine[];
}

function cad(v: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD", maximumFractionDigits: 0 }).format(Number(v));
}

const CATEGORIES = [
  "advertising", "digital_ads", "print", "signs", "literature", "events",
  "staffing", "contractors", "volunteer_support", "travel", "office",
  "software", "phones", "outreach", "canvassing", "fundraising",
  "compliance", "research", "photography", "merchandise", "shipping",
  "contingency", "other",
];

function flatLines(lines: BudgetLine[]): BudgetLine[] {
  return lines.flatMap((l) => [l, ...flatLines(l.children ?? [])]);
}

// ── Budget line row — inline editing, lock/approve, delete ────────────────────
function BudgetLineRow({ line, depth, onRefresh }: {
  line: BudgetLine; depth: number; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const [editingAmount, setEditingAmount] = useState(false);
  const [editAmount, setEditAmount] = useState(String(Number(line.plannedAmount)));
  const [working, setWorking] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const cancelAmountRef = useRef(false);

  const planned = Number(line.plannedAmount);
  const actual = Number(line.actualAmount);
  const committed = Number(line.committedAmount);
  const total = actual + committed;
  const remaining = planned - total;
  const utilPct = planned > 0 ? total / planned : 0;
  const atRisk = utilPct >= line.warningThresholdPct;
  const isOver = planned > 0 && total > planned;

  useEffect(() => {
    if (editingAmount) amountInputRef.current?.focus();
  }, [editingAmount]);

  async function toggleLock() {
    setWorking(true);
    try {
      const res = await fetch(`/api/finance/budget-lines/${line.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ isLocked: !line.isLocked }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? "Failed to update line");
        return;
      }
      toast.success(line.isLocked ? "Line unlocked — now editable" : "Line approved");
      onRefresh();
    } catch {
      toast.error("Network error");
    } finally {
      setWorking(false);
    }
  }

  async function deleteLine() {
    setWorking(true);
    try {
      const res = await fetch(`/api/finance/budget-lines/${line.id}`, { method: "DELETE" });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? "Cannot remove line");
        return;
      }
      toast.success("Budget line removed");
      onRefresh();
    } catch {
      toast.error("Network error");
    } finally {
      setWorking(false);
    }
  }

  async function saveAmount() {
    if (cancelAmountRef.current) { cancelAmountRef.current = false; return; }
    const amt = parseFloat(editAmount);
    setEditingAmount(false);
    if (isNaN(amt) || amt < 0 || amt === planned) return;
    setWorking(true);
    try {
      const res = await fetch(`/api/finance/budget-lines/${line.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ plannedAmount: amt }),
      });
      if (!res.ok) {
        const d = await res.json() as { error?: string };
        toast.error(d.error ?? "Failed to update amount");
        return;
      }
      toast.success("Planned amount updated");
      onRefresh();
    } catch {
      toast.error("Network error");
    } finally {
      setWorking(false);
    }
  }

  return (
    <>
      <tr className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 ${isOver ? "bg-red-50/40 dark:bg-red-900/10" : atRisk ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}>
        {/* Name / Category */}
        <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <div className="flex items-center gap-1.5">
            {(line.children?.length ?? 0) > 0 ? (
              <button onClick={() => setExpanded((e) => !e)} className="text-gray-400 hover:text-gray-600 shrink-0">
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : <span className="w-3.5 shrink-0" />}
            <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate max-w-[160px]">{line.name}</span>
            {isOver && <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />}
            {atRisk && !isOver && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5" style={{ paddingLeft: "19px" }}>
            <span className="text-xs text-gray-400 capitalize">{line.category.replace(/_/g, " ")}</span>
            <span className={`text-xs font-medium px-1.5 py-0 rounded-full ${line.isLocked ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
              {line.isLocked ? "Approved" : "Draft"}
            </span>
          </div>
        </td>

        {/* Planned — inline editable when unlocked */}
        <td className="px-4 py-2.5 text-right">
          {editingAmount ? (
            <input
              ref={amountInputRef}
              type="number"
              min="0"
              step="100"
              value={editAmount}
              onChange={(e) => setEditAmount(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") { e.preventDefault(); saveAmount(); }
                if (e.key === "Escape") { cancelAmountRef.current = true; setEditingAmount(false); setEditAmount(String(planned)); }
              }}
              onBlur={saveAmount}
              className="w-24 px-1.5 py-0.5 text-sm text-right border-2 border-[#0A2342] rounded focus:outline-none bg-white dark:bg-slate-800 dark:text-white"
            />
          ) : (
            <button
              onClick={() => { if (!line.isLocked) { setEditingAmount(true); setEditAmount(String(planned)); } }}
              className={`text-sm ${!line.isLocked ? "text-gray-600 dark:text-slate-400 hover:text-[#0A2342] hover:underline cursor-text" : "text-gray-600 dark:text-slate-400 cursor-default"}`}
              title={line.isLocked ? "Unlock to edit" : "Click to edit"}
            >
              {cad(line.plannedAmount)}
            </button>
          )}
        </td>

        {/* Committed */}
        <td className="px-4 py-2.5 text-right text-sm text-amber-600">{cad(line.committedAmount)}</td>

        {/* Actual */}
        <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-900 dark:text-white">{cad(line.actualAmount)}</td>

        {/* Remaining */}
        <td className={`px-4 py-2.5 text-right text-sm font-medium ${remaining < 0 ? "text-red-600" : "text-emerald-600"}`}>
          {cad(remaining)}
        </td>

        {/* Variance — absolute dollars, contextual label */}
        <td className="px-4 py-2.5 text-right">
          {planned > 0 ? (
            <span className={`text-xs font-semibold whitespace-nowrap ${isOver ? "text-red-600" : atRisk ? "text-amber-600" : "text-emerald-600"}`}>
              {isOver ? `+${cad(total - planned)} over` : `-${cad(remaining)} left`}
            </span>
          ) : (
            <span className="text-xs text-gray-400">—</span>
          )}
        </td>

        {/* Used % bar */}
        <td className="px-4 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${isOver ? "bg-red-500" : atRisk ? "bg-amber-500" : "bg-[#1D9E75]"}`}
                style={{ width: `${Math.min(utilPct * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">{Math.round(utilPct * 100)}%</span>
          </div>
        </td>

        {/* Actions */}
        <td className="px-3 py-2.5">
          <div className="flex items-center gap-0.5 justify-end">
            {working ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin text-gray-400" />
            ) : (
              <>
                <button
                  onClick={toggleLock}
                  title={line.isLocked ? "Unlock line (allow edits)" : "Approve line (lock)"}
                  className={`p-1 rounded transition-colors ${
                    line.isLocked
                      ? "text-emerald-600 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                      : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20"
                  }`}
                >
                  {line.isLocked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                </button>
                {!line.isLocked && (line._count?.expenses ?? 0) === 0 && (
                  <button
                    onClick={deleteLine}
                    title="Remove line (no expenses)"
                    className="p-1 rounded text-gray-300 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </>
            )}
          </div>
        </td>
      </tr>

      {/* Children */}
      {expanded && line.children?.map((child) => (
        <BudgetLineRow key={child.id} line={child} depth={depth + 1} onRefresh={onRefresh} />
      ))}
    </>
  );
}

function nest(lines: BudgetLine[]): BudgetLine[] {
  const map = new Map<string, BudgetLine>();
  const roots: BudgetLine[] = [];
  lines.forEach((l) => { map.set(l.id, { ...l, children: [] }); });
  map.forEach((line) => {
    if (line.parentBudgetLineId) {
      const parent = map.get(line.parentBudgetLineId);
      if (parent) parent.children!.push(line);
      else roots.push(line);
    } else {
      roots.push(line);
    }
  });
  return roots;
}

interface NewLineForm { name: string; category: string; plannedAmount: string }

// ── Main component ─────────────────────────────────────────────────────────────
export default function BudgetCommandClient({ campaignId }: { campaignId: string }) {
  const [budgets, setBudgets] = useState<CampaignBudget[]>([]);
  const [activeBudgetId, setActiveBudgetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showNewBudget, setShowNewBudget] = useState(false);
  const [showNewLine, setShowNewLine] = useState(false);
  const [newBudgetName, setNewBudgetName] = useState("");
  const [newBudgetTotal, setNewBudgetTotal] = useState("");
  const [newLine, setNewLine] = useState<NewLineForm>({ name: "", category: "other", plannedAmount: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/finance/budgets?campaignId=${campaignId}`).then((r) => r.json()) as { data?: CampaignBudget[]; error?: string };
      if (res.data) {
        setBudgets(res.data);
        setActiveBudgetId((prev) => prev ?? (res.data!.length > 0 ? res.data![0].id : null));
      } else {
        setError(res.error ?? "Failed to load budgets");
      }
    } catch {
      setError("Network error — could not load budgets");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const activeBudget = budgets.find((b) => b.id === activeBudgetId);
  const nestedLines = activeBudget ? nest(activeBudget.budgetLines) : [];
  const allFlat = flatLines(nestedLines);
  const draftCount = allFlat.filter((l) => !l.isLocked).length;
  const approvedCount = allFlat.filter((l) => l.isLocked).length;

  const totalPlanned = activeBudget?.budgetLines.reduce((s, l) => s + Number(l.plannedAmount), 0) ?? 0;
  const totalActual = activeBudget?.budgetLines.reduce((s, l) => s + Number(l.actualAmount), 0) ?? 0;
  const totalCommitted = activeBudget?.budgetLines.reduce((s, l) => s + Number(l.committedAmount), 0) ?? 0;
  const totalRemaining = totalPlanned - totalActual - totalCommitted;

  async function createBudget() {
    if (!newBudgetName.trim() || !newBudgetTotal) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, name: newBudgetName, totalBudget: Number(newBudgetTotal) }),
      }).then((r) => r.json()) as { data?: CampaignBudget; error?: string };
      if (res.data) {
        toast.success("Budget created");
        setShowNewBudget(false);
        setNewBudgetName("");
        setNewBudgetTotal("");
        setActiveBudgetId(res.data.id);
        load();
      } else {
        toast.error(res.error ?? "Failed");
      }
    } catch {
      toast.error("Network error — budget not saved");
    } finally {
      setSaving(false);
    }
  }

  async function createLine() {
    if (!newLine.name.trim() || !newLine.plannedAmount || !activeBudgetId) return;
    setSaving(true);
    try {
      const res = await fetch("/api/finance/budget-lines", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          campaignBudgetId: activeBudgetId,
          name: newLine.name,
          category: newLine.category,
          plannedAmount: Number(newLine.plannedAmount),
        }),
      }).then((r) => r.json()) as { data?: unknown; error?: string };
      if (res.data) {
        toast.success("Budget line added");
        setShowNewLine(false);
        setNewLine({ name: "", category: "other", plannedAmount: "" });
        load();
      } else {
        toast.error(res.error ?? "Failed");
      }
    } catch {
      toast.error("Network error — line not saved");
    } finally {
      setSaving(false);
    }
  }

  async function approveAll() {
    const toApprove = allFlat.filter((l) => !l.isLocked);
    if (toApprove.length === 0) { toast.info("All lines already approved"); return; }
    setSaving(true);
    try {
      const results = await Promise.allSettled(
        toApprove.map((l) =>
          fetch(`/api/finance/budget-lines/${l.id}`, {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ isLocked: true }),
          })
        )
      );
      const failed = results.filter((r) => r.status === "rejected").length;
      if (failed === 0) {
        toast.success(`${toApprove.length} line${toApprove.length !== 1 ? "s" : ""} approved`);
      } else {
        toast.error(`${failed} line${failed !== 1 ? "s" : ""} could not be approved`);
      }
      load();
    } catch {
      toast.error("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Budget Manager</h1>
        <button
          onClick={() => setShowNewBudget(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> New Budget
        </button>
      </div>

      {error && (
        <div className="flex items-center gap-2 px-4 py-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-xl text-sm text-red-700 dark:text-red-300">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Budget tabs */}
      {budgets.length > 0 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {budgets.map((b) => (
            <button
              key={b.id}
              onClick={() => setActiveBudgetId(b.id)}
              className={`shrink-0 px-3 py-1.5 rounded-lg text-sm font-medium border transition-colors
                ${activeBudgetId === b.id
                  ? "bg-[#0A2342] text-white border-[#0A2342]"
                  : "bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 border-gray-200 dark:border-slate-700 hover:border-gray-300"
                }`}
            >
              {b.name}
              <span className={`ml-1.5 text-xs px-1.5 py-0.5 rounded ${b.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-500"}`}>
                {b.status}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* Active budget */}
      {activeBudget && (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          {/* Budget header */}
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800">
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 justify-between">
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-gray-900 dark:text-white">{activeBudget.name}</span>
                <span className="text-sm text-gray-500">Cap: <strong className="text-gray-800 dark:text-white">{cad(activeBudget.totalBudget)}</strong></span>
                <span className="text-sm text-gray-500">Planned: <strong className="text-gray-800 dark:text-white">{cad(totalPlanned)}</strong></span>
                <span className="text-sm text-amber-600">Committed: <strong>{cad(totalCommitted)}</strong></span>
                <span className="text-sm text-gray-700 dark:text-slate-300">Actual: <strong>{cad(totalActual)}</strong></span>
              </div>
              <div className="flex items-center gap-2">
                {/* Draft / Approved summary */}
                {allFlat.length > 0 && (
                  <div className="flex items-center gap-2 text-xs">
                    {draftCount > 0 && (
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded-full font-medium">
                        {draftCount} draft
                      </span>
                    )}
                    {approvedCount > 0 && (
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-full font-medium">
                        {approvedCount} approved
                      </span>
                    )}
                  </div>
                )}
                {draftCount > 0 && (
                  <button
                    onClick={approveAll}
                    disabled={saving}
                    className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-medium hover:bg-emerald-700 disabled:opacity-50"
                  >
                    <CheckCheck className="w-3 h-3" /> Approve All
                  </button>
                )}
                <button
                  onClick={() => setShowNewLine(true)}
                  className="flex items-center gap-1 px-2.5 py-1 bg-[#0A2342] text-white rounded-lg text-xs font-medium hover:bg-[#0A2342]/90"
                >
                  <Plus className="w-3 h-3" /> Add Line
                </button>
              </div>
            </div>
          </div>

          {/* Over-budget alert */}
          {(() => {
            const overLines = activeBudget.budgetLines.filter((l) => {
              const p = Number(l.plannedAmount);
              return p > 0 && (Number(l.actualAmount) + Number(l.committedAmount)) > p;
            });
            return overLines.length > 0 ? (
              <div className="mx-4 mt-3 flex items-start gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>
                  <strong>{overLines.length}</strong> line{overLines.length !== 1 ? "s" : ""} over budget: {overLines.map((l) => l.name).join(", ")}
                </span>
              </div>
            ) : null;
          })()}

          {/* Lines table */}
          <div className="overflow-x-auto mt-2">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-400 border-b border-gray-50 dark:border-slate-800">
                  <th className="px-4 py-2 text-left">Line / Category</th>
                  <th className="px-4 py-2 text-right">Planned</th>
                  <th className="px-4 py-2 text-right">Committed</th>
                  <th className="px-4 py-2 text-right">Actual</th>
                  <th className="px-4 py-2 text-right">Remaining</th>
                  <th className="px-4 py-2 text-right">Variance</th>
                  <th className="px-4 py-2 text-right">Used</th>
                  <th className="px-3 py-2 text-right w-16"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {nestedLines.map((line) => (
                  <BudgetLineRow key={line.id} line={line} depth={0} onRefresh={load} />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-slate-800/50 font-semibold border-t border-gray-200 dark:border-slate-700">
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300">Totals</td>
                  <td className="px-4 py-2.5 text-right text-sm text-gray-700 dark:text-slate-300">
                    <div>{cad(totalPlanned)}</div>
                    {Number(activeBudget.totalBudget) > 0 && (
                      <div className={`text-xs font-normal ${totalPlanned > Number(activeBudget.totalBudget) ? "text-red-500" : "text-gray-400"}`}>
                        of {cad(activeBudget.totalBudget)} cap
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm text-amber-600">{cad(totalCommitted)}</td>
                  <td className="px-4 py-2.5 text-right text-sm text-gray-900 dark:text-white">{cad(totalActual)}</td>
                  <td className={`px-4 py-2.5 text-right text-sm ${totalRemaining < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {cad(totalRemaining)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm">
                    {totalPlanned > 0 && (
                      <span className={`text-xs font-semibold ${(totalActual + totalCommitted) > totalPlanned ? "text-red-600" : "text-emerald-600"}`}>
                        {(totalActual + totalCommitted) > totalPlanned
                          ? `+${cad(totalActual + totalCommitted - totalPlanned)} over`
                          : `-${cad(totalRemaining)} left`}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm">
                    {totalPlanned > 0 && (
                      <span className="text-xs text-gray-500">
                        {Math.round(((totalActual + totalCommitted) / totalPlanned) * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5" />
                </tr>
              </tfoot>
            </table>
          </div>

          {activeBudget.budgetLines.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <DollarSign className="w-8 h-8 mx-auto mb-2 opacity-30" />
              <p className="text-sm">No budget lines yet. Add lines to start tracking.</p>
            </div>
          )}
        </div>
      )}

      {/* Loading skeleton */}
      {loading && (
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-14 bg-gray-100 dark:bg-slate-800 rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!loading && budgets.length === 0 && !showNewBudget && (
        <div className="text-center py-16 bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700">
          <DollarSign className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <h3 className="font-semibold text-gray-700 dark:text-slate-300 mb-1">No budget yet</h3>
          <p className="text-sm text-gray-400 mb-4">Create your campaign budget to start tracking spend.</p>
          <button onClick={() => setShowNewBudget(true)} className="px-4 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium">
            Create Budget
          </button>
        </div>
      )}

      {/* New Budget modal */}
      <AnimatePresence>
        {showNewBudget && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNewBudget(false); }}
          >
            <motion.div
              initial={{ scale: 0.95, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">New Campaign Budget</h2>
                <button onClick={() => setShowNewBudget(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Budget Name</label>
                  <input
                    value={newBudgetName}
                    onChange={(e) => setNewBudgetName(e.target.value)}
                    placeholder="e.g. 2026 Municipal Campaign"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Total Budget (CAD)</label>
                  <input
                    type="number"
                    value={newBudgetTotal}
                    onChange={(e) => setNewBudgetTotal(e.target.value)}
                    placeholder="50000"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowNewBudget(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">
                  Cancel
                </button>
                <button
                  onClick={createBudget}
                  disabled={saving || !newBudgetName.trim() || !newBudgetTotal}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Creating…" : "Create Budget"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add Line modal */}
      <AnimatePresence>
        {showNewLine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNewLine(false); }}
          >
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="relative w-full sm:max-w-md bg-white dark:bg-slate-900 rounded-t-2xl sm:rounded-2xl p-5 shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Add Budget Line</h2>
                <button onClick={() => setShowNewLine(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Line Name</label>
                  <input
                    value={newLine.name}
                    onChange={(e) => setNewLine((p) => ({ ...p, name: e.target.value }))}
                    placeholder="e.g. Lawn Signs"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Category</label>
                  <select
                    value={newLine.category}
                    onChange={(e) => setNewLine((p) => ({ ...p, category: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-slate-400">Planned Amount (CAD)</label>
                  <input
                    type="number"
                    value={newLine.plannedAmount}
                    onChange={(e) => setNewLine((p) => ({ ...p, plannedAmount: e.target.value }))}
                    placeholder="5000"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
              </div>
              <div className="flex gap-2 mt-4">
                <button onClick={() => setShowNewLine(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">
                  Cancel
                </button>
                <button
                  onClick={createLine}
                  disabled={saving || !newLine.name.trim() || !newLine.plannedAmount}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Adding…" : "Add Line"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
