"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  DollarSign, Receipt, Plus, CheckCircle2, XCircle, Clock,
  Upload, FileText, Filter, ArrowRight,
} from "lucide-react";
import {
  Button, Card, CardContent, Input, Label, Textarea, Badge,
  EmptyState, PageHeader, Modal, Select, StatCard,
} from "@/components/ui";
import { toast } from "sonner";

/* ─── types ─────────────────────────────────────────────────────────── */
type ExpenseStatus = "pending" | "approved" | "rejected" | "reimbursed";

interface ExpenseRow {
  id: string;
  amount: number;
  category: string;
  receiptUrl: string | null;
  notes: string | null;
  status: ExpenseStatus;
  createdAt: string;
  volunteerProfile: {
    id: string;
    user: { id: string; name: string | null; email: string | null } | null;
    contact: { id: string; firstName: string | null; lastName: string | null } | null;
  } | null;
}

interface VolunteerProfileOption {
  id: string;
  user: { name: string | null } | null;
  contact: { firstName: string | null; lastName: string | null } | null;
}

interface Props { campaignId: string }

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const CATEGORIES = ["Transportation", "Food & Drinks", "Printing", "Supplies", "Phone/Internet", "Mileage", "Other"];

function profileName(p: { user?: { name?: string | null } | null; contact?: { firstName?: string | null; lastName?: string | null } | null } | null): string {
  if (!p) return "Unknown";
  if (p.user?.name) return p.user.name;
  const c = p.contact;
  if (c) return [c.firstName, c.lastName].filter(Boolean).join(" ") || "Volunteer";
  return "Volunteer";
}

function statusConfig(s: ExpenseStatus): { variant: "warning" | "success" | "danger" | "info"; label: string; icon: React.ReactNode } {
  switch (s) {
    case "pending": return { variant: "warning", label: "Pending", icon: <Clock className="w-3 h-3" /> };
    case "approved": return { variant: "info", label: "Approved", icon: <CheckCircle2 className="w-3 h-3" /> };
    case "rejected": return { variant: "danger", label: "Rejected", icon: <XCircle className="w-3 h-3" /> };
    case "reimbursed": return { variant: "success", label: "Reimbursed", icon: <DollarSign className="w-3 h-3" /> };
  }
}

export default function VolunteerExpensesClient({ campaignId }: Props) {
  const [rows, setRows] = useState<ExpenseRow[]>([]);
  const [profiles, setProfiles] = useState<VolunteerProfileOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [form, setForm] = useState({ volunteerProfileId: "", amount: "", category: "", receiptUrl: "", notes: "" });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [eRes, pRes] = await Promise.all([
        fetch(`/api/volunteers/expenses?campaignId=${campaignId}`),
        fetch(`/api/volunteers?campaignId=${campaignId}&pageSize=200`),
      ]);
      const eData = await eRes.json();
      const pData = await pRes.json();
      setRows(eData.data ?? []);
      setProfiles(pData.data ?? []);
    } catch { /* */ }
    finally { setLoading(false); }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    if (filterStatus === "all") return rows;
    return rows.filter((r) => r.status === filterStatus);
  }, [rows, filterStatus]);

  const totals = useMemo(() => {
    const pending = rows.filter((r) => r.status === "pending").reduce((s, r) => s + r.amount, 0);
    const approved = rows.filter((r) => r.status === "approved").reduce((s, r) => s + r.amount, 0);
    const reimbursed = rows.filter((r) => r.status === "reimbursed").reduce((s, r) => s + r.amount, 0);
    const total = rows.reduce((s, r) => s + r.amount, 0);
    return { pending, approved, reimbursed, total };
  }, [rows]);

  async function create() {
    if (!form.volunteerProfileId || !form.amount || !form.category) {
      toast.error("Please fill in volunteer, amount, and category");
      return;
    }
    setSaving(true);
    try {
      const res = await fetch("/api/volunteers/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          volunteerProfileId: form.volunteerProfileId,
          amount: Number(form.amount),
          category: form.category,
          receiptUrl: form.receiptUrl || null,
          notes: form.notes || null,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.error || "Failed"); }
      toast.success("Expense submitted");
      setShowCreate(false);
      setForm({ volunteerProfileId: "", amount: "", category: "", receiptUrl: "", notes: "" });
      load();
    } catch (e) { toast.error((e as Error).message); }
    finally { setSaving(false); }
  }

  async function updateStatus(id: string, status: ExpenseStatus) {
    try {
      const res = await fetch(`/api/volunteers/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(payload.error || "Failed to update status");
      }
      toast.success(`Expense marked ${status}`);
      load();
    } catch (e) { toast.error((e as Error).message); }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 px-4 pb-12">
      <PageHeader
        title="Volunteer Expenses"
        description="Submit reimbursement requests and manage approvals"
        actions={
          <Button onClick={() => setShowCreate(true)} className="bg-[#0A2342] hover:bg-[#0A2342]/90 min-h-[44px]">
            <Plus className="w-4 h-4" /> New Expense
          </Button>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard label="Total Expenses" value={rows.length} icon={<Receipt className="w-5 h-5" />} color="blue" />
        <StatCard label="Pending" value={`$${totals.pending.toFixed(2)}`} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatCard label="Approved" value={`$${totals.approved.toFixed(2)}`} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
        <StatCard label="Reimbursed" value={`$${totals.reimbursed.toFixed(2)}`} icon={<DollarSign className="w-5 h-5" />} color="purple" />
      </div>

      {/* Filter */}
      <div className="flex items-center gap-2">
        <Filter className="w-4 h-4 text-gray-400" />
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {["all", "pending", "approved", "rejected", "reimbursed"].map((s) => (
            <button
              key={s}
              onClick={() => setFilterStatus(s)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors min-h-[36px] ${
                filterStatus === s ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              {s === "all" ? "All" : s.charAt(0).toUpperCase() + s.slice(1)}
              {s !== "all" && ` (${rows.filter((r) => r.status === s).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Expense list */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="p-4">
              <div className="animate-pulse flex items-center gap-4">
                <div className="w-10 h-10 bg-gray-200 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-1/3" />
                  <div className="h-3 bg-gray-200 rounded w-1/4" />
                </div>
                <div className="h-6 bg-gray-200 rounded w-16" />
              </div>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={<Receipt className="w-12 h-12" />}
          title={filterStatus === "all" ? "No expenses yet" : `No ${filterStatus} expenses`}
          description={filterStatus === "all" ? "Submit a reimbursement request to get started" : "Try a different filter"}
          action={filterStatus === "all" ? <Button onClick={() => setShowCreate(true)} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">Submit Expense</Button> : undefined}
        />
      ) : (
        <div className="space-y-3">
          <AnimatePresence>
            {filtered.map((row, i) => {
              const sc = statusConfig(row.status);
              return (
                <motion.div
                  key={row.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ ...spring, delay: i * 0.03 }}
                >
                  <Card className="hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-start gap-4">
                        {/* Icon */}
                        <div className="w-10 h-10 rounded-lg bg-[#0A2342]/5 flex items-center justify-center flex-shrink-0">
                          <Receipt className="w-5 h-5 text-[#0A2342]" />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="font-medium text-gray-900">{profileName(row.volunteerProfile)}</p>
                              <p className="text-sm text-gray-500">{row.category}</p>
                            </div>
                            <div className="text-right flex-shrink-0">
                              <p className="text-lg font-bold text-gray-900">${row.amount.toFixed(2)}</p>
                              <Badge variant={sc.variant}>
                                <span className="flex items-center gap-1">{sc.icon} {sc.label}</span>
                              </Badge>
                            </div>
                          </div>

                          {row.notes && <p className="text-sm text-gray-600 mt-2">{row.notes}</p>}

                          <div className="flex items-center justify-between mt-3">
                            <div className="flex items-center gap-3">
                              <span className="text-xs text-gray-400">
                                {new Date(row.createdAt).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" })}
                              </span>
                              {row.receiptUrl && (
                                <a href={row.receiptUrl} target="_blank" rel="noreferrer" className="text-xs text-[#0A2342] hover:underline flex items-center gap-1">
                                  <FileText className="w-3 h-3" /> View Receipt
                                </a>
                              )}
                            </div>

                            {/* Action buttons */}
                            <div className="flex gap-2">
                              {row.status === "pending" && (
                                <>
                                  <Button
                                    size="sm"
                                    onClick={() => updateStatus(row.id, "approved")}
                                    className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white min-h-[44px]"
                                  >
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => updateStatus(row.id, "rejected")}
                                    className="min-h-[44px]"
                                  >
                                    <XCircle className="w-3.5 h-3.5" /> Reject
                                  </Button>
                                </>
                              )}
                              {row.status === "approved" && (
                                <Button
                                  size="sm"
                                  onClick={() => updateStatus(row.id, "reimbursed")}
                                  className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white min-h-[44px]"
                                >
                                  <DollarSign className="w-3.5 h-3.5" /> Mark Reimbursed
                                </Button>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Totals summary */}
      {rows.length > 0 && (
        <Card className="bg-gray-50">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Total all expenses</span>
              <span className="font-bold text-gray-900">${totals.total.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
                {totals.total > 0 && (
                  <div className="flex h-full">
                    <div className="bg-[#1D9E75] h-full" style={{ width: `${(totals.reimbursed / totals.total) * 100}%` }} />
                    <div className="bg-blue-400 h-full" style={{ width: `${(totals.approved / totals.total) * 100}%` }} />
                    <div className="bg-[#EF9F27] h-full" style={{ width: `${(totals.pending / totals.total) * 100}%` }} />
                  </div>
                )}
              </div>
            </div>
            <div className="flex gap-4 mt-2 text-xs text-gray-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#1D9E75]" /> Reimbursed</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-blue-400" /> Approved</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-[#EF9F27]" /> Pending</span>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Create Expense Modal */}
      <Modal open={showCreate} onClose={() => setShowCreate(false)} title="Submit Expense" size="md">
        <div className="space-y-4">
          <div>
            <Label required>Volunteer</Label>
            <Select value={form.volunteerProfileId} onChange={(e) => setForm((s) => ({ ...s, volunteerProfileId: e.target.value }))} className="min-h-[44px]">
              <option value="">Select volunteer...</option>
              {profiles.map((p) => (
                <option key={p.id} value={p.id}>{profileName(p)}</option>
              ))}
            </Select>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label required>Amount ($)</Label>
              <Input
                type="number"
                step="0.01"
                min="0"
                value={form.amount}
                onChange={(e) => setForm((s) => ({ ...s, amount: e.target.value }))}
                placeholder="0.00"
                className="min-h-[44px]"
              />
            </div>
            <div>
              <Label required>Category</Label>
              <Select value={form.category} onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))} className="min-h-[44px]">
                <option value="">Select category...</option>
                {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </Select>
            </div>
          </div>
          <div>
            <Label>Receipt URL</Label>
            <Input
              value={form.receiptUrl}
              onChange={(e) => setForm((s) => ({ ...s, receiptUrl: e.target.value }))}
              placeholder="https://... or paste upload link"
              className="min-h-[44px]"
            />
            <p className="text-xs text-gray-400 mt-1">Paste a link to the uploaded receipt image</p>
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea
              value={form.notes}
              onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              placeholder="Describe the expense..."
            />
          </div>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <Button variant="outline" onClick={() => setShowCreate(false)} className="min-h-[44px]">Cancel</Button>
            <Button onClick={create} loading={saving} className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 min-h-[44px]">
              <Receipt className="w-4 h-4" /> Submit Expense
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
