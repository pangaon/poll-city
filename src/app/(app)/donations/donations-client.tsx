"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Search, ChevronLeft, ChevronRight, DollarSign, CheckCircle2, Plus,
  AlertTriangle, Ban, Download, Receipt, ArrowUpDown,
  Building2, UserX, FileText, ShieldAlert, RefreshCw,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, EmptyState,
  FormField, Input, Label, Modal, PageHeader, Select, Textarea,
} from "@/components/ui";
import { toast } from "sonner";
import { formatDateTime, fullName } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";

/* ─── constants ─────────────────────────────────────────────────────────── */

const DONATION_LIMIT = 1200;      // Ontario municipal per-individual annual limit
const ANONYMOUS_LIMIT = 25;        // Max anonymous contribution
const CORPORATE_KEYWORDS = ["inc", "corp", "ltd", "llc", "co.", "company", "limited", "incorporated", "holdings", "enterprises", "group"];
const UNION_KEYWORDS = ["union", "local ", "ufcw", "cupe", "osstf", "opseu", "unifor", "seiu", "ibew", "iamaw", "usw", "amalgamated"];
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ─── types ─────────────────────────────────────────────────────────────── */

interface DonationRow {
  id: string;
  amount: number;
  status: string;
  method: string | null;
  notes: string | null;
  createdAt: string;
  collectedAt: string;
  receiptNumber: string | null;
  isRecurring?: boolean;
  contact: { id: string; firstName: string; lastName: string; phone: string | null } | null;
  recordedBy: { id: string; name: string | null; email: string | null };
}

interface AnalyticsSummary {
  donationTotal: number;
  donationCount: number;
  avgDonation: number;
  expenseTotal: number;
  spendingLimit: number;
  remaining: number;
  utilizationPct: number;
  netCash: number;
}


interface Props { campaignId: string }

type SortKey = "contact" | "amount" | "status" | "method" | "createdAt";
type SortDir = "asc" | "desc";

const PAGE_SIZE = 25;

/* ─── Shimmer skeleton ──────────────────────────────────────────────────── */

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-gray-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
    </div>
  );
}

/* ─── Compliance helpers ────────────────────────────────────────────────── */

function isCorporateOrUnion(name: string): "corporate" | "union" | null {
  const lower = name.toLowerCase();
  if (CORPORATE_KEYWORDS.some(k => lower.includes(k))) return "corporate";
  if (UNION_KEYWORDS.some(k => lower.includes(k))) return "union";
  return null;
}

function getSpendingAlertLevel(pct: number): "ok" | "warn" | "alert" | "blocked" {
  if (pct >= 100) return "blocked";
  if (pct >= 90) return "alert";
  if (pct >= 80) return "warn";
  return "ok";
}

/* ─── Spring button wrapper ─────────────────────────────────────────────── */

function SpringButton({ children, onClick, className = "", disabled = false, variant = "default", size = "md" }: {
  children: React.ReactNode;
  onClick?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: "default" | "outline" | "ghost" | "destructive" | "secondary";
  size?: "sm" | "md" | "lg";
}) {
  return (
    <motion.div whileHover={disabled ? {} : { scale: 1.02 }} whileTap={disabled ? {} : { scale: 0.97 }}>
      <Button onClick={onClick} className={className} disabled={disabled} variant={variant} size={size}>
        {children}
      </Button>
    </motion.div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function DonationsClient({ campaignId }: Props) {
  // ── Data state ──
  const [donations, setDonations] = useState<DonationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [methodFilter, setMethodFilter] = useState("all");
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [totalsByStatus, setTotalsByStatus] = useState<{ status: string; _count: { amount: number }; _sum: { amount: number | null } }[]>([]);

  // ── Analytics ──
  const [summary, setSummary] = useState<AnalyticsSummary | null>(null);

  // ── Modals ──
  const [openNew, setOpenNew] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [openReceipt, setOpenReceipt] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<DonationRow | null>(null);
  const [editForm, setEditForm] = useState({ status: "pledged", method: "cash", notes: "" });

  // ── New donation form ──
  const [newForm, setNewForm] = useState({
    firstName: "", lastName: "", phone: "", address: "",
    amount: "", method: "cash", notes: "", donorType: "individual" as "individual" | "anonymous",
  });
  const [newFormErrors, setNewFormErrors] = useState<Record<string, string>>({});
  const [complianceWarnings, setComplianceWarnings] = useState<string[]>([]);
  const [complianceBlocked, setComplianceBlocked] = useState(false);
  const [saving, setSaving] = useState(false);

  // ── Receipt ──
  const [receiptData, setReceiptData] = useState<Record<string, unknown> | null>(null);
  const [receiptLoading, setReceiptLoading] = useState(false);

  /* ─── Load donations ────────────────────────────────────────────────── */
  const loadDonations = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(PAGE_SIZE) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (search) params.set("search", search);
      const res = await fetch(`/api/donations?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to load donations");
      setDonations(data.data ?? []);
      setTotal(data.total ?? 0);
      setTotalsByStatus(data.totalsByStatus ?? []);
    } catch (err) {
      toast.error((err as Error).message || "Failed to load donations");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, search, statusFilter]);

  /* ─── Load analytics ────────────────────────────────────────────────── */
  const loadAnalytics = useCallback(async () => {
    try {
      const res = await fetch(`/api/analytics/donations`);
      const data = await res.json();
      if (res.ok) {
        setSummary(data.summary);
      }
    } catch {
      // non-critical
    }
  }, []);

  useEffect(() => { loadDonations(); }, [loadDonations]);
  useEffect(() => { loadAnalytics(); }, [loadAnalytics]);
  useEffect(() => { setPage(1); }, [search, statusFilter, methodFilter]);

  /* ─── Derived ───────────────────────────────────────────────────────── */
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const totalRaised = useMemo(() => {
    return totalsByStatus.reduce((sum, s) => sum + Number(s._sum?.amount ?? 0), 0);
  }, [totalsByStatus]);

  const statusCounts = useMemo(() => {
    const m: Record<string, number> = {};
    totalsByStatus.forEach(s => { m[s.status] = s._count.amount; });
    return m;
  }, [totalsByStatus]);

  const spendingLevel = summary ? getSpendingAlertLevel(summary.utilizationPct) : "ok";

  // Sort donations client-side
  const sortedDonations = useMemo(() => {
    const arr = [...donations];
    if (methodFilter !== "all") {
      // client-side filter since API doesn't support method filter
    }
    arr.sort((a, b) => {
      let cmp = 0;
      switch (sortKey) {
        case "contact": {
          const nameA = a.contact ? `${a.contact.lastName}${a.contact.firstName}` : "zzz";
          const nameB = b.contact ? `${b.contact.lastName}${b.contact.firstName}` : "zzz";
          cmp = nameA.localeCompare(nameB);
          break;
        }
        case "amount":
          cmp = a.amount - b.amount;
          break;
        case "status":
          cmp = a.status.localeCompare(b.status);
          break;
        case "method":
          cmp = (a.method ?? "").localeCompare(b.method ?? "");
          break;
        case "createdAt":
          cmp = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
          break;
      }
      return sortDir === "asc" ? cmp : -cmp;
    });
    if (methodFilter !== "all") {
      return arr.filter(d => (d.method ?? "cash").toLowerCase() === methodFilter);
    }
    return arr;
  }, [donations, sortKey, sortDir, methodFilter]);

  /* ─── Compliance check for new donation ─────────────────────────────── */
  useEffect(() => {
    const warnings: string[] = [];
    let blocked = false;
    const amount = Number(newForm.amount);
    const donorName = `${newForm.firstName} ${newForm.lastName}`.trim();

    if (newForm.donorType === "anonymous" && amount > ANONYMOUS_LIMIT) {
      warnings.push(`Anonymous donations cannot exceed $${ANONYMOUS_LIMIT}. This donation requires donor identification.`);
      blocked = true;
    }

    if (donorName) {
      const entityType = isCorporateOrUnion(donorName);
      if (entityType === "corporate") {
        warnings.push("Corporate donations are prohibited under Ontario municipal election law.");
        blocked = true;
      }
      if (entityType === "union") {
        warnings.push("Union donations are prohibited under Ontario municipal election law.");
        blocked = true;
      }
    }

    if (amount > DONATION_LIMIT) {
      warnings.push(`This donation ($${amount.toLocaleString()}) exceeds the $${DONATION_LIMIT.toLocaleString()} annual individual limit.`);
      blocked = true;
    }

    if (amount > 0 && amount <= DONATION_LIMIT && amount > DONATION_LIMIT * 0.8) {
      warnings.push(`This donation brings the donor close to the $${DONATION_LIMIT.toLocaleString()} annual limit. Verify cumulative total.`);
    }

    if (summary && spendingLevel === "blocked") {
      warnings.push("Campaign has reached 100% of spending limit. No further transactions permitted.");
      blocked = true;
    }

    setComplianceWarnings(warnings);
    setComplianceBlocked(blocked);
  }, [newForm.amount, newForm.firstName, newForm.lastName, newForm.donorType, summary, spendingLevel]);

  /* ─── Save new donation ─────────────────────────────────────────────── */
  async function saveNewDonation() {
    const errors: Record<string, string> = {};
    const amount = Number(newForm.amount);
    if (!Number.isFinite(amount) || amount <= 0) errors.amount = "Enter a valid amount";
    if (newForm.donorType === "individual" && !newForm.firstName.trim() && !newForm.lastName.trim()) {
      errors.firstName = "Donor name required for non-anonymous";
    }
    setNewFormErrors(errors);
    if (Object.keys(errors).length > 0) return;
    if (complianceBlocked) {
      toast.error("Donation blocked by compliance rules");
      return;
    }

    setSaving(true);
    try {
      const body: Record<string, string | number> = {
        campaignId,
        amount,
        method: newForm.method,
        notes: newForm.notes,
      };
      if (newForm.donorType === "individual") {
        body.firstName = newForm.firstName.trim();
        body.lastName = newForm.lastName.trim();
        body.phone = newForm.phone.trim();
        body.address = newForm.address.trim();
      }
      const res = await fetch("/api/donations/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to save");
      toast.success(`Donation of $${amount.toFixed(2)} recorded`);
      setOpenNew(false);
      setNewForm({ firstName: "", lastName: "", phone: "", address: "", amount: "", method: "cash", notes: "", donorType: "individual" });
      loadDonations();
      loadAnalytics();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSaving(false);
    }
  }

  /* ─── Edit donation ─────────────────────────────────────────────────── */
  function openEditModal(d: DonationRow) {
    setSelectedDonation(d);
    setEditForm({ status: d.status, method: d.method ?? "cash", notes: d.notes ?? "" });
    setOpenEdit(true);
  }

  async function saveEdit() {
    if (!selectedDonation) return;
    try {
      const res = await fetch(`/api/donations?id=${selectedDonation.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Unable to update");
      toast.success("Donation updated");
      setOpenEdit(false);
      loadDonations();
      loadAnalytics();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  /* ─── Receipt ───────────────────────────────────────────────────────── */
  async function viewReceipt(d: DonationRow) {
    setSelectedDonation(d);
    setReceiptLoading(true);
    setOpenReceipt(true);
    try {
      const res = await fetch(`/api/donations/receipt?donationId=${d.id}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load receipt");
      setReceiptData(data.receipt);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setReceiptLoading(false);
    }
  }

  async function batchReceipts() {
    try {
      const res = await fetch("/api/donations/receipt", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed");
      toast.success(`${data.generated} receipts generated ($${Number(data.totalAmount).toLocaleString()})`);
      loadDonations();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  /* ─── Export CSV ────────────────────────────────────────────────────── */
  function exportCsv() {
    window.open(`/api/export/donations?campaignId=${campaignId}`, "_blank");
    toast.success("Downloading CSV export");
  }

  /* ─── Sort handler ──────────────────────────────────────────────────── */
  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  }

  function SortHeader({ label, k }: { label: string; k: SortKey }) {
    const active = sortKey === k;
    return (
      <th
        className="px-4 py-3 text-left font-medium text-gray-600 cursor-pointer select-none hover:text-gray-900 transition-colors"
        onClick={() => toggleSort(k)}
      >
        <span className="inline-flex items-center gap-1">
          {label}
          <ArrowUpDown className={`w-3 h-3 ${active ? "text-[#0A2342]" : "text-gray-300"}`} />
        </span>
      </th>
    );
  }

  /* ═══ RENDER ════════════════════════════════════════════════════════════ */

  return (
    <div className="space-y-6">
      {/* ── Page header ──────────────────────────────────────────────── */}
      <PageHeader
        title="Donations"
        description="Track contributions, enforce compliance, and generate receipts."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <SpringButton variant="outline" size="sm" onClick={exportCsv}>
              <Download className="w-4 h-4" /> Export
            </SpringButton>
            <SpringButton variant="outline" size="sm" onClick={batchReceipts}>
              <Receipt className="w-4 h-4" /> Receipts
            </SpringButton>
            <SpringButton size="sm" onClick={() => setOpenNew(true)}>
              <Plus className="w-4 h-4" /> New Donation
            </SpringButton>
          </div>
        }
      />

      {/* ── Spending limit alert ─────────────────────────────────────── */}
      <AnimatePresence>
        {summary && spendingLevel !== "ok" && (
          <motion.div
            initial={{ opacity: 0, y: -12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
            className={`rounded-xl border p-4 flex items-start gap-3 ${
              spendingLevel === "blocked"
                ? "bg-red-50 border-red-200"
                : spendingLevel === "alert"
                ? "bg-red-50 border-red-200"
                : "bg-amber-50 border-amber-200"
            }`}
          >
            {spendingLevel === "blocked" ? (
              <Ban className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: RED }} />
            ) : (
              <AlertTriangle className="w-5 h-5 mt-0.5 flex-shrink-0" style={{ color: spendingLevel === "alert" ? RED : AMBER }} />
            )}
            <div>
              <p className="font-semibold text-sm" style={{ color: spendingLevel === "warn" ? AMBER : RED }}>
                {spendingLevel === "blocked" && "Spending limit reached (100%) — all transactions blocked"}
                {spendingLevel === "alert" && `Spending at ${summary.utilizationPct}% of limit — approaching cap`}
                {spendingLevel === "warn" && `Spending at ${summary.utilizationPct}% of limit — exercise caution`}
              </p>
              <p className="text-xs text-gray-600 mt-0.5">
                Limit: ${summary.spendingLimit.toLocaleString()} | Spent: ${summary.expenseTotal.toLocaleString()} | Remaining: ${summary.remaining.toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Spending limit compliance bar ─────────────────────────────── */}
      {summary && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" style={{ color: spendingLevel === "ok" ? GREEN : spendingLevel === "warn" ? AMBER : RED }} />
              <p className="text-sm font-medium text-gray-700">Spending Limit</p>
            </div>
            <p className="text-sm font-semibold" style={{ color: spendingLevel === "ok" ? NAVY : spendingLevel === "warn" ? AMBER : RED }}>
              {summary.utilizationPct}% used — ${summary.remaining.toLocaleString()} remaining
            </p>
          </div>
          <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ backgroundColor: spendingLevel === "ok" ? GREEN : spendingLevel === "warn" ? AMBER : RED }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(summary.utilizationPct, 100)}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
        </Card>
      )}

      {/* ── Filters & search ─────────────────────────────────────────── */}
      <Card>
        <CardContent>
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search donor, method, or notes..." className="pl-9" />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="max-w-[160px]">
                <option value="all">All statuses</option>
                <option value="pledged">Pledged</option>
                <option value="processed">Processed</option>
                <option value="receipted">Receipted</option>
                <option value="cancelled">Cancelled</option>
                <option value="refunded">Refunded</option>
              </Select>
              <Select value={methodFilter} onChange={e => setMethodFilter(e.target.value)} className="max-w-[160px]">
                <option value="all">All methods</option>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="credit">Credit</option>
                <option value="e-transfer">E-Transfer</option>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Donations table ──────────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-gray-200" style={{ backgroundColor: `${NAVY}08` }}>
              <tr>
                <SortHeader label="Contact" k="contact" />
                <SortHeader label="Amount" k="amount" />
                <SortHeader label="Status" k="status" />
                <SortHeader label="Method" k="method" />
                <th className="px-4 py-3 text-left font-medium text-gray-600">Recorded by</th>
                <SortHeader label="Date" k="createdAt" />
                <th className="px-4 py-3 text-left font-medium text-gray-600">Compliance</th>
                <th className="px-4 py-3 text-left font-medium text-gray-600">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><Shimmer className="h-4 w-full" /></td>
                    ))}
                  </tr>
                ))
              ) : sortedDonations.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-14">
                    <EmptyState
                      icon={<DollarSign className="w-10 h-10" />}
                      title="No donations found"
                      description="Record your first donation to get started."
                      action={
                        <SpringButton size="sm" onClick={() => setOpenNew(true)}>
                          <Plus className="w-4 h-4" /> New Donation
                        </SpringButton>
                      }
                    />
                  </td>
                </tr>
              ) : sortedDonations.map(d => {
                const donorName = d.contact ? fullName(d.contact.firstName, d.contact.lastName) : "Anonymous";
                const isAnonymous = !d.contact;
                const entityType = d.contact ? isCorporateOrUnion(`${d.contact.firstName} ${d.contact.lastName}`) : null;
                const overLimit = d.amount > DONATION_LIMIT;
                const anonOverLimit = isAnonymous && d.amount > ANONYMOUS_LIMIT;

                return (
                  <motion.tr
                    key={d.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-blue-50/40 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {isAnonymous && <UserX className="w-3.5 h-3.5 text-gray-400" />}
                        <span className={isAnonymous ? "text-gray-400 italic" : ""}>{donorName}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 font-semibold" style={{ color: NAVY }}>${d.amount.toFixed(2)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Badge variant={
                          d.status === "processed" || d.status === "receipted" ? "success" :
                          d.status === "cancelled" || d.status === "refunded" ? "danger" : "default"
                        }>{d.status}</Badge>
                        {d.isRecurring && (
                          <RefreshCw className="w-3.5 h-3.5 text-blue-500 flex-shrink-0" aria-label="Recurring donation" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-gray-600 capitalize">{d.method ?? "cash"}</td>
                    <td className="px-4 py-3 text-gray-600">{d.recordedBy?.name ?? "Unknown"}</td>
                    <td className="px-4 py-3 text-gray-500">{formatDateTime(d.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1 flex-wrap">
                        {entityType === "corporate" && <Badge variant="danger"><Building2 className="w-3 h-3 mr-0.5" />Corp</Badge>}
                        {entityType === "union" && <Badge variant="danger"><Ban className="w-3 h-3 mr-0.5" />Union</Badge>}
                        {overLimit && <Badge variant="danger">Over $1,200</Badge>}
                        {anonOverLimit && <Badge variant="warning">Anon &gt; $25</Badge>}
                        {!entityType && !overLimit && !anonOverLimit && <span className="text-xs text-gray-300">OK</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => openEditModal(d)}
                          className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                          title="Edit"
                        >
                          <FileText className="w-4 h-4" />
                        </motion.button>
                        {d.amount >= 25 && (
                          <motion.button
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={() => viewReceipt(d)}
                            className="p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors"
                            title="Receipt"
                          >
                            <Receipt className="w-4 h-4" />
                          </motion.button>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      {/* ── Pagination ───────────────────────────────────────────────── */}
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-gray-500">
          {total > 0 ? `Showing ${Math.min((page - 1) * PAGE_SIZE + 1, total)}–${Math.min(page * PAGE_SIZE, total)} of ${total}` : "0 results"}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page === 1} onClick={() => setPage(p => Math.max(1, p - 1))}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <span className="text-sm text-gray-600">Page {page} of {totalPages}</span>
          <Button variant="outline" size="sm" disabled={page === totalPages} onClick={() => setPage(p => Math.min(totalPages, p + 1))}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* ═══ NEW DONATION MODAL ═══════════════════════════════════════ */}
      <Modal open={openNew} onClose={() => setOpenNew(false)} title="Record Donation" size="lg">
        <div className="space-y-4">
          {/* Compliance warnings */}
          <AnimatePresence>
            {complianceWarnings.length > 0 && (
              <motion.div
                initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                className="rounded-lg border p-3 space-y-1"
                style={{
                  backgroundColor: complianceBlocked ? `${RED}10` : `${AMBER}10`,
                  borderColor: complianceBlocked ? `${RED}40` : `${AMBER}40`,
                }}
              >
                {complianceWarnings.map((w, i) => (
                  <div key={i} className="flex items-start gap-2">
                    {complianceBlocked ? <Ban className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: RED }} /> : <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" style={{ color: AMBER }} />}
                    <p className="text-xs" style={{ color: complianceBlocked ? RED : AMBER }}>{w}</p>
                  </div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Donor type toggle */}
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setNewForm(f => ({ ...f, donorType: "individual" }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                newForm.donorType === "individual"
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={newForm.donorType === "individual" ? { backgroundColor: NAVY } : {}}
            >
              Individual
            </button>
            <button
              type="button"
              onClick={() => setNewForm(f => ({ ...f, donorType: "anonymous", firstName: "", lastName: "", phone: "", address: "" }))}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                newForm.donorType === "anonymous"
                  ? "text-white"
                  : "bg-gray-100 text-gray-600 hover:bg-gray-200"
              }`}
              style={newForm.donorType === "anonymous" ? { backgroundColor: NAVY } : {}}
            >
              Anonymous
            </button>
          </div>

          {/* Donor info (if individual) */}
          {newForm.donorType === "individual" && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <FormField
                label="First Name"
                required
                error={newFormErrors.firstName}
                help={{ content: "The donor's legal first name as it will appear on their official receipt.", example: "Jane" }}
              >
                <Input value={newForm.firstName} onChange={e => setNewForm(f => ({ ...f, firstName: e.target.value }))} placeholder="Jane" />
              </FormField>
              <FormField
                label="Last Name"
                required
                help={{ content: "The donor's legal last name. Required for campaign finance reporting.", example: "Smith" }}
              >
                <Input value={newForm.lastName} onChange={e => setNewForm(f => ({ ...f, lastName: e.target.value }))} placeholder="Smith" />
              </FormField>
              <FormField
                label="Phone"
                help={{ content: "Optional contact number for follow-up or thank-you calls.", example: "416-555-1234" }}
                hint="Optional — used for thank-you outreach"
              >
                <Input value={newForm.phone} onChange={e => setNewForm(f => ({ ...f, phone: e.target.value }))} placeholder="416-555-1234" />
              </FormField>
              <FormField
                label="Address"
                help={{ content: "Donor's home address. Appears on the official receipt and is required if the donor requests one.", example: "123 Main St, Toronto, ON M5V 1A1" }}
              >
                <Input value={newForm.address} onChange={e => setNewForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Main St, Toronto, ON" />
              </FormField>
            </div>
          )}

          {/* Amount and method */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <FormField
              label="Amount"
              required
              error={newFormErrors.amount}
              help={{
                content: "The amount received. Ontario municipal campaigns have a $1,200 per-donor annual limit.",
                tip: "Exceeding the limit triggers reporting obligations — double-check before saving.",
              }}
              hint="Max $1,200/year per individual donor"
            >
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 font-medium">$</span>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newForm.amount}
                  onChange={e => setNewForm(f => ({ ...f, amount: e.target.value }))}
                  placeholder="0.00"
                  className="pl-7"
                />
              </div>
            </FormField>
            <FormField
              label="Method"
              help={{ content: "How the donation was received. This appears on the official receipt.", example: "Cash, Cheque, Credit Card, E-Transfer" }}
            >
              <Select value={newForm.method} onChange={e => setNewForm(f => ({ ...f, method: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="credit">Credit Card</option>
                <option value="e-transfer">E-Transfer</option>
              </Select>
            </FormField>
          </div>

          <FormField
            label="Notes"
            help={{ content: "Internal notes about this donation — not printed on receipts.", example: "Collected at ward BBQ, door knock on Elm St" }}
            hint="Internal only — not shown on receipts"
          >
            <Textarea value={newForm.notes} onChange={e => setNewForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Collected at ward BBQ, door knock on Elm St" rows={2} />
          </FormField>

          {/* Legal limit info */}
          <div className="bg-gray-50 rounded-lg p-3 text-xs text-gray-500 space-y-1">
            <p><strong>Ontario Municipal Election Law:</strong></p>
            <p>Individual limit: $1,200/year per candidate. No corporations or unions. Anonymous max: $25. Receipts required for $25+.</p>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpenNew(false)}>Cancel</Button>
            <SpringButton onClick={saveNewDonation} disabled={saving || complianceBlocked}>
              {saving ? "Saving..." : <><CheckCircle2 className="w-4 h-4" /> Record Donation</>}
            </SpringButton>
          </div>
        </div>
      </Modal>

      {/* ═══ EDIT MODAL ══════════════════════════════════════════════ */}
      <Modal open={openEdit} onClose={() => setOpenEdit(false)} title="Update Donation" size="md">
        <div className="space-y-4">
          <FormField
            label="Status"
            help={{
              content: "The current stage of this donation. Move to Processed once funds are received, then Receipted once the receipt has been issued.",
              example: "Pledged → Processed → Receipted",
            }}
          >
            <Select value={editForm.status} onChange={e => setEditForm(f => ({ ...f, status: e.target.value }))}>
              <option value="pledged">Pledged</option>
              <option value="processed">Processed</option>
              <option value="receipted">Receipted</option>
              <option value="cancelled">Cancelled</option>
              <option value="refunded">Refunded</option>
            </Select>
          </FormField>
          <FormField
            label="Method"
            help={{ content: "How the donation was received. Correct this if the payment method changed from what was originally recorded.", example: "Cash, Cheque, Credit Card, E-Transfer" }}
          >
            <Select value={editForm.method} onChange={e => setEditForm(f => ({ ...f, method: e.target.value }))}>
              <option value="cash">Cash</option>
              <option value="cheque">Cheque</option>
              <option value="credit">Credit Card</option>
              <option value="e-transfer">E-Transfer</option>
            </Select>
          </FormField>
          <FormField
            label="Notes"
            help={{ content: "Internal notes — useful for tracking follow-ups, special circumstances, or audit notes.", example: "Cheque #4421, deposited April 20" }}
            hint="Internal only — not shown on receipts"
          >
            <Textarea value={editForm.notes} onChange={e => setEditForm(f => ({ ...f, notes: e.target.value }))} placeholder="e.g. Cheque #4421, deposited April 20" />
          </FormField>
          <div className="flex justify-end gap-2 pt-4 border-t border-gray-100">
            <Button variant="secondary" onClick={() => setOpenEdit(false)}>Cancel</Button>
            <SpringButton onClick={saveEdit}>
              <CheckCircle2 className="w-4 h-4" /> Save
            </SpringButton>
          </div>
        </div>
      </Modal>

      {/* ═══ RECEIPT MODAL ════════════════════════════════════════════ */}
      <Modal open={openReceipt} onClose={() => { setOpenReceipt(false); setReceiptData(null); }} title="Donation Receipt" size="md">
        {receiptLoading ? (
          <div className="space-y-3 py-4">
            <Shimmer className="h-5 w-48" />
            <Shimmer className="h-4 w-64" />
            <Shimmer className="h-4 w-40" />
            <Shimmer className="h-20 w-full" />
          </div>
        ) : receiptData ? (
          <div className="space-y-4">
            <div className="bg-gray-50 rounded-xl p-5 space-y-3 font-mono text-sm" id="receipt-content">
              <div className="text-center border-b border-gray-200 pb-3">
                <p className="font-bold text-base" style={{ color: NAVY }}>{receiptData.campaignName as string}</p>
                {receiptData.candidateName ? <p className="text-gray-600">{String(receiptData.candidateName)}</p> : null}
                <p className="text-xs text-gray-400 mt-1">OFFICIAL DONATION RECEIPT</p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div><p className="text-xs text-gray-400">Receipt #</p><p className="font-semibold">{receiptData.receiptNumber as string}</p></div>
                <div><p className="text-xs text-gray-400">Date</p><p>{formatDateTime(receiptData.date as string)}</p></div>
                <div><p className="text-xs text-gray-400">Donor</p><p>{receiptData.donorName as string}</p></div>
                <div><p className="text-xs text-gray-400">Amount</p><p className="font-bold text-lg" style={{ color: GREEN }}>${Number(receiptData.amount).toFixed(2)}</p></div>
              </div>
              {receiptData.donorAddress ? (
                <div><p className="text-xs text-gray-400">Address</p><p>{String(receiptData.donorAddress)}</p></div>
              ) : null}
              <div><p className="text-xs text-gray-400">Method</p><p className="capitalize">{(receiptData.method as string) ?? "cash"}</p></div>
              <div className="border-t border-gray-200 pt-3 mt-3">
                <p className="text-xs text-gray-400 italic">{receiptData.legalNotice as string}</p>
              </div>
              <div className="border-t border-dashed border-gray-300 pt-3">
                <p className="text-xs text-gray-400">Campaign Financial Officer Signature</p>
                <div className="h-8 border-b border-gray-300 mt-4" />
              </div>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" size="sm" onClick={() => { setOpenReceipt(false); setReceiptData(null); }}>Close</Button>
              <SpringButton size="sm" onClick={() => window.print()}>
                <Download className="w-4 h-4" /> Print
              </SpringButton>
            </div>
          </div>
        ) : (
          <p className="text-sm text-gray-400 text-center py-8">Failed to load receipt</p>
        )}
      </Modal>

      {/* shimmer keyframe */}
      <style jsx global>{`
        @keyframes shimmer {
          100% { transform: translateX(100%); }
        }
      `}</style>
    </div>
  );
}
