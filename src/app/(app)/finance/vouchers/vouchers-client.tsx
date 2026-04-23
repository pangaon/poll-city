"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Ticket, Plus, X, ChevronRight, AlertCircle, CheckCircle2,
  Clock, Ban, Loader2, RefreshCw, User, Wallet, Receipt,
  DollarSign, Filter,
} from "lucide-react";
import FinanceNav from "../finance-nav";

// ── Types ─────────────────────────────────────────────────────────────────────

type VoucherStatus = "draft" | "active" | "partially_redeemed" | "fully_redeemed" | "expired" | "cancelled";
type VoucherType = "gas" | "food" | "event_supplies" | "print" | "general" | "accommodation";

interface VoucherRow {
  id: string;
  code: string | null;
  type: VoucherType;
  description: string | null;
  maxAmount: string;
  redeemedAmount: string;
  remainingAmount: string;
  currency: string;
  status: VoucherStatus;
  expiresAt: string | null;
  createdAt: string;
  assignedUser: { id: string; name: string } | null;
  issuedBy: { id: string; name: string } | null;
  fundingSource: { id: string; name: string; type: string } | null;
  _count: { redemptions: number };
}

interface VoucherRedemption {
  id: string;
  amount: string;
  merchant: string | null;
  notes: string | null;
  receiptUrl: string | null;
  createdAt: string;
  redeemedBy: { id: string; name: string };
}

interface VoucherDetail extends VoucherRow {
  redemptions: VoucherRedemption[];
}

// ── Config ─────────────────────────────────────────────────────────────────────

const TYPE_META: Record<VoucherType, { label: string; color: string }> = {
  gas:            { label: "Gas",           color: "bg-blue-100 text-blue-700" },
  food:           { label: "Food",          color: "bg-orange-100 text-orange-700" },
  event_supplies: { label: "Event Supplies",color: "bg-purple-100 text-purple-700" },
  print:          { label: "Print",         color: "bg-teal-100 text-teal-700" },
  general:        { label: "General",       color: "bg-gray-100 text-gray-700" },
  accommodation:  { label: "Lodging",       color: "bg-indigo-100 text-indigo-700" },
};

const STATUS_META: Record<VoucherStatus, { label: string; color: string; icon: React.ReactNode }> = {
  draft:             { label: "Draft",           color: "bg-gray-100 text-gray-600",   icon: <Clock className="w-3 h-3" /> },
  active:            { label: "Active",          color: "bg-green-100 text-green-700", icon: <CheckCircle2 className="w-3 h-3" /> },
  partially_redeemed:{ label: "Partial",         color: "bg-amber-100 text-amber-700", icon: <Ticket className="w-3 h-3" /> },
  fully_redeemed:    { label: "Used",            color: "bg-blue-100 text-blue-700",   icon: <CheckCircle2 className="w-3 h-3" /> },
  expired:           { label: "Expired",         color: "bg-red-100 text-red-500",     icon: <AlertCircle className="w-3 h-3" /> },
  cancelled:         { label: "Cancelled",       color: "bg-gray-100 text-gray-400",   icon: <Ban className="w-3 h-3" /> },
};

function fmt(val: string | number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(Number(val));
}

function relDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
}

// ── Progress Bar ──────────────────────────────────────────────────────────────

function RedemptionBar({ redeemed, max }: { redeemed: number; max: number }) {
  const pct = max > 0 ? Math.min(100, (redeemed / max) * 100) : 0;
  const color = pct >= 100 ? "bg-blue-500" : pct >= 50 ? "bg-amber-500" : "bg-[#1D9E75]";
  return (
    <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
      <div className={`h-full rounded-full transition-all ${color}`} style={{ width: `${pct}%` }} />
    </div>
  );
}

// ── Create Modal ──────────────────────────────────────────────────────────────

function CreateVoucherModal({
  campaignId,
  onClose,
  onCreated,
}: {
  campaignId: string;
  onClose: () => void;
  onCreated: (v: VoucherRow) => void;
}) {
  const [form, setForm] = useState({
    code: "",
    type: "general" as VoucherType,
    description: "",
    maxAmount: "",
    currency: "CAD",
    expiresAt: "",
  });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch("/api/finance/vouchers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          code: form.code || null,
          type: form.type,
          description: form.description || null,
          maxAmount: parseFloat(form.maxAmount),
          currency: form.currency,
          expiresAt: form.expiresAt ? new Date(form.expiresAt).toISOString() : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create voucher");
      onCreated(data.voucher);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Ticket className="w-5 h-5 text-[#0A2342]" />
            <span className="font-semibold text-gray-900">Issue New Voucher</span>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {err && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {err}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Category
                <span className="ml-1 text-gray-400 font-normal">— spend type</span>
              </label>
              <select
                value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value as VoucherType }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              >
                {(Object.keys(TYPE_META) as VoucherType[]).map(t => (
                  <option key={t} value={t}>{TYPE_META[t].label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Max Amount
                <span className="ml-1 text-gray-400 font-normal">— CAD</span>
              </label>
              <input
                type="number"
                min="0.01"
                step="0.01"
                required
                placeholder="50.00"
                value={form.maxAmount}
                onChange={e => setForm(f => ({ ...f, maxAmount: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Code
              <span className="ml-1 text-gray-400 font-normal">— optional, e.g. CREW-GAS-042</span>
            </label>
            <input
              type="text"
              placeholder="Auto-generated if blank"
              value={form.code}
              onChange={e => setForm(f => ({ ...f, code: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Description
              <span className="ml-1 text-gray-400 font-normal">— what this covers</span>
            </label>
            <textarea
              rows={2}
              placeholder="Election day gas coverage for ward drivers"
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20 resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Expires
              <span className="ml-1 text-gray-400 font-normal">— optional</span>
            </label>
            <input
              type="date"
              value={form.expiresAt}
              onChange={e => setForm(f => ({ ...f, expiresAt: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.maxAmount}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A2342] text-white text-sm font-medium hover:bg-[#0A2342]/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Ticket className="w-4 h-4" />}
              Issue Voucher
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Redeem Modal ──────────────────────────────────────────────────────────────

function RedeemModal({
  voucher,
  onClose,
  onRedeemed,
}: {
  voucher: VoucherRow;
  onClose: () => void;
  onRedeemed: () => void;
}) {
  const [form, setForm] = useState({ amount: "", merchant: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const remaining = Number(voucher.remainingAmount);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setSaving(true);
    try {
      const res = await fetch(`/api/finance/vouchers/${voucher.id}/redeem`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(form.amount),
          merchant: form.merchant || null,
          notes: form.notes || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Redemption failed");
      onRedeemed();
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div>
            <p className="font-semibold text-gray-900">Redeem Voucher</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {voucher.code ?? voucher.id.slice(-8).toUpperCase()} · {fmt(remaining)} remaining
            </p>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <form onSubmit={submit} className="p-5 space-y-4">
          {err && (
            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-sm text-red-600 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              {err}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Amount (max {fmt(remaining)})
            </label>
            <input
              type="number"
              min="0.01"
              max={remaining}
              step="0.01"
              required
              placeholder={remaining.toFixed(2)}
              value={form.amount}
              onChange={e => setForm(f => ({ ...f, amount: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Merchant / Vendor
              <span className="ml-1 text-gray-400 font-normal">— where you spent it</span>
            </label>
            <input
              type="text"
              placeholder="Shell Station on Brock"
              value={form.merchant}
              onChange={e => setForm(f => ({ ...f, merchant: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <textarea
              rows={2}
              placeholder="Any additional context"
              value={form.notes}
              onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20 resize-none"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !form.amount}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#1D9E75]/90 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Receipt className="w-4 h-4" />}
              Record Spend
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// ── Detail Drawer ─────────────────────────────────────────────────────────────

function VoucherDetailDrawer({
  voucher,
  onClose,
  onActivate,
  onCancel,
  onRedeem,
}: {
  voucher: VoucherDetail;
  onClose: () => void;
  onActivate: () => void;
  onCancel: () => void;
  onRedeem: () => void;
}) {
  const status = STATUS_META[voucher.status];
  const type = TYPE_META[voucher.type];
  const redeemed = Number(voucher.redeemedAmount);
  const max = Number(voucher.maxAmount);
  const remaining = Number(voucher.remainingAmount);

  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center bg-black/40 px-4">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-gray-100 shrink-0">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${type.color}`}>{type.label}</span>
              <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}>
                {status.icon}{status.label}
              </span>
            </div>
            <p className="font-semibold text-gray-900 text-lg">
              {voucher.code ?? `#${voucher.id.slice(-8).toUpperCase()}`}
            </p>
            {voucher.description && (
              <p className="text-sm text-gray-500 mt-0.5">{voucher.description}</p>
            )}
          </div>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100 shrink-0">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        {/* Amounts */}
        <div className="px-5 py-4 bg-gray-50 border-b border-gray-100 shrink-0">
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div className="text-center">
              <p className="text-xs text-gray-400">Authorized</p>
              <p className="font-bold text-gray-900">{fmt(max)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Spent</p>
              <p className="font-bold text-[#EF9F27]">{fmt(redeemed)}</p>
            </div>
            <div className="text-center">
              <p className="text-xs text-gray-400">Remaining</p>
              <p className="font-bold text-[#1D9E75]">{fmt(remaining)}</p>
            </div>
          </div>
          <RedemptionBar redeemed={redeemed} max={max} />
        </div>

        {/* Meta */}
        <div className="px-5 py-3 border-b border-gray-100 shrink-0 space-y-1.5">
          {voucher.assignedUser && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Assigned to <span className="font-medium">{voucher.assignedUser.name}</span>
            </div>
          )}
          {voucher.fundingSource && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Wallet className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              From <span className="font-medium">{voucher.fundingSource.name}</span>
            </div>
          )}
          {voucher.expiresAt && (
            <div className="flex items-center gap-2 text-sm text-gray-600">
              <Clock className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Expires {relDate(voucher.expiresAt)}
            </div>
          )}
          {voucher.issuedBy && (
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <DollarSign className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              Issued by {voucher.issuedBy.name} on {relDate(voucher.createdAt)}
            </div>
          )}
        </div>

        {/* Redemption history */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">
            Spend History ({voucher.redemptions.length})
          </p>
          {voucher.redemptions.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">
              No spend recorded yet.
            </p>
          ) : (
            <div className="space-y-2">
              {voucher.redemptions.map(r => (
                <div key={r.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                  <div className="w-7 h-7 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                    <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold text-gray-800">{fmt(r.amount)}</p>
                      <span className="text-xs text-gray-400 shrink-0">{relDate(r.createdAt)}</span>
                    </div>
                    {r.merchant && <p className="text-xs text-gray-500">{r.merchant}</p>}
                    {r.notes && <p className="text-xs text-gray-400 mt-0.5">{r.notes}</p>}
                    <p className="text-xs text-gray-400 mt-0.5">by {r.redeemedBy.name}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-gray-100 shrink-0 flex gap-2">
          {voucher.status === "draft" && (
            <button
              onClick={onActivate}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#0A2342] text-white text-sm font-medium hover:bg-[#0A2342]/90 transition-colors flex items-center justify-center gap-2"
            >
              <CheckCircle2 className="w-4 h-4" /> Activate
            </button>
          )}
          {(voucher.status === "active" || voucher.status === "partially_redeemed") && (
            <button
              onClick={onRedeem}
              className="flex-1 px-4 py-2.5 rounded-xl bg-[#1D9E75] text-white text-sm font-medium hover:bg-[#1D9E75]/90 transition-colors flex items-center justify-center gap-2"
            >
              <Receipt className="w-4 h-4" /> Record Spend
            </button>
          )}
          {(voucher.status === "draft" || voucher.status === "active") && (
            <button
              onClick={onCancel}
              className="px-4 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Ban className="w-4 h-4" />
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
}

// ── Main Client ───────────────────────────────────────────────────────────────

export default function VouchersClient({ campaignId }: { campaignId: string }) {
  const [vouchers, setVouchers] = useState<VoucherRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [selectedVoucher, setSelectedVoucher] = useState<VoucherDetail | null>(null);
  const [redeemTarget, setRedeemTarget] = useState<VoucherRow | null>(null);
  const [statusFilter, setStatusFilter] = useState<VoucherStatus | "">("");

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const url = new URL("/api/finance/vouchers", window.location.origin);
      url.searchParams.set("campaignId", campaignId);
      if (statusFilter) url.searchParams.set("status", statusFilter);
      const res = await fetch(url.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load vouchers");
      setVouchers(data.vouchers ?? []);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [campaignId, statusFilter]);

  useEffect(() => { load(); }, [load]);

  async function openDetail(v: VoucherRow) {
    try {
      const res = await fetch(`/api/finance/vouchers/${v.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load voucher");
      setSelectedVoucher(data.voucher as VoucherDetail);
    } catch {
      // Fall back to partial data
      setSelectedVoucher({ ...v, redemptions: [] });
    }
  }

  async function patchStatus(voucherId: string, status: string) {
    const res = await fetch(`/api/finance/vouchers/${voucherId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      setSelectedVoucher(null);
      load();
    }
  }

  // Summary stats
  const total = vouchers.length;
  const active = vouchers.filter(v => v.status === "active" || v.status === "partially_redeemed").length;
  const totalAuthorized = vouchers.reduce((sum, v) => sum + Number(v.maxAmount), 0);
  const totalSpent = vouchers.reduce((sum, v) => sum + Number(v.redeemedAmount), 0);

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto">
      <FinanceNav campaignId={campaignId} />

      {/* Header */}
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vouchers</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Pre-authorized spending allowances for your team
          </p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A2342] text-white rounded-xl text-sm font-medium hover:bg-[#0A2342]/90 transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" /> Issue Voucher
        </button>
      </div>

      {/* Summary strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: "Total Issued", value: total.toString(), sub: "vouchers" },
          { label: "Active",       value: active.toString(), sub: "in circulation" },
          { label: "Authorized",   value: fmt(totalAuthorized), sub: "total value" },
          { label: "Spent",        value: fmt(totalSpent), sub: `${totalAuthorized > 0 ? ((totalSpent / totalAuthorized) * 100).toFixed(0) : 0}% used` },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{s.label}</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
          </div>
        ))}
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1 flex-wrap">
          {(["", "draft", "active", "partially_redeemed", "fully_redeemed", "expired", "cancelled"] as const).map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-colors
                ${statusFilter === s
                  ? "bg-[#0A2342] text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}
            >
              {s === "" ? "All" : STATUS_META[s as VoucherStatus].label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {loading && (
        <div className="flex items-center justify-center py-16 text-gray-400">
          <Loader2 className="w-5 h-5 animate-spin mr-2" />
          <span className="text-sm">Loading vouchers…</span>
        </div>
      )}

      {error && (
        <div className="py-8 text-center">
          <p className="text-sm text-red-500">{error}</p>
          <button onClick={load} className="mt-2 text-xs text-[#1D9E75] hover:underline flex items-center gap-1 mx-auto">
            <RefreshCw className="w-3 h-3" /> Retry
          </button>
        </div>
      )}

      {!loading && !error && vouchers.length === 0 && (
        <div className="text-center py-16 bg-white border border-dashed border-gray-200 rounded-2xl">
          <Ticket className="w-10 h-10 text-gray-300 mx-auto mb-3" />
          <p className="font-medium text-gray-600">No vouchers yet</p>
          <p className="text-sm text-gray-400 mt-1 max-w-xs mx-auto">
            Issue a voucher to give a volunteer a pre-approved spending limit for gas, food, or supplies.
          </p>
          <button
            onClick={() => setShowCreate(true)}
            className="mt-4 px-4 py-2 bg-[#0A2342] text-white rounded-xl text-sm font-medium hover:bg-[#0A2342]/90 transition-colors inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" /> Issue First Voucher
          </button>
        </div>
      )}

      {!loading && !error && vouchers.length > 0 && (
        <div className="space-y-2">
          <AnimatePresence initial={false}>
            {vouchers.map((v, i) => {
              const statusM = STATUS_META[v.status];
              const typeM = TYPE_META[v.type];
              const redeemed = Number(v.redeemedAmount);
              const max = Number(v.maxAmount);

              return (
                <motion.div
                  key={v.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => openDetail(v)}
                  className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-[#0A2342]/30 hover:shadow-sm transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${typeM.color}`}>
                      <Ticket className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 min-w-0">
                          <p className="font-semibold text-gray-900 text-sm truncate">
                            {v.code ?? `#${v.id.slice(-8).toUpperCase()}`}
                          </p>
                          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${statusM.color}`}>
                            {statusM.icon}{statusM.label}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-sm font-bold text-gray-900">{fmt(max)}</p>
                          {redeemed > 0 && (
                            <p className="text-xs text-gray-400">{fmt(Number(v.remainingAmount))} left</p>
                          )}
                        </div>
                      </div>

                      {v.description && (
                        <p className="text-xs text-gray-500 mt-0.5 truncate">{v.description}</p>
                      )}

                      <div className="mt-2">
                        <RedemptionBar redeemed={redeemed} max={max} />
                      </div>

                      <div className="flex items-center justify-between mt-1.5">
                        <div className="flex items-center gap-3 text-xs text-gray-400">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${typeM.color}`}>
                            {typeM.label}
                          </span>
                          {v.assignedUser && (
                            <span className="flex items-center gap-1">
                              <User className="w-3 h-3" />{v.assignedUser.name}
                            </span>
                          )}
                          {v._count.redemptions > 0 && (
                            <span>{v._count.redemptions} use{v._count.redemptions !== 1 ? "s" : ""}</span>
                          )}
                        </div>
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Modals */}
      <AnimatePresence>
        {showCreate && (
          <CreateVoucherModal
            campaignId={campaignId}
            onClose={() => setShowCreate(false)}
            onCreated={v => {
              setVouchers(prev => [v, ...prev]);
              setShowCreate(false);
            }}
          />
        )}

        {selectedVoucher && !redeemTarget && (
          <VoucherDetailDrawer
            voucher={selectedVoucher}
            onClose={() => setSelectedVoucher(null)}
            onActivate={() => patchStatus(selectedVoucher.id, "active")}
            onCancel={() => patchStatus(selectedVoucher.id, "cancelled")}
            onRedeem={() => {
              setRedeemTarget(selectedVoucher);
              setSelectedVoucher(null);
            }}
          />
        )}

        {redeemTarget && (
          <RedeemModal
            voucher={redeemTarget}
            onClose={() => setRedeemTarget(null)}
            onRedeemed={() => {
              setRedeemTarget(null);
              load();
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
