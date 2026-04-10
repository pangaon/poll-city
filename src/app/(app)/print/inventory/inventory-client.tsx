"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, AlertTriangle, ArrowRight, CheckCircle2,
  Boxes, RotateCcw, Trash2, Edit2, BarChart3, X, ChevronRight,
  ShoppingBag, Loader2,
} from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "sonner";
import { PrintProductType } from "@prisma/client";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

interface InventoryItem {
  id: string;
  sku: string;
  productType: PrintProductType;
  description: string | null;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  depletedQty: number;
  wastedQty: number;
  location: string;
  reorderThreshold: number | null;
  notes: string | null;
  receivedAt: string | null;
}

interface Summary {
  skuCount: number;
  totalItems: number;
  availableItems: number;
  reservedItems: number;
  depletedItems: number;
  reorderAlerts: number;
}

const PRODUCT_LABELS: Record<string, string> = {
  flyer: "Flyers",
  door_hanger: "Door Hangers",
  lawn_sign: "Lawn Signs",
  palm_card: "Palm Cards",
  mailer_postcard: "Postcards",
  banner: "Banners",
  button_pin: "Buttons",
  window_sign: "Window Signs",
  bumper_sticker: "Bumper Stickers",
  t_shirt: "T-Shirts",
  hat: "Hats",
  tote_bag: "Tote Bags",
  yard_stake: "Yard Stakes",
  table_cover: "Table Covers",
  lanyard: "Lanyards",
};

const LOCATION_LABELS: Record<string, string> = {
  hq: "HQ",
  storage: "Storage",
  event: "Event",
  in_field: "In Field",
};

function stockStatus(item: InventoryItem): "ok" | "low" | "critical" | "empty" {
  if (item.availableQty === 0) return "empty";
  if (item.reorderThreshold && item.availableQty <= item.reorderThreshold) return "low";
  if (item.availableQty < 20) return "critical";
  return "ok";
}

const STATUS_COLORS = {
  ok: "text-[#1D9E75] bg-emerald-50",
  low: "text-[#EF9F27] bg-amber-50",
  critical: "text-[#E24B4A] bg-red-50",
  empty: "text-gray-400 bg-gray-100",
};

const STATUS_DOT = {
  ok: "bg-[#1D9E75]",
  low: "bg-[#EF9F27]",
  critical: "bg-[#E24B4A]",
  empty: "bg-gray-300",
};

// ── Receive Modal ────────────────────────────────────────────────────────────

function ReceiveModal({ campaignId, onClose, onCreated }: {
  campaignId: string;
  onClose: () => void;
  onCreated: () => void;
}) {
  const [form, setForm] = useState({
    productType: "flyer" as PrintProductType,
    description: "",
    totalQty: 500,
    location: "hq",
    reorderThreshold: "",
    notes: "",
  });
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/print/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          productType: form.productType,
          description: form.description || undefined,
          totalQty: form.totalQty,
          location: form.location,
          reorderThreshold: form.reorderThreshold ? parseInt(form.reorderThreshold) : undefined,
          notes: form.notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`${PRODUCT_LABELS[form.productType]} received — ${form.totalQty} units in inventory`);
      onCreated();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to receive inventory");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={SPRING}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <h2 className="font-bold text-[#0A2342] text-lg">Receive Inventory</h2>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Product Type</label>
            <select
              value={form.productType}
              onChange={(e) => setForm((f) => ({ ...f, productType: e.target.value as PrintProductType }))}
              className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
            >
              {Object.entries(PRODUCT_LABELS).map(([val, label]) => (
                <option key={val} value={val}>{label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Description</label>
            <input
              type="text"
              placeholder="e.g. 8.5x11 Fall 2026 flyer"
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Quantity Received</label>
              <input
                type="number"
                inputMode="numeric"
                min={1}
                value={form.totalQty}
                onChange={(e) => setForm((f) => ({ ...f, totalQty: Math.max(1, parseInt(e.target.value) || 1) }))}
                className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
              />
            </div>
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">Location</label>
              <select
                value={form.location}
                onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))}
                className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
              >
                {Object.entries(LOCATION_LABELS).map(([val, label]) => (
                  <option key={val} value={val}>{label}</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">
              Reorder Alert Threshold <span className="font-normal text-gray-400">(optional)</span>
            </label>
            <input
              type="number"
              inputMode="numeric"
              placeholder="e.g. 200"
              value={form.reorderThreshold}
              onChange={(e) => setForm((f) => ({ ...f, reorderThreshold: e.target.value }))}
              className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
            />
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Notes</label>
            <input
              type="text"
              placeholder="Supplier, batch number, notes…"
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
              className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
            />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 h-12">Cancel</Button>
          <Button onClick={submit} disabled={loading} className="flex-1 h-12 bg-[#1D9E75] hover:bg-[#178a65] text-white font-bold">
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Receive Inventory"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Quick Action Modal (assign / deplete) ────────────────────────────────────

function ActionModal({ item, action, campaignId, onClose, onDone }: {
  item: InventoryItem;
  action: "assign" | "deplete" | "return";
  campaignId: string;
  onClose: () => void;
  onDone: () => void;
}) {
  const [qty, setQty] = useState(10);
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);

  const maxQty = action === "assign" || action === "deplete"
    ? item.availableQty + (action === "deplete" ? item.reservedQty : 0)
    : item.reservedQty;

  const submit = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/print/inventory/${item.id}/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, qty, notes: notes || undefined }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      toast.success(`${qty} units ${action === "assign" ? "assigned" : action === "deplete" ? "marked as used" : "returned"}`);
      onDone();
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed");
    } finally {
      setLoading(false);
    }
  };

  const titles = { assign: "Assign Inventory", deplete: "Mark as Used", return: "Return to Stock" };
  const btnLabels = { assign: "Assign", deplete: "Mark Used", return: "Return" };
  const btnColors = {
    assign: "bg-[#0A2342] hover:bg-[#0d2d57] text-white",
    deplete: "bg-[#EF9F27] hover:bg-[#d88e20] text-white",
    return: "bg-[#1D9E75] hover:bg-[#178a65] text-white",
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={SPRING}
        className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <h2 className="font-bold text-[#0A2342]">{titles[action]}</h2>
            <p className="text-xs text-gray-500 mt-0.5">{PRODUCT_LABELS[item.productType]} — {item.sku}</p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Quantity</label>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={maxQty}
              value={qty}
              onChange={(e) => setQty(Math.min(maxQty, Math.max(1, parseInt(e.target.value) || 1)))}
              className="w-full h-12 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none tabular-nums"
            />
            <p className="text-xs text-gray-500 mt-1">
              {action === "return" ? `${item.reservedQty} reserved` : `${item.availableQty} available`}
            </p>
          </div>
          <div>
            <label className="text-sm font-semibold text-gray-700 block mb-1">Notes</label>
            <input
              type="text"
              placeholder="Who is receiving these? For which operation?"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
            />
          </div>
        </div>
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <Button variant="outline" onClick={onClose} className="flex-1 h-11">Cancel</Button>
          <button
            onClick={submit}
            disabled={loading || qty > maxQty}
            className={`flex-1 h-11 rounded-lg font-bold flex items-center justify-center gap-2 transition-colors ${btnColors[action]} disabled:opacity-50`}
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : btnLabels[action]}
          </button>
        </div>
      </motion.div>
    </div>
  );
}

// ── Inventory Card ────────────────────────────────────────────────────────────

function InventoryCard({
  item,
  idx,
  onAction,
}: {
  item: InventoryItem;
  idx: number;
  onAction: (item: InventoryItem, action: "assign" | "deplete" | "return") => void;
}) {
  const status = stockStatus(item);
  const pct = item.totalQty > 0 ? Math.round((item.availableQty / item.totalQty) * 100) : 0;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, ...SPRING }}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${STATUS_DOT[status]}`} />
          <div className="min-w-0">
            <p className="font-bold text-[#0A2342] text-sm truncate">{PRODUCT_LABELS[item.productType]}</p>
            {item.description && (
              <p className="text-xs text-gray-500 truncate">{item.description}</p>
            )}
          </div>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${STATUS_COLORS[status]}`}>
          {LOCATION_LABELS[item.location]}
        </span>
      </div>

      {/* Qty breakdown */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="text-center">
          <p className="text-lg font-extrabold text-[#0A2342] tabular-nums">{item.availableQty.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Available</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-[#EF9F27] tabular-nums">{item.reservedQty.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Reserved</p>
        </div>
        <div className="text-center">
          <p className="text-lg font-extrabold text-gray-400 tabular-nums">{item.depletedQty.toLocaleString()}</p>
          <p className="text-[10px] text-gray-500 uppercase tracking-wide">Used</p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-100 rounded-full mb-3 overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ delay: idx * 0.04 + 0.2, duration: 0.5 }}
          className={`h-full rounded-full ${status === "ok" ? "bg-[#1D9E75]" : status === "low" ? "bg-[#EF9F27]" : "bg-[#E24B4A]"}`}
        />
      </div>

      {status === "low" && item.reorderThreshold && (
        <p className="text-xs text-[#EF9F27] font-semibold mb-3 flex items-center gap-1">
          <AlertTriangle className="w-3.5 h-3.5" />
          Below reorder threshold ({item.reorderThreshold.toLocaleString()})
        </p>
      )}

      {/* Actions */}
      <div className="flex gap-2">
        <button
          onClick={() => onAction(item, "assign")}
          disabled={item.availableQty === 0}
          className="flex-1 h-9 text-xs font-semibold rounded-lg border border-[#0A2342] text-[#0A2342] hover:bg-[#0A2342]/5 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Assign
        </button>
        <button
          onClick={() => onAction(item, "deplete")}
          disabled={item.availableQty === 0 && item.reservedQty === 0}
          className="flex-1 h-9 text-xs font-semibold rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Use
        </button>
        {item.reservedQty > 0 && (
          <button
            onClick={() => onAction(item, "return")}
            className="h-9 px-3 text-xs font-semibold rounded-lg border border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/5 transition-colors"
          >
            Return
          </button>
        )}
      </div>
    </motion.div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function InventoryClient({ campaignId }: { campaignId: string }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReceive, setShowReceive] = useState(false);
  const [actionTarget, setActionTarget] = useState<{ item: InventoryItem; action: "assign" | "deplete" | "return" } | null>(null);
  const [filter, setFilter] = useState<string>("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/print/inventory?campaignId=${campaignId}`);
      const data = await res.json();
      setItems(data.data ?? []);
      setSummary(data.summary ?? null);
    } catch {
      toast.error("Failed to load inventory");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const filtered = filter === "all"
    ? items
    : filter === "low"
    ? items.filter((i) => stockStatus(i) === "low" || stockStatus(i) === "critical" || stockStatus(i) === "empty")
    : items.filter((i) => i.location === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A2342]">Print Inventory</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track all printed campaign materials</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => setShowReceive(true)}
            className="bg-[#1D9E75] hover:bg-[#178a65] text-white font-bold h-11 px-4 gap-2"
          >
            <Plus className="w-4 h-4" /> Receive
          </Button>
        </motion.div>
      </div>

      {/* Summary tiles */}
      {summary && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Available", value: summary.availableItems, color: "text-[#1D9E75]" },
            { label: "Reserved", value: summary.reservedItems, color: "text-[#EF9F27]" },
            { label: "Used", value: summary.depletedItems, color: "text-gray-500" },
            { label: "⚠ Reorder Alerts", value: summary.reorderAlerts, color: "text-[#E24B4A]" },
          ].map(({ label, value, color }) => (
            <div key={label} className="bg-white rounded-xl border border-gray-200 p-3 text-center">
              <p className={`text-2xl font-extrabold tabular-nums ${color}`}>{value.toLocaleString()}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { id: "all", label: "All" },
          { id: "low", label: "⚠ Low Stock" },
          { id: "hq", label: "HQ" },
          { id: "storage", label: "Storage" },
          { id: "in_field", label: "In Field" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id)}
            className={`h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === id
                ? "bg-[#0A2342] text-white"
                : "border border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#1D9E75] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Boxes className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-bold text-[#0A2342] text-lg">No inventory yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Add inventory when materials arrive from your print shop.
          </p>
          <Button
            onClick={() => setShowReceive(true)}
            className="bg-[#1D9E75] hover:bg-[#178a65] text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Receive First Batch
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((item, idx) => (
            <InventoryCard
              key={item.id}
              item={item}
              idx={idx}
              onAction={(item, action) => setActionTarget({ item, action })}
            />
          ))}
        </div>
      )}

      {/* Quick link to packs */}
      <div className="mt-8">
        <a
          href="/print/packs"
          className="flex items-center justify-between p-4 bg-white rounded-xl border border-gray-200 hover:shadow-sm transition-shadow group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#0A2342]/8 flex items-center justify-center">
              <Package className="w-5 h-5 text-[#0A2342]" />
            </div>
            <div>
              <p className="font-bold text-[#0A2342] text-sm">Print Packs</p>
              <p className="text-xs text-gray-500">Auto-generate walk kits and sign kits</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-gray-400 group-hover:translate-x-1 transition-transform" />
        </a>
      </div>

      {/* Modals */}
      <AnimatePresence>
        {showReceive && (
          <ReceiveModal
            campaignId={campaignId}
            onClose={() => setShowReceive(false)}
            onCreated={load}
          />
        )}
        {actionTarget && (
          <ActionModal
            item={actionTarget.item}
            action={actionTarget.action}
            campaignId={campaignId}
            onClose={() => setActionTarget(null)}
            onDone={load}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
