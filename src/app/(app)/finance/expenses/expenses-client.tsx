"use client";
import { useEffect, useState, useCallback, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Plus, Receipt, FileWarning, Search, X, ChevronRight, Check,
  AlertTriangle, Upload, XCircle, Download,
} from "lucide-react";
import { FieldHelp } from "@/components/ui";
import Link from "next/link";

interface ReceiptAsset { id: string; fileName: string; fileUrl: string }

interface Expense {
  id: string;
  description: string;
  amount: string;
  taxAmount: string;
  expenseDate: string;
  expenseStatus: string;
  paymentStatus: string;
  paymentMethod: string | null;
  missingReceipt: boolean;
  vendor: { id: string; name: string } | null;
  budgetLine: { id: string; name: string; category: string } | null;
  enteredBy: { id: string; name: string };
  approvedBy: { id: string; name: string } | null;
  receiptAsset: ReceiptAsset | null;
  invoiceAsset: ReceiptAsset | null;
}

interface BudgetLine { id: string; name: string; category: string }
interface VendorOption { id: string; name: string }

const STATUS_STYLES: Record<string, string> = {
  draft: "bg-gray-100 text-gray-600",
  submitted: "bg-blue-100 text-blue-700",
  needs_review: "bg-amber-100 text-amber-700",
  approved: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  paid: "bg-purple-100 text-purple-700",
  archived: "bg-gray-100 text-gray-400",
};

function cad(v: string | number) {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency: "CAD" }).format(Number(v));
}

interface NewExpenseForm {
  description: string;
  amount: string;
  taxAmount: string;
  expenseDate: string;
  budgetLineId: string;
  vendorId: string;
  paymentMethod: string;
  notes: string;
}

const PAYMENT_METHODS = ["cash", "cheque", "credit_card", "debit", "etransfer", "wire", "invoice", "other"];
const EMPTY_FORM: NewExpenseForm = {
  description: "", amount: "", taxAmount: "0",
  expenseDate: new Date().toISOString().split("T")[0],
  budgetLineId: "", vendorId: "", paymentMethod: "credit_card", notes: "",
};

interface ImportRow {
  description: string;
  amount: string;
  date: string;
  paymentMethod: string;
  notes: string;
  valid: boolean;
  error?: string;
}

export default function ExpensesClient({ campaignId }: { campaignId: string }) {
  const searchParams = useSearchParams();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState("");
  const [missingReceiptFilter, setMissingReceiptFilter] = useState(
    () => (searchParams ? searchParams.get("missingReceipt") === "true" : false)
  );
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [search, setSearch] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [saving, setSaving] = useState(false);
  const [budgetLines, setBudgetLines] = useState<BudgetLine[]>([]);
  const [vendors, setVendors] = useState<VendorOption[]>([]);
  const [form, setForm] = useState<NewExpenseForm>(EMPTY_FORM);

  // Receipt upload
  const [receiptFile, setReceiptFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Reject flow
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Bulk import
  const [showImport, setShowImport] = useState(false);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importing, setImporting] = useState(false);
  const importFileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ campaignId });
    if (statusFilter) params.set("status", statusFilter);
    if (search) params.set("q", search);
    if (dateFrom) params.set("from", dateFrom);
    if (dateTo) params.set("to", dateTo);
    if (missingReceiptFilter) params.set("missingReceipt", "true");
    const res = await fetch(`/api/finance/expenses?${params}`).then((r) => r.json());
    if (res.data) { setExpenses(res.data); setTotal(res.total ?? res.data.length); }
    setLoading(false);
  }, [campaignId, statusFilter, search, dateFrom, dateTo, missingReceiptFilter]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    fetch(`/api/finance/budget-lines?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((j) => { if (j.data) setBudgetLines(j.data); });
    fetch(`/api/finance/vendors?campaignId=${campaignId}`)
      .then((r) => r.json())
      .then((j) => { if (j.data) setVendors(j.data); });
  }, [campaignId]);

  async function uploadReceipt(file: File): Promise<string | null> {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("assetType", "receipt");
    const res = await fetch("/api/finance/assets", {
      method: "POST",
      headers: { "x-campaign-id": campaignId },
      body: fd,
    }).then((r) => r.json());
    if (res.data?.id) return res.data.id;
    toast.error(res.error ?? "Receipt upload failed");
    return null;
  }

  async function submit() {
    if (!form.description.trim() || !form.amount) {
      toast.error("Description and amount required");
      return;
    }
    setSaving(true);
    let receiptAssetId: string | null = null;
    if (receiptFile) {
      setUploading(true);
      receiptAssetId = await uploadReceipt(receiptFile);
      setUploading(false);
      if (!receiptAssetId) { setSaving(false); return; }
    }
    const res = await fetch("/api/finance/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        campaignId,
        description: form.description,
        amount: Number(form.amount),
        taxAmount: Number(form.taxAmount) || 0,
        expenseDate: form.expenseDate,
        budgetLineId: form.budgetLineId || null,
        vendorId: form.vendorId || null,
        paymentMethod: form.paymentMethod || null,
        notes: form.notes || null,
        receiptAssetId,
        missingReceipt: !receiptAssetId && Number(form.amount) > 500,
      }),
    }).then((r) => r.json());
    setSaving(false);
    if (res.data) {
      toast.success("Expense added");
      setShowAdd(false);
      setForm(EMPTY_FORM);
      setReceiptFile(null);
      load();
    } else {
      toast.error(res.error ?? "Failed");
    }
  }

  async function approve(id: string) {
    await fetch(`/api/finance/expenses/${id}/approve`, { method: "POST" });
    toast.success("Approved");
    load();
  }

  async function submitForApproval(id: string) {
    await fetch(`/api/finance/expenses/${id}/submit`, { method: "POST" });
    toast.success("Submitted for approval");
    load();
  }

  async function confirmReject() {
    if (!rejectingId || !rejectReason.trim()) {
      toast.error("Rejection reason required");
      return;
    }
    setRejecting(true);
    await fetch(`/api/finance/expenses/${rejectingId}/reject`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason: rejectReason }),
    });
    setRejecting(false);
    setRejectingId(null);
    setRejectReason("");
    toast.success("Expense rejected");
    load();
  }

  function parseCSV(text: string): ImportRow[] {
    const lines = text.split(/\r?\n/).filter((l) => l.trim());
    if (!lines.length) return [];
    const start = lines[0].toLowerCase().includes("description") ? 1 : 0;
    return lines.slice(start).map((line) => {
      const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
      const [description = "", amount = "", date = "", paymentMethod = "other", notes = ""] = cols;
      const validAmount = !isNaN(Number(amount)) && Number(amount) > 0;
      const valid = !!description && validAmount;
      return {
        description,
        amount,
        date: date || new Date().toISOString().split("T")[0],
        paymentMethod: PAYMENT_METHODS.includes(paymentMethod) ? paymentMethod : "other",
        notes,
        valid,
        error: !valid ? (!description ? "Missing description" : "Invalid amount") : undefined,
      };
    });
  }

  async function runImport() {
    const valid = importRows.filter((r) => r.valid);
    if (!valid.length) { toast.error("No valid rows to import"); return; }
    setImporting(true);
    let ok = 0;
    for (const row of valid) {
      const res = await fetch("/api/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          description: row.description,
          amount: Number(row.amount),
          taxAmount: 0,
          expenseDate: row.date,
          paymentMethod: row.paymentMethod,
          notes: row.notes || null,
        }),
      }).then((r) => r.json());
      if (res.data) ok++;
    }
    setImporting(false);
    toast.success(`Imported ${ok} of ${valid.length} expenses`);
    setShowImport(false);
    setImportRows([]);
    load();
  }

  const policyWarning = Number(form.amount) > 500 && !receiptFile;
  const pendingCount = expenses.filter((e) => e.expenseStatus === "submitted").length;
  const totalAmount = expenses.reduce((s, e) => s + Number(e.amount), 0);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white">Expenses</h1>
          <p className="text-sm text-gray-500">{total} total · {cad(totalAmount)} captured</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm font-medium text-gray-600 dark:text-slate-300 hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            <Upload className="w-3.5 h-3.5" /> Import CSV
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0A2342] text-white rounded-lg text-sm font-medium hover:bg-[#0A2342]/90"
          >
            <Plus className="w-3.5 h-3.5" /> Add Expense
          </button>
        </div>
      </div>

      {/* Pending approval banner */}
      {pendingCount > 0 && (
        <Link
          href="/finance/approvals"
          className="flex items-center gap-2 px-3 py-2.5 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg text-sm text-amber-800 dark:text-amber-300"
        >
          <AlertTriangle className="w-4 h-4" />
          <span className="font-medium">{pendingCount} expense{pendingCount !== 1 ? "s" : ""} awaiting approval</span>
          <ChevronRight className="w-3.5 h-3.5 ml-auto" />
        </Link>
      )}

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search expenses..."
            className="w-full pl-8 pr-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none"
        >
          <option value="">All statuses</option>
          {["draft", "submitted", "needs_review", "approved", "rejected", "paid"].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, " ")}</option>
          ))}
        </select>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          title="From date"
          className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          title="To date"
          className="px-3 py-1.5 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-900 text-gray-700 dark:text-slate-300 focus:outline-none"
        />
        {missingReceiptFilter && (
          <button
            onClick={() => setMissingReceiptFilter(false)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-100 text-amber-700 border border-amber-300 rounded-lg text-sm font-medium hover:bg-amber-200"
          >
            <FileWarning className="w-3.5 h-3.5" />
            Missing receipt
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Expense list */}
      <div className="bg-white dark:bg-slate-900 rounded-xl border border-gray-200 dark:border-slate-700 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-3">
                <div className="h-4 w-full bg-gray-100 dark:bg-slate-800 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <div className="text-center py-12">
            <Receipt className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No expenses yet. Add your first expense above.</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 dark:divide-slate-800">
            {expenses.map((expense) => (
              <div key={expense.id} className="px-4 py-3 hover:bg-gray-50 dark:hover:bg-slate-800/50 transition-colors">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900 dark:text-white text-sm truncate">{expense.description}</span>
                      {expense.missingReceipt && (
                        <span title="Missing receipt">
                          <FileWarning className="w-3.5 h-3.5 text-amber-500" />
                        </span>
                      )}
                      {expense.receiptAsset && (
                        <a
                          href={expense.receiptAsset.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          title={`Receipt: ${expense.receiptAsset.fileName}`}
                          className="text-blue-500 hover:text-blue-700"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-400">
                      <span>{new Date(expense.expenseDate).toLocaleDateString("en-CA")}</span>
                      {expense.vendor && <span>· {expense.vendor.name}</span>}
                      {expense.budgetLine && <span>· {expense.budgetLine.name}</span>}
                      <span>· {expense.enteredBy.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="font-semibold text-gray-900 dark:text-white text-sm">{cad(expense.amount)}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_STYLES[expense.expenseStatus] ?? "bg-gray-100 text-gray-500"}`}>
                      {expense.expenseStatus.replace(/_/g, " ")}
                    </span>
                    {expense.expenseStatus === "draft" && (
                      <button
                        onClick={() => submitForApproval(expense.id)}
                        className="text-xs px-2 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                      >
                        Submit
                      </button>
                    )}
                    {expense.expenseStatus === "submitted" && (
                      <>
                        <button
                          onClick={() => approve(expense.id)}
                          title="Approve"
                          className="text-xs px-1.5 py-0.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => { setRejectingId(expense.id); setRejectReason(""); }}
                          title="Reject"
                          className="text-xs px-1.5 py-0.5 bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add Expense drawer */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowAdd(false); setReceiptFile(null); } }}
          >
            <motion.div
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-slate-900 rounded-t-xl sm:rounded-xl p-5 w-full sm:max-w-lg shadow-xl max-h-[90dvh] overflow-y-auto"
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold text-gray-900 dark:text-white">Add Expense</h2>
                <button onClick={() => { setShowAdd(false); setReceiptFile(null); }} className="text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {policyWarning && (
                <div className="mb-3 flex items-start gap-2 px-3 py-2 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
                  <span>Expenses over $500 should include a receipt. Attach one below or it will be flagged as missing.</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                    Description *
                    <FieldHelp content="A clear description of what this expense was for. This appears in your finance report and approval workflow." example="500 lawn signs, door-knock printing — Ward 6" />
                  </label>
                  <input
                    value={form.description}
                    onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                    placeholder="e.g. 500 lawn signs for Ward 6 canvass"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                      Amount (CAD) *
                      <FieldHelp content="The total amount paid, before or after tax — record whichever matches your receipt. Add HST separately in the Tax field." example="450.00" />
                    </label>
                    <input
                      type="number" step="0.01"
                      value={form.amount}
                      onChange={(e) => setForm((p) => ({ ...p, amount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                    />
                  </div>
                  <div>
                    <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                      Tax (HST)
                      <FieldHelp content="The HST portion of this expense. Campaigns must track tax separately for financial reporting." example="58.50 (13% HST on $450)" />
                    </label>
                    <input
                      type="number" step="0.01"
                      value={form.taxAmount}
                      onChange={(e) => setForm((p) => ({ ...p, taxAmount: e.target.value }))}
                      placeholder="0.00"
                      className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                    />
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                    Date *
                    <FieldHelp content="The date the expense was incurred — use the invoice or receipt date, not the payment date." />
                  </label>
                  <input
                    type="date"
                    value={form.expenseDate}
                    onChange={(e) => setForm((p) => ({ ...p, expenseDate: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                    Budget Line
                    <FieldHelp content="The budget category this expense is charged to. Helps you track spending vs. your plan." example="Signs & Print, Digital Advertising, Canvassing" />
                  </label>
                  <select
                    value={form.budgetLineId}
                    onChange={(e) => setForm((p) => ({ ...p, budgetLineId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  >
                    <option value="">No budget line</option>
                    {budgetLines.map((bl) => (
                      <option key={bl.id} value={bl.id}>{bl.name} ({bl.category.replace(/_/g, " ")})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                    Vendor
                    <FieldHelp content="The supplier or person who was paid. Linking a vendor makes it easier to run spending-by-vendor reports." example="SignShop Inc., Staples Business Centre" />
                  </label>
                  <select
                    value={form.vendorId}
                    onChange={(e) => setForm((p) => ({ ...p, vendorId: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  >
                    <option value="">No vendor</option>
                    {vendors.map((v) => (
                      <option key={v.id} value={v.id}>{v.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                    Payment Method
                    <FieldHelp content="How this expense was paid. Useful for reconciling bank statements and for the financial officer's audit trail." example="Credit Card, Cheque, E-Transfer" />
                  </label>
                  <select
                    value={form.paymentMethod}
                    onChange={(e) => setForm((p) => ({ ...p, paymentMethod: e.target.value }))}
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342]"
                  >
                    {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{m.replace(/_/g, " ")}</option>)}
                  </select>
                </div>
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                    Notes
                    <FieldHelp content="Any additional context for the approver or financial officer — purpose of the purchase, approval reference, etc." example="Approved by campaign manager on April 18 — urgent for GOTV week" />
                  </label>
                  <textarea
                    value={form.notes}
                    onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    placeholder="e.g. Approved by campaign manager for GOTV weekend"
                    className="mt-1 w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-[#0A2342] resize-none"
                  />
                </div>

                {/* Receipt upload */}
                <div>
                  <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400">
                    Receipt
                    <FieldHelp content="Attach the receipt or invoice. Required for expenses over $500 — missing receipts are flagged for review." tip="Accepted formats: JPG, PNG, PDF. Max 10 MB." />
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp,application/pdf"
                    className="hidden"
                    onChange={(e) => setReceiptFile(e.target.files?.[0] ?? null)}
                  />
                  {receiptFile ? (
                    <div className="mt-1 flex items-center gap-2 px-3 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 rounded-lg">
                      <Download className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span className="truncate text-blue-800 dark:text-blue-300 text-xs flex-1">{receiptFile.name}</span>
                      <button onClick={() => setReceiptFile(null)} className="text-blue-400 hover:text-blue-600">
                        <XCircle className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      className="mt-1 w-full flex items-center justify-center gap-2 px-3 py-2 border border-dashed border-gray-300 dark:border-slate-600 rounded-lg text-sm text-gray-500 hover:border-[#0A2342] hover:text-[#0A2342] transition-colors"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      Attach receipt (JPG, PNG, PDF — max 10MB)
                    </button>
                  )}
                </div>
              </div>

              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setShowAdd(false); setReceiptFile(null); }}
                  className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300"
                >
                  Cancel
                </button>
                <button
                  onClick={submit}
                  disabled={saving || uploading}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {uploading ? "Uploading..." : saving ? "Saving..." : "Add Expense"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reject modal */}
      <AnimatePresence>
        {rejectingId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-sm shadow-xl"
            >
              <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Reject Expense</h3>
              <label className="flex items-center gap-1 text-xs font-medium text-gray-600 dark:text-slate-400 mb-1">
                Reason for rejection *
                <FieldHelp content="Explain why this expense cannot be approved. The submitter will see this reason so they can correct and resubmit." example="Missing receipt — please attach the invoice from SignShop Inc." />
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Missing receipt — please attach the vendor invoice"
                rows={3}
                className="w-full px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm bg-white dark:bg-slate-800 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-red-500 resize-none"
              />
              <div className="flex gap-2 mt-3">
                <button onClick={() => setRejectingId(null)} className="flex-1 px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300">
                  Cancel
                </button>
                <button
                  onClick={confirmReject}
                  disabled={rejecting || !rejectReason.trim()}
                  className="flex-1 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {rejecting ? "Rejecting..." : "Reject"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bulk import modal */}
      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
            onClick={(e) => { if (e.target === e.currentTarget) { setShowImport(false); setImportRows([]); } }}
          >
            <motion.div
              initial={{ scale: 0.95 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.95 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-white dark:bg-slate-900 rounded-xl p-5 w-full max-w-2xl shadow-xl max-h-[80dvh] flex flex-col"
            >
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-semibold text-gray-900 dark:text-white">Import Expenses from CSV</h2>
                <button onClick={() => { setShowImport(false); setImportRows([]); }} className="text-gray-400">
                  <X className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-gray-500 mb-3">
                Columns: <code className="bg-gray-100 dark:bg-slate-800 px-1 rounded">description, amount, date (YYYY-MM-DD), payment_method, notes</code>
              </p>
              <input
                ref={importFileRef}
                type="file"
                accept=".csv,text/csv"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = (ev) => {
                    setImportRows(parseCSV(ev.target?.result as string));
                  };
                  reader.readAsText(file);
                }}
              />
              {importRows.length === 0 ? (
                <button
                  onClick={() => importFileRef.current?.click()}
                  className="flex items-center justify-center gap-2 w-full py-10 border-2 border-dashed border-gray-200 dark:border-slate-700 rounded-xl text-gray-400 hover:border-[#0A2342] hover:text-[#0A2342] transition-colors"
                >
                  <Upload className="w-5 h-5" />
                  <span className="text-sm">Select CSV file</span>
                </button>
              ) : (
                <div className="flex-1 overflow-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="text-left border-b border-gray-100 dark:border-slate-800">
                        <th className="pb-2 font-medium text-gray-500">Status</th>
                        <th className="pb-2 font-medium text-gray-500">Description</th>
                        <th className="pb-2 font-medium text-gray-500">Amount</th>
                        <th className="pb-2 font-medium text-gray-500">Date</th>
                        <th className="pb-2 font-medium text-gray-500">Method</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importRows.slice(0, 50).map((row, i) => (
                        <tr key={i} className={`border-b border-gray-50 dark:border-slate-800 ${!row.valid ? "opacity-50" : ""}`}>
                          <td className="py-1 pr-2">
                            {row.valid
                              ? <Check className="w-3.5 h-3.5 text-emerald-500" />
                              : <span className="text-red-500">{row.error}</span>}
                          </td>
                          <td className="py-1 pr-2 truncate max-w-[160px] text-gray-700 dark:text-slate-300">{row.description}</td>
                          <td className="py-1 pr-2 text-gray-700 dark:text-slate-300">{row.amount}</td>
                          <td className="py-1 pr-2 text-gray-700 dark:text-slate-300">{row.date}</td>
                          <td className="py-1 text-gray-700 dark:text-slate-300">{row.paymentMethod}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <p className="text-xs text-gray-400 mt-2">
                    {importRows.filter((r) => r.valid).length} valid · {importRows.filter((r) => !r.valid).length} invalid
                  </p>
                </div>
              )}
              <div className="flex gap-2 mt-4">
                <button
                  onClick={() => { setImportRows([]); if (importFileRef.current) importFileRef.current.value = ""; }}
                  disabled={importing}
                  className="px-3 py-2 border border-gray-200 dark:border-slate-700 rounded-lg text-sm text-gray-600 dark:text-slate-300"
                >
                  Clear
                </button>
                <button
                  onClick={runImport}
                  disabled={importing || importRows.filter((r) => r.valid).length === 0}
                  className="flex-1 px-3 py-2 bg-[#0A2342] text-white rounded-lg text-sm font-medium disabled:opacity-50"
                >
                  {importing ? "Importing..." : `Import ${importRows.filter((r) => r.valid).length} Expenses`}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
