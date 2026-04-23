"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Wallet, Plus, ChevronRight, RefreshCw, Loader2,
  DollarSign, Lock, AlertCircle, TrendingUp, TrendingDown,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState, Modal,
  FormField, Input, Select, Textarea, PageHeader,
} from "@/components/ui";
import { toast } from "sonner";

// ── Types ─────────────────────────────────────────────────────────────────────

type FundingSourceType =
  | "candidate_money" | "donations" | "bank_account"
  | "petty_cash" | "operating_reserve" | "grant" | "loan" | "other";

interface FundingSource {
  id: string;
  type: FundingSourceType;
  name: string;
  description: string | null;
  balance: number | null;
  currency: string;
  ownerEntity: string | null;
  restrictedUse: boolean;
  restrictedNotes: string | null;
  isActive: boolean;
  createdAt: string;
  createdBy: { id: string; name: string };
  _count: { transactions: number; vouchers: number };
}

interface Transaction {
  id: string;
  type: string;
  amount: number;
  balanceAfter: number | null;
  description: string | null;
  notes: string | null;
  createdAt: string;
}

interface Props {
  campaignId: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const TYPE_META: Record<FundingSourceType, { label: string; color: string }> = {
  candidate_money:   { label: "Candidate Money",    color: "bg-blue-100 text-blue-700" },
  donations:         { label: "Donations",           color: "bg-green-100 text-green-700" },
  bank_account:      { label: "Bank Account",        color: "bg-indigo-100 text-indigo-700" },
  petty_cash:        { label: "Petty Cash",          color: "bg-amber-100 text-amber-700" },
  operating_reserve: { label: "Operating Reserve",   color: "bg-purple-100 text-purple-700" },
  grant:             { label: "Grant",               color: "bg-teal-100 text-teal-700" },
  loan:              { label: "Loan",                color: "bg-rose-100 text-rose-700" },
  other:             { label: "Other",               color: "bg-gray-100 text-gray-600" },
};

const SLIDE = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit:    { opacity: 0, y: -6 },
  transition: { type: "spring" as const, stiffness: 300, damping: 30 },
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function FundingSourcesClient({ campaignId }: Props) {
  const [sources, setSources] = useState<FundingSource[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [ledgerSource, setLedgerSource] = useState<FundingSource | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [ledgerLoading, setLedgerLoading] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/finance/funding-sources?campaignId=${campaignId}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load");
      setSources(data.sources ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  async function openLedger(source: FundingSource) {
    setLedgerSource(source);
    setLedgerLoading(true);
    try {
      const res = await fetch(`/api/finance/funding-sources/${source.id}/ledger`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load ledger");
      setTransactions(data.transactions ?? []);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLedgerLoading(false);
    }
  }

  const totalTracked = sources.filter((s) => s.balance != null).reduce((sum, s) => sum + Number(s.balance), 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Funding Sources"
        description="Track where campaign money comes from. Every expense and voucher can be attributed to a source."
        actions={
          <div className="flex gap-2">
            <Button variant="ghost" size="sm" onClick={load} disabled={loading}>
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button onClick={() => setShowCreate(true)} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white">
              <Plus className="h-4 w-4 mr-1" /> Add Source
            </Button>
          </div>
        }
      />

      {/* Summary strip */}
      {sources.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Wallet className="h-5 w-5 text-[#0A2342]" />
              <div>
                <div className="text-2xl font-bold text-[#0A2342]">{sources.length}</div>
                <div className="text-xs text-gray-500">Funding Sources</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <DollarSign className="h-5 w-5 text-green-600" />
              <div>
                <div className="text-2xl font-bold text-green-700">${totalTracked.toLocaleString("en-CA", { minimumFractionDigits: 2 })}</div>
                <div className="text-xs text-gray-500">Total Tracked Balance</div>
              </div>
            </CardContent>
          </Card>
          <Card className="border-0 shadow-sm">
            <CardContent className="p-4 flex items-center gap-3">
              <Lock className="h-5 w-5 text-amber-600" />
              <div>
                <div className="text-2xl font-bold text-amber-700">{sources.filter((s) => s.restrictedUse).length}</div>
                <div className="text-xs text-gray-500">Restricted Sources</div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Source cards */}
      {loading ? (
        <div className="flex items-center justify-center py-12 text-gray-400">
          <Loader2 className="h-6 w-6 animate-spin mr-2" />
          <span>Loading funding sources…</span>
        </div>
      ) : sources.length === 0 ? (
        <EmptyState
          icon={<Wallet className="h-8 w-8" />}
          title="No funding sources yet"
          description="Add your first funding source — candidate money, donations bank account, petty cash, or any other source. Every expense and voucher can be attributed to a source for compliance tracking."
          action={<Button onClick={() => setShowCreate(true)}>Add First Source</Button>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <AnimatePresence initial={false}>
            {sources.map((source) => {
              const meta = TYPE_META[source.type];
              return (
                <motion.div key={source.id} {...SLIDE}>
                  <Card className="border hover:shadow-md transition-shadow cursor-pointer" onClick={() => openLedger(source)}>
                    <CardContent className="p-5 space-y-3">
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-gray-900 truncate">{source.name}</div>
                          {source.ownerEntity && (
                            <div className="text-xs text-gray-400 mt-0.5 truncate">{source.ownerEntity}</div>
                          )}
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>

                      {source.balance != null ? (
                        <div className="text-2xl font-bold text-gray-900">
                          ${Number(source.balance).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
                          <span className="text-sm font-normal text-gray-400 ml-1">{source.currency}</span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-400 italic">Balance not tracked</div>
                      )}

                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <div className="flex items-center gap-2">
                          {source.restrictedUse && (
                            <span className="flex items-center gap-1 text-amber-600">
                              <Lock className="h-3 w-3" /> Restricted
                            </span>
                          )}
                          <span>{source._count.transactions} transactions</span>
                          {source._count.vouchers > 0 && (
                            <span>· {source._count.vouchers} vouchers</span>
                          )}
                        </div>
                        <ChevronRight className="h-4 w-4" />
                      </div>

                      {source.description && (
                        <p className="text-xs text-gray-500 leading-snug">{source.description}</p>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <CreateFundingSourceModal
          campaignId={campaignId}
          onClose={() => setShowCreate(false)}
          onSuccess={() => { setShowCreate(false); load(); }}
        />
      )}

      {/* Ledger drawer */}
      {ledgerSource && (
        <LedgerModal
          source={ledgerSource}
          transactions={transactions}
          loading={ledgerLoading}
          onClose={() => setLedgerSource(null)}
        />
      )}
    </div>
  );
}

// ── Create modal ──────────────────────────────────────────────────────────────

function CreateFundingSourceModal({
  campaignId,
  onClose,
  onSuccess,
}: {
  campaignId: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [form, setForm] = useState({
    name: "",
    type: "other" as FundingSourceType,
    description: "",
    balance: "",
    ownerEntity: "",
    restrictedUse: false,
    restrictedNotes: "",
  });
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/finance/funding-sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: form.name.trim(),
          type: form.type,
          description: form.description.trim() || null,
          balance: form.balance ? parseFloat(form.balance) : null,
          ownerEntity: form.ownerEntity.trim() || null,
          restrictedUse: form.restrictedUse,
          restrictedNotes: form.restrictedNotes.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create");
      toast.success("Funding source created");
      onSuccess();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal open onClose={onClose} title="Add Funding Source">
      <div className="space-y-4">
        <FormField
          label="Source Name"
          hint="e.g. Campaign Bank Account, Candidate Personal Funds"
          help={{ content: "A clear name helps your finance team identify where money comes from when reviewing expenses." }}
        >
          <Input
            value={form.name}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
            placeholder="e.g. TD Chequing — Ward 5 Campaign"
          />
        </FormField>

        <FormField
          label="Type"
          help={{ content: "The type determines how this source appears in compliance reports and budget summaries." }}
        >
          <Select value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value as FundingSourceType }))}>
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </Select>
        </FormField>

        <FormField
          label="Current Balance"
          hint="Leave blank if you don't want to track a running balance"
          help={{ content: "If entered, the platform will track a running balance as transactions are logged against this source." }}
        >
          <Input
            type="number"
            value={form.balance}
            onChange={(e) => setForm((f) => ({ ...f, balance: e.target.value }))}
            placeholder="0.00"
            min="0"
            step="0.01"
          />
        </FormField>

        <FormField
          label="Owner / Entity"
          help={{ content: "Who owns or controls this funding source? E.g. 'Jane Smith (Candidate)' or 'Campaign Committee'." }}
        >
          <Input
            value={form.ownerEntity}
            onChange={(e) => setForm((f) => ({ ...f, ownerEntity: e.target.value }))}
            placeholder="e.g. Jane Smith — Candidate"
          />
        </FormField>

        <FormField label="Description">
          <Textarea
            value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
            placeholder="Optional notes about this funding source"
            rows={2}
          />
        </FormField>

        <div className="flex items-center gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <input
            type="checkbox"
            id="restricted"
            checked={form.restrictedUse}
            onChange={(e) => setForm((f) => ({ ...f, restrictedUse: e.target.checked }))}
            className="rounded"
          />
          <label htmlFor="restricted" className="text-sm font-medium text-amber-800">
            This money is restricted to specific use
          </label>
        </div>

        {form.restrictedUse && (
          <FormField
            label="Restriction Details"
            help={{ content: "Describe what this money can and cannot be spent on. This will appear as a warning when anyone tries to charge expenses against this source." }}
          >
            <Textarea
              value={form.restrictedNotes}
              onChange={(e) => setForm((f) => ({ ...f, restrictedNotes: e.target.value }))}
              placeholder="e.g. This grant can only be used for digital advertising — not for print or events"
              rows={2}
            />
          </FormField>
        )}

        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button
            onClick={handleSubmit}
            disabled={submitting}
            className="flex-1 bg-[#0A2342] hover:bg-[#0A2342]/90 text-white"
          >
            {submitting ? "Creating…" : "Create Source"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

// ── Ledger modal ──────────────────────────────────────────────────────────────

const TX_TYPE_META: Record<string, { label: string; isDebit: boolean }> = {
  credit:           { label: "Credit",           isDebit: false },
  debit:            { label: "Debit",            isDebit: true  },
  transfer:         { label: "Transfer",         isDebit: false },
  allocation:       { label: "Allocation",       isDebit: false },
  reimbursement_out:{ label: "Reimbursement Out",isDebit: true  },
  donation_in:      { label: "Donation In",      isDebit: false },
  vendor_payment:   { label: "Vendor Payment",   isDebit: true  },
  adjustment:       { label: "Adjustment",       isDebit: false },
};

function LedgerModal({
  source,
  transactions,
  loading,
  onClose,
}: {
  source: FundingSource;
  transactions: Transaction[];
  loading: boolean;
  onClose: () => void;
}) {
  return (
    <Modal open onClose={onClose} title={`Ledger — ${source.name}`}>
      <div className="space-y-4">
        {source.balance != null && (
          <div className="flex items-center gap-3 p-4 bg-gray-50 rounded-xl">
            <DollarSign className="h-5 w-5 text-[#0A2342]" />
            <div>
              <div className="text-2xl font-bold text-[#0A2342]">
                ${Number(source.balance).toLocaleString("en-CA", { minimumFractionDigits: 2 })}
              </div>
              <div className="text-xs text-gray-500">Current Balance</div>
            </div>
          </div>
        )}

        {source.restrictedUse && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
            <div>
              <div className="font-medium">Restricted Use</div>
              {source.restrictedNotes && <div className="mt-0.5 text-amber-700">{source.restrictedNotes}</div>}
            </div>
          </div>
        )}

        <div className="font-medium text-sm text-gray-600">
          Transaction History ({transactions.length})
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8 text-gray-400">
            <Loader2 className="h-5 w-5 animate-spin mr-2" />
            Loading…
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">No transactions recorded yet.</p>
        ) : (
          <div className="max-h-80 overflow-y-auto space-y-1 pr-1">
            {transactions.map((tx) => {
              const meta = TX_TYPE_META[tx.type] ?? { label: tx.type, isDebit: false };
              return (
                <div key={tx.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div className="flex items-center gap-2">
                    {meta.isDebit
                      ? <TrendingDown className="h-4 w-4 text-red-400" />
                      : <TrendingUp className="h-4 w-4 text-green-500" />}
                    <div>
                      <div className="text-sm font-medium">{meta.label}</div>
                      {tx.description && <div className="text-xs text-gray-400">{tx.description}</div>}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold text-sm ${meta.isDebit ? "text-red-600" : "text-green-600"}`}>
                      {meta.isDebit ? "−" : "+"}${Number(tx.amount).toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-400">
                      {new Date(tx.createdAt).toLocaleDateString("en-CA")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </Modal>
  );
}
