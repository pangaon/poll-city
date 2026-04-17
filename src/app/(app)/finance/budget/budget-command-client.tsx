"use client";
import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Plus, ChevronRight, ChevronDown, Lock, AlertTriangle, DollarSign, X } from "lucide-react";

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

function BudgetLineRow({ line, depth, campaignId, onRefresh }: {
  line: BudgetLine; depth: number; campaignId: string; onRefresh: () => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const planned = Number(line.plannedAmount);
  const actual = Number(line.actualAmount);
  const committed = Number(line.committedAmount);
  const remaining = planned - actual - committed;
  const utilPct = planned > 0 ? (actual + committed) / planned : 0;
  const atRisk = utilPct >= line.warningThresholdPct;

  return (
    <>
      <tr className={`hover:bg-gray-50 dark:hover:bg-slate-800/50 ${atRisk ? "bg-amber-50/30 dark:bg-amber-900/10" : ""}`}>
        <td className="px-4 py-2.5" style={{ paddingLeft: `${16 + depth * 20}px` }}>
          <div className="flex items-center gap-1.5">
            {(line.children?.length ?? 0) > 0 ? (
              <button onClick={() => setExpanded((e) => !e)} className="text-gray-400 hover:text-gray-600 shrink-0">
                {expanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
              </button>
            ) : <span className="w-3.5" />}
            <span className="text-sm font-medium text-gray-800 dark:text-slate-200 truncate max-w-[200px]">{line.name}</span>
            {line.isLocked && <Lock className="w-3 h-3 text-gray-400 shrink-0" />}
            {atRisk && <AlertTriangle className="w-3 h-3 text-amber-500 shrink-0" />}
          </div>
          <div className="text-xs text-gray-400 capitalize mt-0.5" style={{ paddingLeft: "19px" }}>
            {line.category.replace(/_/g, " ")}
          </div>
        </td>
        <td className="px-4 py-2.5 text-right text-sm text-gray-600 dark:text-slate-400">{cad(line.plannedAmount)}</td>
        <td className="px-4 py-2.5 text-right text-sm text-amber-600">{cad(line.committedAmount)}</td>
        <td className="px-4 py-2.5 text-right text-sm font-medium text-gray-900 dark:text-white">{cad(line.actualAmount)}</td>
        <td className={`px-4 py-2.5 text-right text-sm font-medium ${remaining < 0 ? "text-red-600" : "text-emerald-600"}`}>
          {cad(remaining)}
        </td>
        <td className="px-4 py-2.5 text-right">
          <span className={`text-xs font-semibold ${utilPct > 1 ? "text-red-600" : utilPct >= line.warningThresholdPct ? "text-amber-600" : "text-emerald-600"}`}>
            {utilPct > 1 ? "+" : ""}{Math.round((utilPct - 1) * 100)}%
          </span>
        </td>
        <td className="px-4 py-2.5 text-right">
          <div className="flex items-center justify-end gap-1">
            <div className="w-16 h-1.5 bg-gray-200 dark:bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${utilPct > 1 ? "bg-red-500" : utilPct >= line.warningThresholdPct ? "bg-amber-500" : "bg-[#1D9E75]"}`}
                style={{ width: `${Math.min(utilPct * 100, 100)}%` }}
              />
            </div>
            <span className="text-xs text-gray-400 w-8 text-right">{Math.round(utilPct * 100)}%</span>
          </div>
        </td>
      </tr>
      {expanded && line.children?.map((child) => (
        <BudgetLineRow key={child.id} line={child} depth={depth + 1} campaignId={campaignId} onRefresh={onRefresh} />
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

  const load = useCallback(async () => {
    setLoading(true);
    const res = await fetch(`/api/finance/budgets?campaignId=${campaignId}`).then((r) => r.json());
    if (res.data) {
      setBudgets(res.data);
      if (!activeBudgetId && res.data.length > 0) setActiveBudgetId(res.data[0].id);
    }
    setLoading(false);
  }, [campaignId, activeBudgetId]);

  useEffect(() => { load(); }, [campaignId]);

  const activeBudget = budgets.find((b) => b.id === activeBudgetId);
  const nestedLines = activeBudget ? nest(activeBudget.budgetLines) : [];

  async function createBudget() {
    if (!newBudgetName.trim() || !newBudgetTotal) return;
    setSaving(true);
    const res = await fetch("/api/finance/budgets", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, name: newBudgetName, totalBudget: Number(newBudgetTotal) }),
    }).then((r) => r.json());
    setSaving(false);
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
  }

  async function createLine() {
    if (!newLine.name.trim() || !newLine.plannedAmount || !activeBudgetId) return;
    setSaving(true);
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
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) {
      toast.success("Budget line added");
      setShowNewLine(false);
      setNewLine({ name: "", category: "other", plannedAmount: "" });
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  const totalPlanned = activeBudget?.budgetLines.reduce((s, l) => s + Number(l.plannedAmount), 0) ?? 0;
  const totalActual = activeBudget?.budgetLines.reduce((s, l) => s + Number(l.actualAmount), 0) ?? 0;
  const totalCommitted = activeBudget?.budgetLines.reduce((s, l) => s + Number(l.committedAmount), 0) ?? 0;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">Budget Manager</h1>
        <button
          onClick={() => setShowNewBudget(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
        >
          <Plus className="w-3.5 h-3.5" /> New Budget
        </button>
      </div>

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
          <div className="px-4 py-3 border-b border-gray-100 dark:border-slate-800 flex items-center justify-between">
            <div>
              <span className="font-semibold text-gray-900 dark:text-white">{activeBudget.name}</span>
              <span className="ml-2 text-sm text-gray-500">Total: {cad(activeBudget.totalBudget)}</span>
            </div>
            <div className="flex items-center gap-3 text-sm">
              <span className="text-gray-500">Planned: <strong className="text-gray-800 dark:text-white">{cad(totalPlanned)}</strong></span>
              <span className="text-amber-600">Committed: <strong>{cad(totalCommitted)}</strong></span>
              <span className="text-gray-700 dark:text-slate-300">Actual: <strong>{cad(totalActual)}</strong></span>
              <button
                onClick={() => setShowNewLine(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-[#0A2342] text-white rounded-lg text-xs font-medium"
              >
                <Plus className="w-3 h-3" /> Add Line
              </button>
            </div>
          </div>

          {/* Over-budget alert banner */}
          {(() => {
            const overLines = activeBudget.budgetLines.filter((l) => {
              const p = Number(l.plannedAmount);
              return p > 0 && (Number(l.actualAmount) + Number(l.committedAmount)) > p;
            });
            return overLines.length > 0 ? (
              <div className="mx-4 mt-3 flex items-center gap-2 px-3 py-2 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span><strong>{overLines.length}</strong> line{overLines.length !== 1 ? "s" : ""} over budget: {overLines.map((l) => l.name).join(", ")}</span>
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
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 dark:divide-slate-800">
                {nestedLines.map((line) => (
                  <BudgetLineRow key={line.id} line={line} depth={0} campaignId={campaignId} onRefresh={load} />
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 dark:bg-slate-800/50 font-semibold border-t border-gray-200 dark:border-slate-700">
                  <td className="px-4 py-2.5 text-sm text-gray-700 dark:text-slate-300">Totals</td>
                  <td className="px-4 py-2.5 text-right text-sm text-gray-700 dark:text-slate-300">{cad(totalPlanned)}</td>
                  <td className="px-4 py-2.5 text-right text-sm text-amber-600">{cad(totalCommitted)}</td>
                  <td className="px-4 py-2.5 text-right text-sm text-gray-900 dark:text-white">{cad(totalActual)}</td>
                  <td className={`px-4 py-2.5 text-right text-sm ${totalPlanned - totalActual - totalCommitted < 0 ? "text-red-600" : "text-emerald-600"}`}>
                    {cad(totalPlanned - totalActual - totalCommitted)}
                  </td>
                  <td className="px-4 py-2.5 text-right text-sm">
                    {totalPlanned > 0 && (
                      <span className={`text-xs font-semibold ${(totalActual + totalCommitted) > totalPlanned ? "text-red-600" : "text-emerald-600"}`}>
                        {(totalActual + totalCommitted) > totalPlanned ? "+" : ""}{Math.round(((totalActual + totalCommitted) / totalPlanned - 1) * 100)}%
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-2.5" />
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
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">New Campaign Budget</h2>
                <button onClick={() => setShowNewBudget(false)} className="text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
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
                <button onClick={() => setShowNewBudget(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">Cancel</button>
                <button
                  onClick={createBudget}
                  disabled={saving || !newBudgetName.trim() || !newBudgetTotal}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Creating..." : "Create Budget"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* New Line modal */}
      <AnimatePresence>
        {showNewLine && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) setShowNewLine(false); }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-md shadow-xl"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Add Budget Line</h2>
                <button onClick={() => setShowNewLine(false)} className="text-gray-400"><X className="w-4 h-4" /></button>
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
                <button onClick={() => setShowNewLine(false)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">Cancel</button>
                <button
                  onClick={createLine}
                  disabled={saving || !newLine.name.trim() || !newLine.plannedAmount}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {saving ? "Adding..." : "Add Line"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
