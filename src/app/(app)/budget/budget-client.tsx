"use client";

import { useEffect, useState, useCallback, useMemo } from "react";
import { toast } from "sonner";
import * as XLSX from "xlsx";
import Papa from "papaparse";
import {
  DollarSign, TrendingUp, TrendingDown, AlertTriangle, Plus, Download, Upload,
  Sparkles, Settings2, Trash2, Edit2, Paperclip, Tag as TagIcon, X, Check,
} from "lucide-react";
import { PageHeader } from "@/components/ui";
import { FieldHelp } from "@/components/ui/field-help";

type ItemType = "allocation" | "expense";
type ItemStatus = "pending" | "approved" | "paid" | "rejected" | "reconciled";

interface BudgetItem {
  id: string;
  itemType: ItemType;
  category: string;
  amount: number;
  description: string | null;
  vendor: string | null;
  paymentMethod: string | null;
  receiptUrl: string | null;
  receiptNumber: string | null;
  status: ItemStatus;
  tags: string[];
  incurredAt: string;
  paidAt: string | null;
  createdAt: string;
}

interface BudgetRule {
  id: string;
  category: string;
  percentOfTotal: number | null;
  fixedAmount: number | null;
  priority: number;
  warnAtPercent: number;
  notes: string | null;
  isActive: boolean;
}

interface CategoryBreakdown {
  category: string;
  allocation: number;
  expense: number;
  paid: number;
  pending: number;
  remaining: number;
  utilizationPct: number;
}

interface Suggestion {
  category: string;
  suggestedAmount: number;
  currentAllocation: number;
  delta: number;
  source: "rule" | "template" | "history";
  priority: number;
  notes: string;
  warning?: string;
}

interface Template {
  id: string;
  name: string;
  description: string;
  electionLevel: string;
  suggestedTotalRange: [number, number];
  items: Array<{ category: string; percentOfTotal: number; priority: number; notes: string }>;
}

const STATUS_COLOURS: Record<ItemStatus, string> = {
  pending: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  paid: "bg-emerald-100 text-emerald-800",
  rejected: "bg-red-100 text-red-800",
  reconciled: "bg-purple-100 text-purple-800",
};

const TAB_LABELS = ["Overview", "Items", "Rules", "Suggestions", "Import/Export"] as const;
type Tab = typeof TAB_LABELS[number];

function currency(n: number): string {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(n);
}

export default function BudgetClient({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<Tab>("Overview");
  const [items, setItems] = useState<BudgetItem[]>([]);
  const [categories, setCategories] = useState<CategoryBreakdown[]>([]);
  const [totals, setTotals] = useState({ allocation: 0, expense: 0 });
  const [rules, setRules] = useState<BudgetRule[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [suggestionTotal, setSuggestionTotal] = useState<number>(50000);
  const [loading, setLoading] = useState(true);
  const [showAddItem, setShowAddItem] = useState(false);
  const [showAddRule, setShowAddRule] = useState(false);
  const [editingItem, setEditingItem] = useState<BudgetItem | null>(null);

  const loadAll = useCallback(async () => {
    setLoading(true);
    try {
      const [budgetRes, rulesRes, templatesRes] = await Promise.all([
        fetch(`/api/budget?campaignId=${campaignId}`),
        fetch(`/api/budget/rules?campaignId=${campaignId}`),
        fetch(`/api/budget/templates?campaignId=${campaignId}`),
      ]);
      const budget = await budgetRes.json();
      const rulesData = await rulesRes.json();
      const templatesData = await templatesRes.json();
      setItems(budget.data?.items ?? []);
      setCategories(budget.data?.categories ?? []);
      setTotals(budget.data?.totals ?? { allocation: 0, expense: 0 });
      setRules(rulesData.data ?? []);
      setTemplates(templatesData.data?.system ?? []);
    } catch {
      toast.error("Failed to load budget");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  const loadSuggestions = useCallback(async () => {
    try {
      const res = await fetch(`/api/budget/suggestions?campaignId=${campaignId}&totalBudget=${suggestionTotal}`);
      const data = await res.json();
      setSuggestions(data.data?.suggestions ?? []);
    } catch {
      toast.error("Failed to load suggestions");
    }
  }, [campaignId, suggestionTotal]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  useEffect(() => {
    if (tab === "Suggestions") loadSuggestions();
  }, [tab, loadSuggestions]);

  const remaining = totals.allocation - totals.expense;
  const utilPct = totals.allocation > 0 ? Math.round((totals.expense / totals.allocation) * 100) : 0;

  async function deleteItem(id: string) {
    if (!confirm("Delete this budget item?")) return;
    const prev = items;
    setItems((xs) => xs.filter((x) => x.id !== id));
    try {
      const res = await fetch(`/api/budget/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Deleted");
      loadAll();
    } catch {
      setItems(prev);
      toast.error("Delete failed");
    }
  }

  async function deleteRule(id: string) {
    if (!confirm("Delete this rule?")) return;
    try {
      const res = await fetch(`/api/budget/rules/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      toast.success("Rule deleted");
      loadAll();
    } catch {
      toast.error("Delete failed");
    }
  }

  async function applyTemplate(templateId: string) {
    if (!confirm("Apply this template? This will add rules to your campaign.")) return;
    try {
      const res = await fetch("/api/budget/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, templateId, replaceExisting: false }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      toast.success(`Applied ${data.data.applied} rules from ${data.data.template}`);
      loadAll();
      setTab("Rules");
    } catch {
      toast.error("Apply template failed");
    }
  }

  async function downloadExport() {
    try {
      const res = await fetch(`/api/export/budget?campaignId=${campaignId}`);
      if (!res.ok) throw new Error();
      const blob = await res.blob();
      const disposition = res.headers.get("Content-Disposition") ?? "";
      const match = disposition.match(/filename="([^"]+)"/);
      const filename = match?.[1] ?? `budget-${new Date().toISOString().slice(0, 10)}.csv`;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);
      toast.success("Budget exported");
    } catch {
      toast.error("Export failed");
    }
  }

  return (
    <div className="max-w-7xl mx-auto animate-fade-in">
      <PageHeader
        title="Budget Tracker"
        description="Rules-driven budgeting with receipts, suggestions, import/export — enterprise grade."
      />

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <StatCard icon={DollarSign} label="Total Budget" value={currency(totals.allocation)} color="blue" />
        <StatCard icon={TrendingDown} label="Spent" value={currency(totals.expense)} color="amber" />
        <StatCard icon={TrendingUp} label="Remaining" value={currency(remaining)} color={remaining >= 0 ? "emerald" : "red"} />
        <StatCard icon={AlertTriangle} label="Utilization" value={`${utilPct}%`} color={utilPct > 90 ? "red" : utilPct > 75 ? "amber" : "emerald"} />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {TAB_LABELS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 min-w-[90px] text-sm font-semibold py-2 px-3 rounded-lg transition-colors ${
              tab === t ? "bg-white shadow-sm text-gray-900" : "text-gray-600 hover:text-gray-900"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center text-gray-400">Loading...</div>
      ) : (
        <>
          {tab === "Overview" && (
            <OverviewTab categories={categories} />
          )}
          {tab === "Items" && (
            <ItemsTab
              items={items}
              onAdd={() => setShowAddItem(true)}
              onEdit={setEditingItem}
              onDelete={deleteItem}
            />
          )}
          {tab === "Rules" && (
            <RulesTab
              rules={rules}
              templates={templates}
              onAdd={() => setShowAddRule(true)}
              onDelete={deleteRule}
              onApplyTemplate={applyTemplate}
            />
          )}
          {tab === "Suggestions" && (
            <SuggestionsTab
              suggestions={suggestions}
              total={suggestionTotal}
              onChangeTotal={setSuggestionTotal}
              onReload={loadSuggestions}
              hasRules={rules.length > 0}
            />
          )}
          {tab === "Import/Export" && (
            <ImportExportTab campaignId={campaignId} onExport={downloadExport} onImported={loadAll} />
          )}
        </>
      )}

      {/* Add/Edit item modal */}
      {(showAddItem || editingItem) && (
        <ItemModal
          campaignId={campaignId}
          item={editingItem}
          onClose={() => {
            setShowAddItem(false);
            setEditingItem(null);
          }}
          onSaved={loadAll}
        />
      )}

      {/* Add rule modal */}
      {showAddRule && (
        <RuleModal campaignId={campaignId} onClose={() => setShowAddRule(false)} onSaved={loadAll} />
      )}
    </div>
  );
}

/* ─── Stat Card ────────────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof DollarSign;
  label: string;
  value: string;
  color: "blue" | "amber" | "emerald" | "red";
}) {
  const colours: Record<string, string> = {
    blue: "bg-blue-50 text-blue-700 border-blue-200",
    amber: "bg-amber-50 text-amber-700 border-amber-200",
    emerald: "bg-emerald-50 text-emerald-700 border-emerald-200",
    red: "bg-red-50 text-red-700 border-red-200",
  };
  return (
    <div className={`p-4 rounded-2xl border ${colours[color]}`}>
      <div className="flex items-center gap-2 mb-1">
        <Icon className="w-4 h-4" />
        <p className="text-xs font-semibold uppercase tracking-wide">{label}</p>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  );
}

/* ─── Overview Tab ─────────────────────────────────────────────────────────── */
function OverviewTab({ categories }: { categories: CategoryBreakdown[] }) {
  if (categories.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <DollarSign className="w-10 h-10 text-gray-300 mx-auto mb-2" />
        <p className="text-sm text-gray-500">No budget data yet. Add allocations and expenses to get started.</p>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Category</th>
            <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Allocated</th>
            <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Spent</th>
            <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Remaining</th>
            <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Utilization</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {categories.map((c) => (
            <tr key={c.category} className="hover:bg-gray-50">
              <td className="px-4 py-3 font-medium text-gray-900">{c.category}</td>
              <td className="px-4 py-3 text-right">{currency(c.allocation)}</td>
              <td className="px-4 py-3 text-right">{currency(c.expense)}</td>
              <td className={`px-4 py-3 text-right font-semibold ${c.remaining < 0 ? "text-red-600" : "text-gray-900"}`}>
                {currency(c.remaining)}
              </td>
              <td className="px-4 py-3 text-right">
                <div className="flex items-center justify-end gap-2">
                  <div className="w-20 bg-gray-200 rounded-full h-2 overflow-hidden">
                    <div
                      className={`h-2 ${c.utilizationPct > 1 ? "bg-red-500" : c.utilizationPct > 0.85 ? "bg-amber-500" : "bg-emerald-500"}`}
                      style={{ width: `${Math.min(100, c.utilizationPct * 100)}%` }}
                    />
                  </div>
                  <span className="text-xs font-semibold text-gray-700 w-10 text-right">
                    {Math.round(c.utilizationPct * 100)}%
                  </span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ─── Items Tab ────────────────────────────────────────────────────────────── */
function ItemsTab({
  items,
  onAdd,
  onEdit,
  onDelete,
}: {
  items: BudgetItem[];
  onAdd: () => void;
  onEdit: (item: BudgetItem) => void;
  onDelete: (id: string) => void;
}) {
  const [orderedIds, setOrderedIds] = useState<string[]>([]);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  useEffect(() => {
    const nextIds = items.map((item) => item.id);
    setOrderedIds((prev) => {
      const kept = prev.filter((id) => nextIds.includes(id));
      const appended = nextIds.filter((id) => !kept.includes(id));
      return [...kept, ...appended];
    });
  }, [items]);

  const displayItems = orderedIds
    .map((id) => items.find((item) => item.id === id))
    .filter((item): item is BudgetItem => Boolean(item));

  return (
    <div>
      <div className="flex justify-between items-center mb-3">
        <p className="text-sm text-gray-500">{items.length} item{items.length !== 1 ? "s" : ""}</p>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setOrderedIds(items.map((item) => item.id))}
            className="inline-flex items-center gap-1.5 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            Reset order
          </button>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add item
          </button>
        </div>
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <p className="text-sm text-gray-500">No items yet. Click "Add item" to record your first allocation or expense.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Date</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Type</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Category</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Vendor</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Amount</th>
                <th className="text-left px-3 py-2 font-semibold text-gray-700">Status</th>
                <th className="text-center px-3 py-2 font-semibold text-gray-700">Receipt</th>
                <th className="text-right px-3 py-2 font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {displayItems.map((item) => (
                <tr
                  key={item.id}
                  draggable
                  onDragStart={() => setDraggingId(item.id)}
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={() => {
                    if (!draggingId || draggingId === item.id) return;
                    const from = orderedIds.indexOf(draggingId);
                    const to = orderedIds.indexOf(item.id);
                    if (from < 0 || to < 0) return;
                    const next = [...orderedIds];
                    const [moved] = next.splice(from, 1);
                    next.splice(to, 0, moved);
                    setOrderedIds(next);
                    setDraggingId(null);
                  }}
                  className="hover:bg-gray-50 cursor-move"
                >
                  <td className="px-3 py-2 text-gray-600 text-xs whitespace-nowrap">
                    {new Date(item.incurredAt).toLocaleDateString("en-CA")}
                  </td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      item.itemType === "allocation" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"
                    }`}>
                      {item.itemType}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-gray-900">{item.category}</td>
                  <td className="px-3 py-2 text-gray-600 text-xs">{item.vendor ?? "—"}</td>
                  <td className="px-3 py-2 text-right font-semibold">{currency(item.amount)}</td>
                  <td className="px-3 py-2">
                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${STATUS_COLOURS[item.status]}`}>
                      {item.status}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-center">
                    {item.receiptUrl ? (
                      <a
                        href={item.receiptUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex text-blue-600 hover:text-blue-800"
                        aria-label="View receipt"
                      >
                        <Paperclip className="w-4 h-4" />
                      </a>
                    ) : (
                      <span className="text-gray-300">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right">
                    <button
                      onClick={() => onEdit(item)}
                      aria-label="Edit"
                      className="p-1 rounded hover:bg-gray-200 text-gray-500 hover:text-gray-900 mr-1"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => onDelete(item.id)}
                      aria-label="Delete"
                      className="p-1 rounded hover:bg-red-100 text-gray-500 hover:text-red-600"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Rules Tab ────────────────────────────────────────────────────────────── */
function RulesTab({
  rules,
  templates,
  onAdd,
  onDelete,
  onApplyTemplate,
}: {
  rules: BudgetRule[];
  templates: Template[];
  onAdd: () => void;
  onDelete: (id: string) => void;
  onApplyTemplate: (id: string) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Rules section */}
      <div>
        <div className="flex justify-between items-center mb-3">
          <div>
            <h3 className="font-semibold text-gray-900">
              Budget Rules <FieldHelp content="Rules define how your total budget should be distributed by category. The Suggestions tab uses these rules to recommend allocations." />
            </h3>
            <p className="text-xs text-gray-500">{rules.length} active rule{rules.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={onAdd}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-3 py-1.5 rounded-lg"
          >
            <Plus className="w-4 h-4" /> Add rule
          </button>
        </div>

        {rules.length === 0 ? (
          <div className="bg-white rounded-2xl border border-gray-200 p-8 text-center">
            <Settings2 className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500 mb-1">No rules yet.</p>
            <p className="text-xs text-gray-400">Apply a template below or add your own rules to drive budget suggestions.</p>
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Priority</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Category</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Target</th>
                  <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Notes</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Warn At</th>
                  <th className="text-right px-4 py-2.5 font-semibold text-gray-700"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {rules.map((r) => (
                  <tr key={r.id}>
                    <td className="px-4 py-2.5 text-gray-600">{r.priority}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{r.category}</td>
                    <td className="px-4 py-2.5 text-right font-semibold">
                      {r.percentOfTotal !== null
                        ? `${Math.round(r.percentOfTotal * 100)}%`
                        : r.fixedAmount !== null
                        ? currency(r.fixedAmount)
                        : "—"}
                    </td>
                    <td className="px-4 py-2.5 text-xs text-gray-600 max-w-xs truncate">{r.notes ?? "—"}</td>
                    <td className="px-4 py-2.5 text-right text-xs text-amber-600">
                      {Math.round(r.warnAtPercent * 100)}%
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => onDelete(r.id)}
                        aria-label="Delete rule"
                        className="p-1 rounded hover:bg-red-100 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Templates section */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">
          Quick-Start Templates <FieldHelp content="Apply a preset distribution based on your campaign type. You can customise individual rules after applying." />
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-2xl border border-gray-200 p-4 hover:border-blue-400 transition-colors">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 text-sm">{t.name}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {currency(t.suggestedTotalRange[0])} – {currency(t.suggestedTotalRange[1])}
                  </p>
                </div>
                <button
                  onClick={() => onApplyTemplate(t.id)}
                  className="flex-shrink-0 text-xs font-semibold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-lg"
                >
                  Apply
                </button>
              </div>
              <p className="text-xs text-gray-600 mb-2">{t.description}</p>
              <div className="flex flex-wrap gap-1">
                {t.items.slice(0, 5).map((item) => (
                  <span key={item.category} className="text-[10px] bg-gray-100 text-gray-700 px-1.5 py-0.5 rounded">
                    {item.category} {Math.round(item.percentOfTotal * 100)}%
                  </span>
                ))}
                {t.items.length > 5 && (
                  <span className="text-[10px] text-gray-400">+{t.items.length - 5} more</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ─── Suggestions Tab ──────────────────────────────────────────────────────── */
function SuggestionsTab({
  suggestions,
  total,
  onChangeTotal,
  onReload,
  hasRules,
}: {
  suggestions: Suggestion[];
  total: number;
  onChangeTotal: (n: number) => void;
  onReload: () => void;
  hasRules: boolean;
}) {
  return (
    <div className="space-y-4">
      <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl p-4">
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">Smart Suggestions</h3>
          <FieldHelp content="Enter your total campaign budget and Poll City will suggest how to distribute it across categories based on your rules or our template for your campaign type." />
        </div>
        <p className="text-sm text-gray-600 mb-3">
          {hasRules
            ? "Using your custom rules."
            : "No rules set — using recommended template. Apply a template on the Rules tab for custom distributions."}
        </p>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <label className="text-sm font-medium text-gray-700 whitespace-nowrap">Total budget:</label>
          <input
            type="number"
            value={total}
            onChange={(e) => onChangeTotal(Number(e.target.value))}
            onBlur={onReload}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            min={0}
            step={1000}
          />
          <button
            onClick={onReload}
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Recalculate
          </button>
        </div>
      </div>

      {suggestions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <Sparkles className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No suggestions yet. Set a total budget above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">#</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Category</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Suggested</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Current</th>
                <th className="text-right px-4 py-2.5 font-semibold text-gray-700">Δ Delta</th>
                <th className="text-left px-4 py-2.5 font-semibold text-gray-700">Notes / Warning</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {suggestions.map((s) => (
                <tr key={s.category} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-gray-600">{s.priority}</td>
                  <td className="px-4 py-3 font-medium text-gray-900">{s.category}</td>
                  <td className="px-4 py-3 text-right font-semibold text-blue-700">{currency(s.suggestedAmount)}</td>
                  <td className="px-4 py-3 text-right text-gray-700">{currency(s.currentAllocation)}</td>
                  <td className={`px-4 py-3 text-right font-semibold ${s.delta > 0 ? "text-emerald-600" : s.delta < 0 ? "text-red-600" : "text-gray-500"}`}>
                    {s.delta > 0 ? "+" : ""}{currency(s.delta)}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {s.warning && (
                      <p className="text-red-600 font-semibold mb-0.5 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> {s.warning}
                      </p>
                    )}
                    <p className="text-gray-600">{s.notes}</p>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/* ─── Import/Export Tab ────────────────────────────────────────────────────── */
function ImportExportTab({
  campaignId,
  onExport,
  onImported,
}: {
  campaignId: string;
  onExport: () => void;
  onImported: () => void;
}) {
  const [csvText, setCsvText] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [filePreviewRows, setFilePreviewRows] = useState<Record<string, string>[]>([]);
  const [filePreviewColumns, setFilePreviewColumns] = useState<string[]>([]);
  const [fileTotalRows, setFileTotalRows] = useState(0);
  const [foundRequiredColumns, setFoundRequiredColumns] = useState<string[]>([]);
  const [missingRequiredColumns, setMissingRequiredColumns] = useState<string[]>([]);
  const [previewSource, setPreviewSource] = useState<"csv" | "excel" | null>(null);
  const [preview, setPreview] = useState<{
    totalRows: number;
    validCount: number;
    errorCount: number;
    errors: Array<{ row: number; message: string }>;
  } | null>(null);
  const [importing, setImporting] = useState(false);

  const requiredColumns = ["Type", "Category", "Amount"];

  function normalizeKey(key: string): string {
    return key.trim().toLowerCase();
  }

  function computeRequiredColumns(columns: string[]) {
    const normalized = new Set(columns.map(normalizeKey));
    const found = requiredColumns.filter((c) => normalized.has(normalizeKey(c)));
    const missing = requiredColumns.filter((c) => !normalized.has(normalizeKey(c)));
    setFoundRequiredColumns(found);
    setMissingRequiredColumns(missing);
  }

  function normalizePreviewRows(rows: Record<string, unknown>[]): Record<string, string>[] {
    return rows.map((row) =>
      Object.fromEntries(
        Object.entries(row).map(([key, value]) => [key, value === null || value === undefined ? "" : String(value)])
      )
    );
  }

  async function parseFilePreview(file: File) {
    const lower = file.name.toLowerCase();
    const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");

    if (isExcel) {
      toast.info("Excel file detected — parsing as spreadsheet");
      const arrayBuffer = await file.arrayBuffer();
      const workbook = XLSX.read(arrayBuffer, { type: "array" });
      const firstSheet = workbook.SheetNames[0];
      if (!firstSheet) throw new Error("Excel file contains no sheets");
      const sheet = workbook.Sheets[firstSheet];
      const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
      const normalizedRows = normalizePreviewRows(rows);
      const columns = Array.from(new Set(normalizedRows.flatMap((row) => Object.keys(row))));

      setPreviewSource("excel");
      setFileTotalRows(normalizedRows.length);
      setFilePreviewColumns(columns);
      setFilePreviewRows(normalizedRows.slice(0, 5));
      computeRequiredColumns(columns);
      return;
    }

    const text = await file.text();
    const parseResult = Papa.parse<Record<string, string>>(text, { header: true, skipEmptyLines: true });
    if (parseResult.errors.length > 0) {
      throw new Error(parseResult.errors[0]?.message || "CSV parse failed");
    }

    const rows = parseResult.data;
    const columns = Array.from(new Set(rows.flatMap((row) => Object.keys(row))));
    setPreviewSource("csv");
    setCsvText(text);
    setFileTotalRows(rows.length);
    setFilePreviewColumns(columns);
    setFilePreviewRows(rows.slice(0, 5));
    computeRequiredColumns(columns);
  }

  async function runDryRunWithFile(file: File) {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.set("campaignId", campaignId);
      formData.set("dryRun", "true");
      formData.set("file", file);

      const res = await fetch("/api/budget/import", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Import preview failed");
      setPreview(data.data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function runDryRun() {
    if (!csvText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch("/api/budget/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, csv: csvText, dryRun: true }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data.data);
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function runImport() {
    if (!selectedFile && !csvText.trim()) return;
    setImporting(true);
    try {
      const res = selectedFile
        ? await fetch("/api/budget/import", {
            method: "POST",
            body: (() => {
              const formData = new FormData();
              formData.set("campaignId", campaignId);
              formData.set("dryRun", "false");
              formData.set("file", selectedFile);
              return formData;
            })(),
          })
        : await fetch("/api/budget/import", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ campaignId, csv: csvText, dryRun: false }),
          });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success(`Imported ${data.data.imported} items`);
      setCsvText("");
      setSelectedFile(null);
      setFilePreviewRows([]);
      setFilePreviewColumns([]);
      setFileTotalRows(0);
      setFoundRequiredColumns([]);
      setMissingRequiredColumns([]);
      setPreviewSource(null);
      setPreview(null);
      onImported();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setImporting(false);
    }
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setSelectedFile(file);
    setPreview(null);
    setCsvText("");
    try {
      await parseFilePreview(file);
      await runDryRunWithFile(file);
    } catch (e) {
      const lower = file.name.toLowerCase();
      const isExcel = lower.endsWith(".xlsx") || lower.endsWith(".xls");
      if (isExcel) {
        toast.info("Excel file detected — parsing as spreadsheet");
      }
      toast.error((e as Error).message || "File parse failed");
    }
  }

  return (
    <div className="space-y-4">
      {/* Export card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 flex-1">
            <Download className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-gray-900">Export budget to CSV</h3>
              <p className="text-sm text-gray-500">
                Download all budget items with vendor, receipts, tags, and status. Great for audit or migrations.
              </p>
            </div>
          </div>
          <button
            onClick={onExport}
            className="flex-shrink-0 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            Download
          </button>
        </div>
      </div>

      {/* Import card */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">
        <div className="flex items-start gap-3 mb-4">
          <Upload className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
          <div>
            <h3 className="font-semibold text-gray-900">Import budget from CSV or Excel</h3>
            <p className="text-sm text-gray-500">
              Required columns: <code className="text-xs bg-gray-100 px-1 rounded">Type</code>,{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">Category</code>,{" "}
              <code className="text-xs bg-gray-100 px-1 rounded">Amount</code>. Optional:{" "}
              Status, Vendor, Payment Method, Receipt Number, Receipt URL, Description, Tags, Incurred Date, Paid Date.
            </p>
          </div>
        </div>

        <input
          type="file"
          accept=".csv,.xlsx,.xls"
          onChange={handleFile}
          className="mb-3 text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-50 file:text-blue-700 file:font-semibold hover:file:bg-blue-100"
        />

        {previewSource === "excel" && fileTotalRows > 0 && (
          <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 px-3 py-2 text-sm text-blue-800">
            Excel file detected — {fileTotalRows} rows found
          </div>
        )}

        {filePreviewColumns.length > 0 && (
          <div className="mb-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2">
              <p className="font-semibold text-emerald-800">Required columns found</p>
              <p className="text-emerald-700 mt-1">{foundRequiredColumns.length ? foundRequiredColumns.join(", ") : "None"}</p>
            </div>
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="font-semibold text-red-800">Missing required columns</p>
              <p className="text-red-700 mt-1">{missingRequiredColumns.length ? missingRequiredColumns.join(", ") : "None"}</p>
            </div>
          </div>
        )}

        {filePreviewRows.length > 0 && filePreviewColumns.length > 0 && (
          <div className="mb-3 overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full text-xs">
              <thead className="bg-gray-50">
                <tr>
                  {filePreviewColumns.map((col) => (
                    <th key={col} className="px-3 py-2 text-left font-semibold text-gray-700 whitespace-nowrap">{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {filePreviewRows.map((row, idx) => (
                  <tr key={`preview-row-${idx}`}>
                    {filePreviewColumns.map((col) => (
                      <td key={`${idx}-${col}`} className="px-3 py-2 text-gray-700 whitespace-nowrap">{row[col] ?? ""}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {csvText && (
          <>
            <textarea
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full h-32 p-3 border border-gray-300 rounded-lg text-xs font-mono focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Paste CSV content here..."
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={runDryRun}
                disabled={importing}
                className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Preview (dry run)
              </button>
              <button
                onClick={runImport}
                disabled={importing || !preview || preview.validCount === 0 || missingRequiredColumns.length > 0}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
              >
                Import {(preview?.validCount ?? fileTotalRows) || 0} items
              </button>
            </div>
          </>
        )}

        {!csvText && selectedFile && (
          <div className="flex gap-2 mt-3">
            <button
              onClick={() => selectedFile && void runDryRunWithFile(selectedFile)}
              disabled={importing}
              className="bg-gray-100 hover:bg-gray-200 text-gray-900 text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Preview (dry run)
            </button>
            <button
              onClick={runImport}
              disabled={importing || !preview || preview.validCount === 0 || missingRequiredColumns.length > 0}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-50"
            >
              Import {(preview?.validCount ?? fileTotalRows) || 0} items
            </button>
          </div>
        )}

        {preview && (
          <div className="mt-4 p-3 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-3 gap-2 mb-2">
              <div>
                <p className="text-xs text-gray-500">Total rows</p>
                <p className="font-semibold">{preview.totalRows}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Valid</p>
                <p className="font-semibold text-emerald-600">{preview.validCount}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Errors</p>
                <p className={`font-semibold ${preview.errorCount > 0 ? "text-red-600" : "text-gray-400"}`}>
                  {preview.errorCount}
                </p>
              </div>
            </div>
            {preview.errors.length > 0 && (
              <div className="max-h-40 overflow-y-auto text-xs">
                {preview.errors.map((e, i) => (
                  <p key={i} className="text-red-600">
                    Row {e.row}: {e.message}
                  </p>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Item Modal ───────────────────────────────────────────────────────────── */
function ItemModal({
  campaignId,
  item,
  onClose,
  onSaved,
}: {
  campaignId: string;
  item: BudgetItem | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    itemType: item?.itemType ?? ("expense" as ItemType),
    category: item?.category ?? "",
    amount: item?.amount ?? 0,
    description: item?.description ?? "",
    vendor: item?.vendor ?? "",
    paymentMethod: item?.paymentMethod ?? "",
    receiptUrl: item?.receiptUrl ?? "",
    receiptNumber: item?.receiptNumber ?? "",
    status: (item?.status ?? "approved") as ItemStatus,
    tags: item?.tags ?? [],
    incurredAt: item?.incurredAt?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [tagInput, setTagInput] = useState("");

  async function save() {
    if (!form.category.trim() || form.amount <= 0) {
      toast.error("Category and positive amount required");
      return;
    }
    setSaving(true);
    try {
      const url = item ? `/api/budget/${item.id}` : "/api/budget";
      const method = item ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item ? form : { ...form, campaignId }),
      });
      if (!res.ok) throw new Error();
      toast.success(item ? "Updated" : "Created");
      onSaved();
      onClose();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  function addTag() {
    const t = tagInput.trim();
    if (!t || form.tags.includes(t)) return;
    setForm({ ...form, tags: [...form.tags, t] });
    setTagInput("");
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">{item ? "Edit" : "Add"} budget item</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <Field label="Type">
            <select
              value={form.itemType}
              onChange={(e) => setForm({ ...form, itemType: e.target.value as ItemType })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="allocation">Allocation</option>
              <option value="expense">Expense</option>
            </select>
          </Field>
          <Field label="Status">
            <select
              value={form.status}
              onChange={(e) => setForm({ ...form, status: e.target.value as ItemStatus })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="paid">Paid</option>
              <option value="rejected">Rejected</option>
              <option value="reconciled">Reconciled</option>
            </select>
          </Field>
          <Field label="Category" required help="e.g. Signs, Print, Events, Digital Ads">
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Signs"
            />
          </Field>
          <Field label="Amount (CAD)" required>
            <input
              type="number"
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              min={0}
              step="0.01"
            />
          </Field>
          <Field label="Vendor" help="Who was paid / where the allocation came from">
            <input
              value={form.vendor}
              onChange={(e) => setForm({ ...form, vendor: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="SignShop Inc."
            />
          </Field>
          <Field label="Payment method">
            <select
              value={form.paymentMethod}
              onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            >
              <option value="">—</option>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="credit">Credit Card</option>
              <option value="e-transfer">E-Transfer</option>
              <option value="invoice">Invoice</option>
            </select>
          </Field>
          <Field label="Incurred date" required>
            <input
              type="date"
              value={form.incurredAt}
              onChange={(e) => setForm({ ...form, incurredAt: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
          </Field>
          <Field label="Receipt number">
            <input
              value={form.receiptNumber}
              onChange={(e) => setForm({ ...form, receiptNumber: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="INV-2026-0042"
            />
          </Field>
          <Field label="Receipt URL" help="Link to uploaded receipt file (PDF or image)">
            <input
              value={form.receiptUrl}
              onChange={(e) => setForm({ ...form, receiptUrl: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="https://..."
            />
          </Field>
          <div className="md:col-span-2">
            <Field label="Description">
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-20"
              />
            </Field>
          </div>
          <div className="md:col-span-2">
            <Field label="Tags" help="Press Enter to add. Used for grouping and filtering.">
              <div className="flex flex-wrap gap-1 mb-2">
                {form.tags.map((t) => (
                  <span key={t} className="inline-flex items-center gap-1 text-xs bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full">
                    <TagIcon className="w-3 h-3" />
                    {t}
                    <button
                      onClick={() => setForm({ ...form, tags: form.tags.filter((x) => x !== t) })}
                      aria-label="Remove tag"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addTag();
                  }
                }}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                placeholder="gotv, q4..."
              />
            </Field>
          </div>
        </div>

        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            <Check className="w-4 h-4" /> {saving ? "Saving..." : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Rule Modal ───────────────────────────────────────────────────────────── */
function RuleModal({
  campaignId,
  onClose,
  onSaved,
}: {
  campaignId: string;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [form, setForm] = useState({
    category: "",
    targetType: "percent" as "percent" | "fixed",
    percentOfTotal: 10,
    fixedAmount: 5000,
    priority: 1,
    warnAtPercent: 85,
    notes: "",
  });
  const [saving, setSaving] = useState(false);

  async function save() {
    if (!form.category.trim()) {
      toast.error("Category required");
      return;
    }
    setSaving(true);
    try {
      const body = {
        campaignId,
        category: form.category.trim(),
        percentOfTotal: form.targetType === "percent" ? form.percentOfTotal / 100 : null,
        fixedAmount: form.targetType === "fixed" ? form.fixedAmount : null,
        priority: form.priority,
        warnAtPercent: form.warnAtPercent / 100,
        notes: form.notes.trim() || null,
        isActive: true,
      };
      const res = await fetch("/api/budget/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error();
      toast.success("Rule created");
      onSaved();
      onClose();
    } catch {
      toast.error("Save failed");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-md w-full shadow-2xl p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-bold text-gray-900">Add budget rule</h3>
          <button onClick={onClose} aria-label="Close" className="p-1 rounded hover:bg-gray-100">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-3">
          <Field label="Category" required>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Signs & Print"
            />
          </Field>

          <div className="grid grid-cols-2 gap-2">
            <label className={`p-3 border rounded-lg cursor-pointer text-center ${form.targetType === "percent" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
              <input
                type="radio"
                checked={form.targetType === "percent"}
                onChange={() => setForm({ ...form, targetType: "percent" })}
                className="sr-only"
              />
              <p className="text-sm font-semibold">% of total</p>
              <p className="text-xs text-gray-500">Scales with budget</p>
            </label>
            <label className={`p-3 border rounded-lg cursor-pointer text-center ${form.targetType === "fixed" ? "border-blue-500 bg-blue-50" : "border-gray-200"}`}>
              <input
                type="radio"
                checked={form.targetType === "fixed"}
                onChange={() => setForm({ ...form, targetType: "fixed" })}
                className="sr-only"
              />
              <p className="text-sm font-semibold">Fixed $</p>
              <p className="text-xs text-gray-500">Exact amount</p>
            </label>
          </div>

          {form.targetType === "percent" ? (
            <Field label={`Percent of total: ${form.percentOfTotal}%`}>
              <input
                type="range"
                min={1}
                max={100}
                value={form.percentOfTotal}
                onChange={(e) => setForm({ ...form, percentOfTotal: Number(e.target.value) })}
                className="w-full"
              />
            </Field>
          ) : (
            <Field label="Fixed amount (CAD)">
              <input
                type="number"
                value={form.fixedAmount}
                onChange={(e) => setForm({ ...form, fixedAmount: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                min={0}
              />
            </Field>
          )}

          <Field label="Priority (1 = highest)" help="Lower priority rules get funded first if budget is constrained.">
            <input
              type="number"
              value={form.priority}
              onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              min={1}
              max={10}
            />
          </Field>

          <Field label={`Warn at: ${form.warnAtPercent}% utilization`}>
            <input
              type="range"
              min={50}
              max={100}
              value={form.warnAtPercent}
              onChange={(e) => setForm({ ...form, warnAtPercent: Number(e.target.value) })}
              className="w-full"
            />
          </Field>

          <Field label="Notes">
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm h-16"
              placeholder="Why this category matters..."
            />
          </Field>
        </div>

        <div className="flex gap-2 justify-end mt-5 pt-4 border-t border-gray-100">
          <button onClick={onClose} className="px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-100 rounded-lg">
            Cancel
          </button>
          <button
            onClick={save}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white text-sm font-semibold px-4 py-2 rounded-lg"
          >
            {saving ? "Saving..." : "Save rule"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  required,
  help,
  children,
}: {
  label: string;
  required?: boolean;
  help?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="flex items-center gap-1 text-xs font-semibold text-gray-700 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
        {help && <FieldHelp content={help} />}
      </label>
      {children}
    </div>
  );
}
