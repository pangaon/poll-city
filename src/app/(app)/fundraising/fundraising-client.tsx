"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  DollarSign, TrendingUp, Users, RefreshCw, Receipt, AlertTriangle,
  Plus, Search, Filter, Download, ChevronLeft, ChevronRight,
  CheckCircle2, XCircle, Clock, Ban, Repeat, HandshakeIcon,
  BarChart3, ShieldAlert, FileText, CreditCard, Banknote, Wallet,
  ArrowUpRight, Eye, MoreHorizontal, Target, CalendarDays,
  Settings, Save, PieChart, LineChart, Table2,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, EmptyState,
  Input, Label, Modal, PageHeader, Select, Textarea,
} from "@/components/ui";
import { toast } from "sonner";
import { formatDateTime, fullName } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip,
  ResponsiveContainer, CartesianGrid,
} from "recharts";

/* ─── constants ─────────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";
const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

/* ─── types ─────────────────────────────────────────────────────────────── */

interface Stats {
  allTime: { raised: number; net: number; fees: number; refunded: number; count: number; avgGift: number };
  thisMonth: { raised: number; net: number; count: number };
  thisYear: { raised: number; count: number };
  last30Days: { raised: number; count: number; avgGift: number };
  donors: { total: number; newLast30: number };
  recurring: { activePlans: number; mrr: number };
  queues: { pendingReceipts: number; pendingCompliance: number; pendingRefunds: number };
  byStatus: { status: string; count: number; amount: number }[];
  topSources: { sourceId: string; name: string; amount: number; count: number }[];
  initiatives: { id: string; name: string; goalAmount: number | null; raisedAmount: number; donorCount: number; endDate: string | null }[];
}

interface Donation {
  id: string; amount: number; feeAmount: number; netAmount: number; currency: string;
  donationType: string; status: string; paymentMethod: string | null; method: string | null;
  complianceStatus: string; receiptStatus: string; isRecurring: boolean; isAnonymous: boolean;
  notes: string | null; donationDate: string; externalTransactionId: string | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null } | null;
  recordedBy: { id: string; name: string | null };
  source: { id: string; name: string } | null;
  fundraisingCampaign: { id: string; name: string } | null;
  receipt: { id: string; receiptNumber: string; receiptStatus: string } | null;
}

interface Donor {
  id: string; campaignId: string; contactId: string;
  donorStatus: string; donorTier: string; lifetimeGiving: number;
  firstDonationDate: string | null; lastDonationDate: string | null;
  largestDonation: number | null; donationCount: number; recurringDonor: boolean;
  notes: string | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null; phone: string | null; ward: string | null; deletedAt: string | null };
}

interface Initiative {
  id: string; name: string; description: string | null; goalAmount: number | null;
  raisedAmount: number; donorCount: number; status: string;
  startDate: string; endDate: string | null;
}

interface RecurrencePlan {
  id: string; amount: number; currency: string; frequency: string; status: string;
  startDate: string; nextChargeDate: string | null; failureCount: number;
  contact: { id: string; firstName: string; lastName: string; email: string | null } | null;
  _count: { donations: number };
}

interface Pledge {
  id: string; pledgedAmount: number; fulfilledAmount: number; status: string;
  pledgeDate: string; dueDate: string | null; notes: string | null;
  contact: { id: string; firstName: string; lastName: string; email: string | null } | null;
  fundraisingCampaign: { id: string; name: string } | null;
}

interface ReceiptItem {
  id: string; receiptNumber: string; issuedDate: string | null; receiptStatus: string; sentAt: string | null;
  donation: { id: string; amount: number; donationDate: string; contact: { id: string; firstName: string; lastName: string; email: string | null } | null };
  sentBy: { id: string; name: string | null } | null;
}

interface Refund {
  id: string; refundAmount: number; refundReason: string; refundDate: string; status: string;
  donation: { id: string; amount: number; donationDate: string; paymentMethod: string | null; contact: { id: string; firstName: string; lastName: string } | null };
  processedBy: { id: string; name: string | null } | null;
  approvedBy: { id: string; name: string | null } | null;
}

type Tab = "overview" | "campaigns" | "donors" | "donations" | "receipts" | "recurring" | "pledges" | "compliance" | "reports";

interface ComplianceConfig {
  annualLimitPerDonor: number;
  anonymousLimit: number;
  allowCorporate: boolean;
  allowUnion: boolean;
  blockMode: "review" | "block";
  warningThreshold: number;
  notes: string | null;
  updatedBy: { id: string; name: string | null } | null;
  updatedAt: string | null;
}

interface ReportSummary {
  period: { from: string; to: string };
  totalRaised: number; totalNet: number; totalFees: number; totalRefunded: number;
  totalDonations: number; avgGift: number; uniqueDonors: number;
}

interface ReportData {
  summary: ReportSummary;
  timeSeries: { period: string; amount: number; net: number; count: number }[];
  byMethod: { method: string; amount: number; count: number }[];
  bySource: { sourceId: string | null; name: string; amount: number; count: number }[];
  byInitiative: { initiativeId: string | null; name: string; amount: number; count: number }[];
  byCompliance: { status: string; amount: number; count: number }[];
  topDonors: { contactId: string | null; name: string; amount: number; count: number }[];
}

/* ─── helpers ────────────────────────────────────────────────────────────── */

function fmt(amount: number, currency = "CAD") {
  return new Intl.NumberFormat("en-CA", { style: "currency", currency }).format(amount);
}

function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden rounded bg-gray-100 ${className}`}>
      <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/60 to-transparent animate-[shimmer_1.5s_infinite]" />
    </div>
  );
}

const STATUS_BADGE: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  pledged:            { label: "Pledged",         variant: "default" },
  processing:         { label: "Processing",       variant: "warning" },
  processed:          { label: "Processed",        variant: "success" },
  receipted:          { label: "Receipted",        variant: "success" },
  failed:             { label: "Failed",           variant: "danger" },
  cancelled:          { label: "Cancelled",        variant: "default" },
  refunded:           { label: "Refunded",         variant: "danger" },
  partially_refunded: { label: "Part. Refunded",   variant: "warning" },
};

const COMPLIANCE_BADGE: Record<string, { label: string; color: string }> = {
  approved:   { label: "Approved",    color: GREEN },
  pending:    { label: "Pending",     color: AMBER },
  flagged:    { label: "Flagged",     color: AMBER },
  over_limit: { label: "Over Limit",  color: RED },
  blocked:    { label: "Blocked",     color: RED },
  exempted:   { label: "Exempted",    color: NAVY },
};

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */

export default function FundraisingClient({ campaignId }: { campaignId: string }) {
  const [tab, setTab] = useState<Tab>("overview");
  const [stats, setStats] = useState<Stats | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);

  // ── Donations ──
  const [donations, setDonations] = useState<Donation[]>([]);
  const [donationsTotal, setDonationsTotal] = useState(0);
  const [donationsPage, setDonationsPage] = useState(1);
  const [donationsLoading, setDonationsLoading] = useState(false);
  const [donationSearch, setDonationSearch] = useState("");
  const [donationStatusFilter, setDonationStatusFilter] = useState("all");
  const [donationComplianceFilter, setDonationComplianceFilter] = useState("all");

  // ── Donors ──
  const [donors, setDonors] = useState<Donor[]>([]);
  const [donorsTotal, setDonorsTotal] = useState(0);
  const [donorsPage, setDonorsPage] = useState(1);
  const [donorsLoading, setDonorsLoading] = useState(false);
  const [donorSearch, setDonorSearch] = useState("");
  const [donorStatusFilter, setDonorStatusFilter] = useState("all");

  // ── Initiatives ──
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [initiativesLoading, setInitiativesLoading] = useState(false);

  // ── Recurring ──
  const [plans, setPlans] = useState<RecurrencePlan[]>([]);
  const [plansLoading, setPlansLoading] = useState(false);
  const [plansPage, setPlansPage] = useState(1);
  const [plansTotal, setPlansTotal] = useState(0);

  // ── Pledges ──
  const [pledges, setPledges] = useState<Pledge[]>([]);
  const [pledgesLoading, setPledgesLoading] = useState(false);
  const [pledgesPage, setPledgesPage] = useState(1);
  const [pledgesTotal, setPledgesTotal] = useState(0);

  // ── Receipts ──
  const [receipts, setReceipts] = useState<ReceiptItem[]>([]);
  const [receiptsLoading, setReceiptsLoading] = useState(false);
  const [receiptsPage, setReceiptsPage] = useState(1);
  const [receiptsTotal, setReceiptsTotal] = useState(0);

  // ── Refunds ──
  const [refunds, setRefunds] = useState<Refund[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  const [refundsPage, setRefundsPage] = useState(1);
  const [refundsTotal, setRefundsTotal] = useState(0);

  // ── Compliance Config ──
  const [complianceConfig, setComplianceConfig] = useState<ComplianceConfig | null>(null);
  const [complianceConfigLoading, setComplianceConfigLoading] = useState(false);
  const [complianceConfigSaving, setComplianceConfigSaving] = useState(false);
  const [configForm, setConfigForm] = useState<Omit<ComplianceConfig, "updatedBy" | "updatedAt">>({
    annualLimitPerDonor: 1200, anonymousLimit: 25, allowCorporate: false,
    allowUnion: false, blockMode: "review", warningThreshold: 0.9, notes: null,
  });

  // ── Reports ──
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportPeriod, setReportPeriod] = useState("year");
  const [reportGroupBy, setReportGroupBy] = useState("month");
  const [reportFrom, setReportFrom] = useState("");
  const [reportTo, setReportTo] = useState("");

  // ── Overview Chart ──
  const [overviewChart, setOverviewChart] = useState<{ period: string; amount: number; count: number }[]>([]);
  const [overviewChartLoading, setOverviewChartLoading] = useState(false);

  // ── Modals ──
  const [showAddDonation, setShowAddDonation] = useState(false);
  const [showAddInitiative, setShowAddInitiative] = useState(false);
  const [selectedDonation, setSelectedDonation] = useState<Donation | null>(null);

  /* ── fetchers ─────────────────────────────────────────────────────────── */

  const fetchStats = useCallback(async () => {
    setStatsLoading(true);
    try {
      const r = await fetch(`/api/fundraising/stats?campaignId=${campaignId}`);
      if (r.ok) setStats((await r.json()).data);
    } finally {
      setStatsLoading(false);
    }
  }, [campaignId]);

  const fetchComplianceConfig = useCallback(async () => {
    setComplianceConfigLoading(true);
    try {
      const r = await fetch(`/api/fundraising/compliance-config?campaignId=${campaignId}`);
      if (r.ok) {
        const cfg: ComplianceConfig = (await r.json()).data;
        setComplianceConfig(cfg);
        setConfigForm({
          annualLimitPerDonor: cfg.annualLimitPerDonor,
          anonymousLimit: cfg.anonymousLimit,
          allowCorporate: cfg.allowCorporate,
          allowUnion: cfg.allowUnion,
          blockMode: cfg.blockMode,
          warningThreshold: cfg.warningThreshold,
          notes: cfg.notes,
        });
      }
    } finally { setComplianceConfigLoading(false); }
  }, [campaignId]);

  const saveComplianceConfig = async () => {
    setComplianceConfigSaving(true);
    try {
      const r = await fetch("/api/fundraising/compliance-config", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, ...configForm }),
      });
      if (r.ok) { setComplianceConfig((await r.json()).data); toast.success("Compliance limits saved"); }
      else { const e = await r.json(); toast.error(e.error ?? "Failed to save"); }
    } finally { setComplianceConfigSaving(false); }
  };

  const fetchReport = useCallback(async () => {
    setReportLoading(true);
    try {
      const p = new URLSearchParams({ campaignId, period: reportPeriod, groupBy: reportGroupBy });
      if (reportPeriod === "custom" && reportFrom) p.set("from", reportFrom);
      if (reportPeriod === "custom" && reportTo) p.set("to", reportTo);
      const r = await fetch(`/api/fundraising/reports?${p}`);
      if (r.ok) setReportData((await r.json()).data);
    } finally { setReportLoading(false); }
  }, [campaignId, reportPeriod, reportGroupBy, reportFrom, reportTo]);

  const downloadCsv = () => {
    const p = new URLSearchParams({ campaignId, period: reportPeriod, groupBy: reportGroupBy, format: "csv" });
    if (reportPeriod === "custom" && reportFrom) p.set("from", reportFrom);
    if (reportPeriod === "custom" && reportTo) p.set("to", reportTo);
    window.open(`/api/fundraising/reports?${p}`, "_blank");
  };

  const fetchDonations = useCallback(async () => {
    setDonationsLoading(true);
    try {
      const params = new URLSearchParams({
        campaignId,
        page: String(donationsPage),
        pageSize: "25",
        ...(donationSearch ? { search: donationSearch } : {}),
        ...(donationStatusFilter !== "all" ? { status: donationStatusFilter } : {}),
        ...(donationComplianceFilter !== "all" ? { complianceStatus: donationComplianceFilter } : {}),
      });
      const r = await fetch(`/api/fundraising/donations?${params}`);
      if (r.ok) { const d = await r.json(); setDonations(d.data); setDonationsTotal(d.total); }
    } finally { setDonationsLoading(false); }
  }, [campaignId, donationsPage, donationSearch, donationStatusFilter, donationComplianceFilter]);

  const fetchDonors = useCallback(async () => {
    setDonorsLoading(true);
    try {
      const params = new URLSearchParams({
        campaignId,
        page: String(donorsPage),
        ...(donorSearch ? { search: donorSearch } : {}),
        ...(donorStatusFilter !== "all" ? { status: donorStatusFilter } : {}),
      });
      const r = await fetch(`/api/fundraising/donors?${params}`);
      if (r.ok) { const d = await r.json(); setDonors(d.data); setDonorsTotal(d.total); }
    } finally { setDonorsLoading(false); }
  }, [campaignId, donorsPage, donorSearch, donorStatusFilter]);

  const fetchInitiatives = useCallback(async () => {
    setInitiativesLoading(true);
    try {
      const r = await fetch(`/api/fundraising/campaigns?campaignId=${campaignId}`);
      if (r.ok) setInitiatives((await r.json()).data);
    } finally { setInitiativesLoading(false); }
  }, [campaignId]);

  const fetchPlans = useCallback(async () => {
    setPlansLoading(true);
    try {
      const r = await fetch(`/api/fundraising/recurring?campaignId=${campaignId}&page=${plansPage}`);
      if (r.ok) { const d = await r.json(); setPlans(d.data); setPlansTotal(d.total); }
    } finally { setPlansLoading(false); }
  }, [campaignId, plansPage]);

  const fetchPledges = useCallback(async () => {
    setPledgesLoading(true);
    try {
      const r = await fetch(`/api/fundraising/pledges?campaignId=${campaignId}&page=${pledgesPage}`);
      if (r.ok) { const d = await r.json(); setPledges(d.data); setPledgesTotal(d.total); }
    } finally { setPledgesLoading(false); }
  }, [campaignId, pledgesPage]);

  const fetchReceipts = useCallback(async () => {
    setReceiptsLoading(true);
    try {
      const r = await fetch(`/api/fundraising/receipts?campaignId=${campaignId}&page=${receiptsPage}`);
      if (r.ok) { const d = await r.json(); setReceipts(d.data); setReceiptsTotal(d.total); }
    } finally { setReceiptsLoading(false); }
  }, [campaignId, receiptsPage]);

  const fetchRefunds = useCallback(async () => {
    setRefundsLoading(true);
    try {
      const r = await fetch(`/api/fundraising/refunds?campaignId=${campaignId}&page=${refundsPage}`);
      if (r.ok) { const d = await r.json(); setRefunds(d.data); setRefundsTotal(d.total); }
    } finally { setRefundsLoading(false); }
  }, [campaignId, refundsPage]);

  const fetchOverviewChart = useCallback(async () => {
    setOverviewChartLoading(true);
    try {
      const r = await fetch(`/api/fundraising/reports?campaignId=${campaignId}&period=year&groupBy=month`);
      if (r.ok) { const d = await r.json(); setOverviewChart(d.data?.timeSeries ?? []); }
    } finally { setOverviewChartLoading(false); }
  }, [campaignId]);

  // Load stats + overview chart on mount
  useEffect(() => { fetchStats(); fetchOverviewChart(); }, [fetchStats, fetchOverviewChart]);

  // Load tab data on tab change
  useEffect(() => {
    if (tab === "donations" || tab === "compliance") fetchDonations();
    if (tab === "donors") fetchDonors();
    if (tab === "campaigns") fetchInitiatives();
    if (tab === "recurring") fetchPlans();
    if (tab === "pledges") fetchPledges();
    if (tab === "receipts") fetchReceipts();
    if (tab === "compliance") fetchComplianceConfig();
    if (tab === "reports") fetchReport();
  }, [tab]); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-fetch donations when filters change
  useEffect(() => {
    if (tab === "donations" || tab === "compliance") fetchDonations();
  }, [fetchDonations]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (tab === "donors") fetchDonors();
  }, [fetchDonors]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ── add donation ─────────────────────────────────────────────────────── */

  const [addForm, setAddForm] = useState({
    amount: "", method: "cash", notes: "", donationType: "one_time",
    externalTransactionId: "",
  });
  const [addLoading, setAddLoading] = useState(false);

  const handleAddDonation = async () => {
    if (!addForm.amount || parseFloat(addForm.amount) <= 0) {
      toast.error("Enter a valid amount"); return;
    }
    setAddLoading(true);
    try {
      const res = await fetch("/api/fundraising/donations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          amount: parseFloat(addForm.amount),
          method: addForm.method,
          paymentMethod: addForm.method,
          donationType: addForm.donationType,
          notes: addForm.notes || undefined,
          externalTransactionId: addForm.externalTransactionId || undefined,
          isAnonymous: true,
          donationDate: new Date().toISOString(),
        }),
      });
      if (!res.ok) {
        const e = await res.json();
        toast.error(e.error ?? "Failed to add donation");
        return;
      }
      toast.success("Donation recorded");
      setShowAddDonation(false);
      setAddForm({ amount: "", method: "cash", notes: "", donationType: "one_time", externalTransactionId: "" });
      fetchStats();
      if (tab === "donations") fetchDonations();
    } finally { setAddLoading(false); }
  };

  /* ── compliance action ────────────────────────────────────────────────── */

  const handleComplianceAction = async (donationId: string, action: "approved" | "exempted" | "blocked") => {
    const res = await fetch(`/api/fundraising/donations/${donationId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ complianceStatus: action }),
    });
    if (res.ok) {
      toast.success(`Donation ${action}`);
      fetchDonations();
      fetchStats();
    } else {
      toast.error("Action failed");
    }
  };

  /* ── receipt generate ─────────────────────────────────────────────────── */

  const handleGenerateReceipt = async (donationId: string) => {
    const res = await fetch("/api/fundraising/receipts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ campaignId, donationId }),
    });
    if (res.ok) {
      toast.success("Receipt generated");
      if (tab === "receipts") fetchReceipts();
      if (tab === "donations") fetchDonations();
    } else {
      const e = await res.json();
      toast.error(e.error ?? "Failed to generate receipt");
    }
  };

  /* ── refund action ────────────────────────────────────────────────────── */

  const handleRefundAction = async (refundId: string, action: "approve" | "reject" | "process") => {
    const res = await fetch(`/api/fundraising/refunds/${refundId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.success(`Refund ${action}d`);
      fetchRefunds();
      fetchStats();
    } else toast.error("Action failed");
  };

  /* ── plan action ──────────────────────────────────────────────────────── */

  const handlePlanAction = async (planId: string, action: "pause" | "resume" | "cancel") => {
    const res = await fetch(`/api/fundraising/recurring/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (res.ok) {
      toast.success(`Plan ${action}d`);
      fetchPlans();
      fetchStats();
    } else toast.error("Action failed");
  };

  /* ── compliance donations filtered ───────────────────────────────────── */

  const complianceDonations = useMemo(
    () => donations.filter((d) => ["flagged", "over_limit", "blocked"].includes(d.complianceStatus)),
    [donations],
  );

  /* ─── tab nav ────────────────────────────────────────────────────────── */

  const TABS: { id: Tab; label: string; badge?: number }[] = [
    { id: "overview",    label: "Overview" },
    { id: "campaigns",   label: "Campaigns" },
    { id: "donors",      label: "Donors" },
    { id: "donations",   label: "Donations" },
    { id: "receipts",    label: "Receipts",    badge: stats?.queues.pendingReceipts || undefined },
    { id: "recurring",   label: "Recurring",   badge: stats?.recurring.activePlans || undefined },
    { id: "pledges",     label: "Pledges" },
    { id: "compliance",  label: "Compliance",  badge: stats?.queues.pendingCompliance || undefined },
    { id: "reports",     label: "Reports" },
  ];

  /* ─── render ─────────────────────────────────────────────────────────── */

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      {/* ── header ── */}
      <div style={{ backgroundColor: NAVY }} className="px-6 py-4">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white">Fundraising</h1>
              <p className="text-blue-200 text-sm mt-0.5">Revenue operating system for your campaign</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
              onClick={() => setShowAddDonation(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
              style={{ backgroundColor: GREEN, color: "white" }}
            >
              <Plus className="w-4 h-4" /> Record Donation
            </motion.button>
          </div>

          {/* KPI strip */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {([
              { label: "Total Raised", value: fmt(stats?.allTime.raised ?? 0), sub: `${stats?.allTime.count ?? 0} donations`, icon: DollarSign, color: GREEN },
              { label: "Net Revenue", value: fmt(stats?.allTime.net ?? 0), sub: "after fees", icon: TrendingUp, color: GREEN },
              { label: "This Month", value: fmt(stats?.thisMonth.raised ?? 0), sub: `${stats?.thisMonth.count ?? 0} gifts`, icon: BarChart3, color: "#60a5fa" },
              { label: "Monthly Recurring", value: fmt(stats?.recurring.mrr ?? 0), sub: `${stats?.recurring.activePlans ?? 0} active plans`, icon: Repeat, color: AMBER },
              { label: "Total Donors", value: String(stats?.donors.total ?? 0), sub: `+${stats?.donors.newLast30 ?? 0} last 30 days`, icon: Users, color: "#a78bfa" },
              { label: "Avg Gift", value: fmt(stats?.allTime.avgGift ?? 0), sub: "all time", icon: Wallet, color: "#60a5fa" },
            ] as const).map((k) => (
              <div key={k.label} className="bg-white/10 rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs text-blue-200 font-medium">{k.label}</span>
                  <k.icon className="w-3.5 h-3.5" style={{ color: k.color }} />
                </div>
                {statsLoading ? <div className="h-5 bg-white/20 rounded w-20 animate-pulse" /> : (
                  <p className="text-lg font-bold text-white">{k.value}</p>
                )}
                {!statsLoading && <p className="text-xs text-blue-300">{k.sub}</p>}
              </div>
            ))}
          </div>

          {/* tabs */}
          <div className="flex gap-1 overflow-x-auto pb-0">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`px-3 py-1.5 rounded-t-lg text-sm font-medium whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                  tab === t.id ? "bg-gray-50 text-gray-900" : "text-blue-200 hover:text-white"
                }`}
              >
                {t.label}
                {t.badge ? (
                  <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${tab === t.id ? "bg-amber-100 text-amber-700" : "bg-white/20 text-white"}`}>
                    {t.badge}
                  </span>
                ) : null}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── body ── */}
      <div className="max-w-7xl mx-auto w-full px-4 py-6">
        <AnimatePresence mode="wait">
          <motion.div key={tab} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>

            {/* ─── OVERVIEW ─────────────────────────────────────────── */}
            {tab === "overview" && (
              <div className="space-y-6">
                {/* Queue alerts */}
                {!statsLoading && ((stats?.queues.pendingCompliance ?? 0) > 0 || (stats?.queues.pendingRefunds ?? 0) > 0 || (stats?.queues.pendingReceipts ?? 0) > 0) && (
                  <div className="flex flex-wrap gap-3">
                    {(stats?.queues.pendingCompliance ?? 0) > 0 && (
                      <button onClick={() => setTab("compliance")} className="flex items-center gap-2 px-4 py-2 bg-amber-50 border border-amber-200 rounded-lg text-sm font-medium text-amber-800 hover:bg-amber-100 transition-colors">
                        <ShieldAlert className="w-4 h-4 text-amber-500" />
                        {stats!.queues.pendingCompliance} compliance review{stats!.queues.pendingCompliance !== 1 ? "s" : ""} pending
                      </button>
                    )}
                    {(stats?.queues.pendingRefunds ?? 0) > 0 && (
                      <button onClick={() => setTab("donations")} className="flex items-center gap-2 px-4 py-2 bg-red-50 border border-red-200 rounded-lg text-sm font-medium text-red-800 hover:bg-red-100 transition-colors">
                        <RefreshCw className="w-4 h-4 text-red-500" />
                        {stats!.queues.pendingRefunds} refund{stats!.queues.pendingRefunds !== 1 ? "s" : ""} pending
                      </button>
                    )}
                    {(stats?.queues.pendingReceipts ?? 0) > 0 && (
                      <button onClick={() => setTab("receipts")} className="flex items-center gap-2 px-4 py-2 bg-blue-50 border border-blue-200 rounded-lg text-sm font-medium text-blue-800 hover:bg-blue-100 transition-colors">
                        <Receipt className="w-4 h-4 text-blue-500" />
                        {stats!.queues.pendingReceipts} receipt{stats!.queues.pendingReceipts !== 1 ? "s" : ""} to generate
                      </button>
                    )}
                  </div>
                )}

                {/* Revenue trend chart */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <TrendingUp className="w-4 h-4 text-gray-400" />
                        <span className="font-semibold text-sm text-gray-800">Revenue — {new Date().getFullYear()}</span>
                      </div>
                      {!overviewChartLoading && overviewChart.length > 0 && (
                        <span className="text-xs text-gray-400">Monthly</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {overviewChartLoading ? (
                      <Shimmer className="h-40" />
                    ) : overviewChart.length === 0 ? (
                      <div className="h-40 flex items-center justify-center">
                        <div className="text-center">
                          <BarChart3 className="w-8 h-8 mx-auto mb-2 text-gray-200" />
                          <p className="text-sm text-gray-400">No revenue data this year yet</p>
                        </div>
                      </div>
                    ) : (
                      <ResponsiveContainer width="100%" height={160}>
                        <AreaChart data={overviewChart} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                          <defs>
                            <linearGradient id="overviewGrad" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={GREEN} stopOpacity={0.18} />
                              <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                          <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                          <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(1)}k`} />
                          <Tooltip formatter={(value: unknown) => [fmt(typeof value === "number" ? value : 0), "Raised"]} contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} />
                          <Area type="monotone" dataKey="amount" stroke={GREEN} strokeWidth={2} fill="url(#overviewGrad)" dot={{ r: 3, fill: GREEN, strokeWidth: 0 }} />
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </CardContent>
                </Card>

                <div className="grid md:grid-cols-2 gap-6">
                  {/* By-status */}
                  <Card>
                    <CardHeader><h3 className="font-semibold text-gray-800">Donations by Status</h3></CardHeader>
                    <CardContent>
                      {statsLoading ? (
                        <div className="space-y-2">{[...Array(4)].map((_, i) => <Shimmer key={i} className="h-8" />)}</div>
                      ) : !stats?.byStatus.length ? (
                        <EmptyState
                          title="No donations yet"
                          description="Record your first donation to get started."
                          action={
                            <button
                              onClick={() => setShowAddDonation(true)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors"
                              style={{ backgroundColor: GREEN }}
                            >
                              <Plus className="w-4 h-4" /> Record Donation
                            </button>
                          }
                        />
                      ) : (
                        <div className="space-y-2">
                          {stats.byStatus.map((s) => (
                            <div key={s.status} className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={STATUS_BADGE[s.status]?.variant ?? "default"}>
                                  {STATUS_BADGE[s.status]?.label ?? s.status}
                                </Badge>
                                <span className="text-sm text-gray-500">{s.count} donation{s.count !== 1 ? "s" : ""}</span>
                              </div>
                              <span className="font-medium text-gray-800">{fmt(s.amount)}</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Top sources */}
                  <Card>
                    <CardHeader><h3 className="font-semibold text-gray-800">Giving by Source — Last 30 Days</h3></CardHeader>
                    <CardContent>
                      {statsLoading ? (
                        <Shimmer className="h-40" />
                      ) : !stats?.topSources.length ? (
                        <EmptyState title="No source data" description="Create donation sources to track attribution." />
                      ) : (
                        <>
                          <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={stats.topSources} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="name" tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 11, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(value) => [fmt(typeof value === "number" ? value : 0), "Raised"]} contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} />
                              <Bar dataKey="amount" fill={GREEN} radius={[4, 4, 0, 0]} />
                            </BarChart>
                          </ResponsiveContainer>
                          <div className="space-y-1.5 mt-3">
                            {stats.topSources.map((s) => (
                              <div key={s.sourceId} className="flex items-center justify-between text-sm">
                                <span className="text-gray-600">{s.name} <span className="text-xs text-gray-400">({s.count} gifts)</span></span>
                                <span className="font-semibold" style={{ color: GREEN }}>{fmt(s.amount)}</span>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Active initiatives */}
                {stats?.initiatives && stats.initiatives.length > 0 && (
                  <Card>
                    <CardHeader className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">Active Fundraising Initiatives</h3>
                      <button onClick={() => setTab("campaigns")} className="text-sm font-medium" style={{ color: GREEN }}>View all</button>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {stats.initiatives.map((init) => {
                          const pct = init.goalAmount ? Math.min(100, (init.raisedAmount / init.goalAmount) * 100) : null;
                          return (
                            <div key={init.id}>
                              <div className="flex items-center justify-between mb-1">
                                <span className="font-medium text-gray-800">{init.name}</span>
                                <span className="text-sm font-semibold" style={{ color: GREEN }}>
                                  {fmt(init.raisedAmount)}{init.goalAmount ? ` / ${fmt(init.goalAmount)}` : ""}
                                </span>
                              </div>
                              {pct !== null && (
                                <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                                  <div className="h-2 rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? GREEN : AMBER }} />
                                </div>
                              )}
                              <div className="flex gap-4 mt-1 text-xs text-gray-400">
                                <span>{init.donorCount} donors</span>
                                {init.endDate && <span>Ends {new Date(init.endDate).toLocaleDateString()}</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* Empty overview */}
                {!statsLoading && !stats?.allTime.count && (
                  <Card>
                    <CardContent className="py-16 text-center">
                      <DollarSign className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                      <h3 className="text-lg font-semibold text-gray-700 mb-1">No donations yet</h3>
                      <p className="text-sm text-gray-400 mb-4">Start by recording an offline donation or setting up a donation page.</p>
                      <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                        onClick={() => setShowAddDonation(true)}
                        className="px-4 py-2 rounded-lg text-sm font-semibold text-white"
                        style={{ backgroundColor: GREEN }}>
                        Record First Donation
                      </motion.button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* ─── DONATIONS LEDGER ─────────────────────────────────── */}
            {tab === "donations" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2"
                      placeholder="Search donor, transaction, notes..."
                      value={donationSearch}
                      onChange={(e) => { setDonationSearch(e.target.value); setDonationsPage(1); }}
                    />
                  </div>
                  <select className="border rounded-lg px-3 py-2 text-sm bg-white"
                    value={donationStatusFilter} onChange={(e) => { setDonationStatusFilter(e.target.value); setDonationsPage(1); }}>
                    <option value="all">All Statuses</option>
                    <option value="pledged">Pledged</option>
                    <option value="processed">Processed</option>
                    <option value="receipted">Receipted</option>
                    <option value="failed">Failed</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="refunded">Refunded</option>
                  </select>
                  <select className="border rounded-lg px-3 py-2 text-sm bg-white"
                    value={donationComplianceFilter} onChange={(e) => { setDonationComplianceFilter(e.target.value); setDonationsPage(1); }}>
                    <option value="all">All Compliance</option>
                    <option value="approved">Approved</option>
                    <option value="flagged">Flagged</option>
                    <option value="over_limit">Over Limit</option>
                    <option value="blocked">Blocked</option>
                  </select>
                </div>

                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-gray-500 uppercase">
                          <th className="text-left px-4 py-3 font-medium">Donor</th>
                          <th className="text-right px-4 py-3 font-medium">Amount</th>
                          <th className="text-left px-4 py-3 font-medium">Method</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Compliance</th>
                          <th className="text-left px-4 py-3 font-medium">Date</th>
                          <th className="text-left px-4 py-3 font-medium">Receipt</th>
                          <th className="px-4 py-3" />
                        </tr>
                      </thead>
                      <tbody>
                        {donationsLoading ? (
                          [...Array(8)].map((_, i) => (
                            <tr key={i} className="border-b">
                              {[...Array(8)].map((_, j) => <td key={j} className="px-4 py-3"><Shimmer className="h-4" /></td>)}
                            </tr>
                          ))
                        ) : donations.length === 0 ? (
                          <tr><td colSpan={8} className="px-4 py-12 text-center">
                            <EmptyState
                              title="No donations"
                              description="Record your first donation using the button above, or use the filters to broaden your search."
                              action={
                                <button
                                  onClick={() => setShowAddDonation(true)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors"
                                  style={{ backgroundColor: GREEN }}
                                >
                                  <Plus className="w-4 h-4" /> Record Donation
                                </button>
                              }
                            />
                          </td></tr>
                        ) : donations.map((d) => (
                          <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="border-b hover:bg-gray-50 cursor-pointer"
                            onClick={() => setSelectedDonation(d)}>
                            <td className="px-4 py-3">
                              {d.isAnonymous ? <span className="text-gray-400 italic">Anonymous</span>
                                : d.contact ? <span className="font-medium text-gray-800">{d.contact.firstName} {d.contact.lastName}</span>
                                : <span className="text-gray-400">—</span>}
                            </td>
                            <td className="px-4 py-3 text-right font-semibold" style={{ color: GREEN }}>{fmt(d.amount, d.currency)}</td>
                            <td className="px-4 py-3 text-gray-600 capitalize">{d.paymentMethod?.replace(/_/g, " ") ?? d.method ?? "—"}</td>
                            <td className="px-4 py-3">
                              <Badge variant={STATUS_BADGE[d.status]?.variant ?? "default"}>
                                {STATUS_BADGE[d.status]?.label ?? d.status}
                              </Badge>
                            </td>
                            <td className="px-4 py-3">
                              {d.complianceStatus !== "approved" && d.complianceStatus !== "pending" && (
                                <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                                  style={{ backgroundColor: `${COMPLIANCE_BADGE[d.complianceStatus]?.color ?? AMBER}20`, color: COMPLIANCE_BADGE[d.complianceStatus]?.color ?? AMBER }}>
                                  {COMPLIANCE_BADGE[d.complianceStatus]?.label ?? d.complianceStatus}
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{new Date(d.donationDate).toLocaleDateString()}</td>
                            <td className="px-4 py-3">
                              {d.receipt ? <span className="text-xs text-gray-500">{d.receipt.receiptNumber}</span>
                                : d.status === "processed" ? (
                                  <button className="text-xs font-medium" style={{ color: GREEN }}
                                    onClick={(e) => { e.stopPropagation(); handleGenerateReceipt(d.id); }}>Generate</button>
                                ) : null}
                            </td>
                            <td className="px-4 py-3"><Eye className="w-4 h-4 text-gray-400" /></td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {donationsTotal > 25 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <span className="text-xs text-gray-500">{donationsTotal} total</span>
                      <div className="flex gap-2">
                        <button disabled={donationsPage === 1} onClick={() => setDonationsPage((p) => p - 1)}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-xs text-gray-600 px-2 py-1">Page {donationsPage}</span>
                        <button disabled={donationsPage * 25 >= donationsTotal} onClick={() => setDonationsPage((p) => p + 1)}
                          className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ─── DONORS ───────────────────────────────────────────── */}
            {tab === "donors" && (
              <div className="space-y-4">
                <div className="flex flex-wrap gap-3">
                  <div className="relative flex-1 min-w-[200px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm focus:outline-none"
                      placeholder="Search donors..." value={donorSearch}
                      onChange={(e) => { setDonorSearch(e.target.value); setDonorsPage(1); }} />
                  </div>
                  <select className="border rounded-lg px-3 py-2 text-sm bg-white"
                    value={donorStatusFilter} onChange={(e) => { setDonorStatusFilter(e.target.value); setDonorsPage(1); }}>
                    <option value="all">All Donors</option>
                    <option value="first_time">First-Time</option>
                    <option value="repeat">Repeat</option>
                    <option value="recurring">Recurring</option>
                    <option value="major">Major</option>
                    <option value="lapsed">Lapsed</option>
                    <option value="champion">Champion</option>
                  </select>
                </div>
                <Card>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-xs text-gray-500 uppercase">
                          <th className="text-left px-4 py-3 font-medium">Donor</th>
                          <th className="text-left px-4 py-3 font-medium">Status</th>
                          <th className="text-left px-4 py-3 font-medium">Tier</th>
                          <th className="text-right px-4 py-3 font-medium">Lifetime</th>
                          <th className="text-right px-4 py-3 font-medium">Gifts</th>
                          <th className="text-left px-4 py-3 font-medium">Last Gift</th>
                          <th className="text-left px-4 py-3 font-medium">Recurring</th>
                        </tr>
                      </thead>
                      <tbody>
                        {donorsLoading ? (
                          [...Array(8)].map((_, i) => <tr key={i} className="border-b">{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><Shimmer className="h-4" /></td>)}</tr>)
                        ) : donors.length === 0 ? (
                          <tr><td colSpan={7} className="px-4 py-12 text-center">
                            <EmptyState title="No donor profiles" description="Profiles are created automatically when donations are linked to contacts." />
                          </td></tr>
                        ) : donors.map((d) => (
                          <motion.tr key={d.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            className="border-b hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div>
                                <p className="font-medium text-gray-800">{d.contact.firstName} {d.contact.lastName}</p>
                                {d.contact.email && <p className="text-xs text-gray-400">{d.contact.email}</p>}
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700 capitalize">{d.donorStatus.replace(/_/g, " ")}</span>
                            </td>
                            <td className="px-4 py-3 capitalize text-xs font-medium text-gray-600">{d.donorTier}</td>
                            <td className="px-4 py-3 text-right font-semibold" style={{ color: GREEN }}>{fmt(d.lifetimeGiving)}</td>
                            <td className="px-4 py-3 text-right text-gray-600">{d.donationCount}</td>
                            <td className="px-4 py-3 text-gray-500 text-xs">{d.lastDonationDate ? new Date(d.lastDonationDate).toLocaleDateString() : "—"}</td>
                            <td className="px-4 py-3">{d.recurringDonor ? <Repeat className="w-4 h-4" style={{ color: GREEN }} /> : null}</td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {donorsTotal > 25 && (
                    <div className="flex items-center justify-between px-4 py-3 border-t">
                      <span className="text-xs text-gray-500">{donorsTotal} donors</span>
                      <div className="flex gap-2">
                        <button disabled={donorsPage === 1} onClick={() => setDonorsPage((p) => p - 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
                        <span className="text-xs text-gray-600 px-2 py-1">Page {donorsPage}</span>
                        <button disabled={donorsPage * 25 >= donorsTotal} onClick={() => setDonorsPage((p) => p + 1)} className="p-1 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
                      </div>
                    </div>
                  )}
                </Card>
              </div>
            )}

            {/* ─── CAMPAIGNS ────────────────────────────────────────── */}
            {tab === "campaigns" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    onClick={() => setShowAddInitiative(true)}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white"
                    style={{ backgroundColor: NAVY }}>
                    <Plus className="w-4 h-4" /> New Campaign
                  </motion.button>
                </div>
                {initiativesLoading ? (
                  <div className="grid md:grid-cols-2 gap-4">{[...Array(4)].map((_, i) => <Shimmer key={i} className="h-32" />)}</div>
                ) : initiatives.length === 0 ? (
                  <Card>
                    <CardContent className="py-12">
                      <EmptyState
                        title="No campaigns yet"
                        description="Create a fundraising campaign to track donations toward a specific goal."
                        action={
                          <button
                            onClick={() => setShowAddInitiative(true)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-semibold text-white transition-colors"
                            style={{ backgroundColor: NAVY }}
                          >
                            <Plus className="w-4 h-4" /> New Campaign
                          </button>
                        }
                      />
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid md:grid-cols-2 gap-4">
                    {initiatives.map((init) => {
                      const pct = init.goalAmount ? Math.min(100, (init.raisedAmount / init.goalAmount) * 100) : null;
                      return (
                        <Card key={init.id}>
                          <CardContent className="pt-4">
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <p className="font-semibold text-gray-800">{init.name}</p>
                                {init.description && <p className="text-xs text-gray-500 mt-0.5">{init.description}</p>}
                              </div>
                              <Badge variant={init.status === "active" ? "success" : "default"}>{init.status}</Badge>
                            </div>
                            <div className="flex items-center justify-between mb-2">
                              <span className="text-2xl font-bold" style={{ color: GREEN }}>{fmt(init.raisedAmount)}</span>
                              {init.goalAmount && <span className="text-sm text-gray-500">of {fmt(init.goalAmount)}</span>}
                            </div>
                            {pct !== null && (
                              <div className="h-2 rounded-full bg-gray-100 overflow-hidden mb-2">
                                <div className="h-2 rounded-full" style={{ width: `${pct}%`, backgroundColor: pct >= 100 ? GREEN : AMBER }} />
                              </div>
                            )}
                            <div className="flex gap-4 text-xs text-gray-400">
                              <span>{init.donorCount} donors</span>
                              {init.endDate && <span>Ends {new Date(init.endDate).toLocaleDateString()}</span>}
                              {pct !== null && <span>{pct.toFixed(0)}% to goal</span>}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {/* ─── RECURRING ────────────────────────────────────────── */}
            {tab === "recurring" && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="text-left px-4 py-3 font-medium">Donor</th>
                        <th className="text-right px-4 py-3 font-medium">Amount</th>
                        <th className="text-left px-4 py-3 font-medium">Frequency</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium">Next Charge</th>
                        <th className="text-left px-4 py-3 font-medium">Failures</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {plansLoading ? (
                        [...Array(6)].map((_, i) => <tr key={i} className="border-b">{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><Shimmer className="h-4" /></td>)}</tr>)
                      ) : plans.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-12 text-center"><EmptyState title="No recurring plans" description="Recurring plans are created when a donor sets up a repeating donation." /></td></tr>
                      ) : plans.map((p) => (
                        <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{p.contact ? `${p.contact.firstName} ${p.contact.lastName}` : "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: GREEN }}>{fmt(p.amount, p.currency)}</td>
                          <td className="px-4 py-3 capitalize text-gray-600">{p.frequency}</td>
                          <td className="px-4 py-3">
                            <Badge variant={p.status === "active" ? "success" : p.status === "failed" ? "danger" : "default"}>{p.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{p.nextChargeDate ? new Date(p.nextChargeDate).toLocaleDateString() : "—"}</td>
                          <td className="px-4 py-3 text-center">{p.failureCount > 0 ? <span className="text-xs font-medium text-red-600">{p.failureCount}</span> : "—"}</td>
                          <td className="px-4 py-3">
                            <div className="flex gap-2 flex-wrap">
                              {p.status === "active" && <button className="text-xs text-amber-600 font-medium" onClick={() => handlePlanAction(p.id, "pause")}>Pause</button>}
                              {p.status === "paused" && <button className="text-xs font-medium" style={{ color: GREEN }} onClick={() => handlePlanAction(p.id, "resume")}>Resume</button>}
                              {["active", "paused"].includes(p.status) && <button className="text-xs text-red-600 font-medium" onClick={() => handlePlanAction(p.id, "cancel")}>Cancel</button>}
                              {p.status === "failed" && p.contact?.email && (
                                <a
                                  href={`mailto:${p.contact.email}?subject=Action required: your recurring donation&body=Hi ${p.contact.firstName ?? ""},\n\nWe noticed your recurring donation of ${fmt(p.amount, p.currency)} could not be processed. Please update your payment details.\n\nThank you for your support.`}
                                  className="text-xs font-medium text-blue-600 hover:underline"
                                >
                                  Contact
                                </a>
                              )}
                              {p.status === "failed" && (
                                <button className="text-xs text-red-600 font-medium" onClick={() => handlePlanAction(p.id, "cancel")}>Cancel</button>
                              )}
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ─── PLEDGES ──────────────────────────────────────────── */}
            {tab === "pledges" && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="text-left px-4 py-3 font-medium">Donor</th>
                        <th className="text-right px-4 py-3 font-medium">Pledged</th>
                        <th className="text-right px-4 py-3 font-medium">Fulfilled</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium">Due</th>
                        <th className="text-left px-4 py-3 font-medium">Initiative</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pledgesLoading ? (
                        [...Array(6)].map((_, i) => <tr key={i} className="border-b">{[...Array(6)].map((_, j) => <td key={j} className="px-4 py-3"><Shimmer className="h-4" /></td>)}</tr>)
                      ) : pledges.length === 0 ? (
                        <tr><td colSpan={6} className="px-4 py-12 text-center"><EmptyState title="No pledges" description="Pledges are created when a donor commits to give over time." /></td></tr>
                      ) : pledges.map((p) => (
                        <motion.tr key={p.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3">{p.contact ? `${p.contact.firstName} ${p.contact.lastName}` : "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: NAVY }}>{fmt(p.pledgedAmount)}</td>
                          <td className="px-4 py-3 text-right" style={{ color: GREEN }}>{fmt(p.fulfilledAmount)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={p.status === "fulfilled" ? "success" : p.status === "overdue" ? "danger" : p.status === "partial" ? "warning" : "default"}>{p.status}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{p.dueDate ? new Date(p.dueDate).toLocaleDateString() : "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{p.fundraisingCampaign?.name ?? "—"}</td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ─── RECEIPTS ─────────────────────────────────────────── */}
            {tab === "receipts" && (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b text-xs text-gray-500 uppercase">
                        <th className="text-left px-4 py-3 font-medium">Receipt #</th>
                        <th className="text-left px-4 py-3 font-medium">Donor</th>
                        <th className="text-right px-4 py-3 font-medium">Amount</th>
                        <th className="text-left px-4 py-3 font-medium">Status</th>
                        <th className="text-left px-4 py-3 font-medium">Issued</th>
                        <th className="text-left px-4 py-3 font-medium">Sent</th>
                        <th className="px-4 py-3" />
                      </tr>
                    </thead>
                    <tbody>
                      {receiptsLoading ? (
                        [...Array(6)].map((_, i) => <tr key={i} className="border-b">{[...Array(7)].map((_, j) => <td key={j} className="px-4 py-3"><Shimmer className="h-4" /></td>)}</tr>)
                      ) : receipts.length === 0 ? (
                        <tr><td colSpan={7} className="px-4 py-12 text-center"><EmptyState title="No receipts" description="Generate receipts from the Donations tab after a donation is processed." /></td></tr>
                      ) : receipts.map((r) => (
                        <motion.tr key={r.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="border-b hover:bg-gray-50">
                          <td className="px-4 py-3 font-mono text-xs">{r.receiptNumber}</td>
                          <td className="px-4 py-3">{r.donation.contact ? `${r.donation.contact.firstName} ${r.donation.contact.lastName}` : "—"}</td>
                          <td className="px-4 py-3 text-right font-semibold" style={{ color: GREEN }}>{fmt(r.donation.amount)}</td>
                          <td className="px-4 py-3">
                            <Badge variant={["sent", "resent"].includes(r.receiptStatus) ? "success" : r.receiptStatus === "void" ? "danger" : "default"}>{r.receiptStatus}</Badge>
                          </td>
                          <td className="px-4 py-3 text-xs text-gray-500">{r.issuedDate ? new Date(r.issuedDate).toLocaleDateString() : "—"}</td>
                          <td className="px-4 py-3 text-xs text-gray-500">{r.sentAt ? new Date(r.sentAt).toLocaleDateString() : "—"}</td>
                          <td className="px-4 py-3">
                            {r.receiptStatus !== "void" && (
                              <button className="text-xs font-medium" style={{ color: GREEN }}
                                onClick={() => fetch(`/api/fundraising/receipts/${r.id}`, { method: "POST" })
                                  .then(() => { toast.success("Receipt resent"); fetchReceipts(); })}>
                                Resend
                              </button>
                            )}
                          </td>
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            )}

            {/* ─── COMPLIANCE ───────────────────────────────────────── */}
            {tab === "compliance" && (
              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                  <ShieldAlert className="w-5 h-5 text-amber-500 flex-shrink-0" />
                  <div>
                    <p className="font-semibold text-amber-900 text-sm">Compliance Review Queue</p>
                    <p className="text-xs text-amber-700 mt-0.5">These donations have been flagged automatically. Review each one and approve, exempt, or block.</p>
                  </div>
                </div>
                {donationsLoading ? (
                  <div className="space-y-3">{[...Array(4)].map((_, i) => <Shimmer key={i} className="h-20" />)}</div>
                ) : complianceDonations.length === 0 ? (
                  <Card><CardContent className="py-12"><EmptyState title="No items in review queue" description="All donations are compliant." /></CardContent></Card>
                ) : (
                  <div className="space-y-3">
                    {complianceDonations.map((d) => (
                      <Card key={d.id}>
                        <CardContent className="pt-4">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-semibold text-gray-800">
                                {d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : "Anonymous"}
                                <span className="ml-2 font-bold" style={{ color: GREEN }}>{fmt(d.amount)}</span>
                              </p>
                              <p className="text-xs text-gray-500 mt-0.5">
                                {d.paymentMethod?.replace(/_/g, " ") ?? d.method ?? "—"} · {new Date(d.donationDate).toLocaleDateString()}
                              </p>
                              <div className="mt-2 px-3 py-1.5 bg-amber-50 rounded text-xs text-amber-800 font-medium inline-block">
                                {COMPLIANCE_BADGE[d.complianceStatus]?.label ?? d.complianceStatus}
                              </div>
                            </div>
                            <div className="flex gap-2 flex-shrink-0">
                              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white"
                                style={{ backgroundColor: GREEN }}
                                onClick={() => handleComplianceAction(d.id, "approved")}>Approve</button>
                              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-amber-300 text-amber-700"
                                onClick={() => handleComplianceAction(d.id, "exempted")}>Exempt</button>
                              <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-red-300 text-red-700"
                                onClick={() => handleComplianceAction(d.id, "blocked")}>Block</button>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* ── Compliance Limits Config ── */}
                <div>
                  <h3 className="text-sm font-semibold text-gray-700 mb-3 mt-2">Donation Limits & Rules</h3>
                  {complianceConfigLoading ? (
                    <div className="space-y-3">{[...Array(4)].map((_, i) => <Shimmer key={i} className="h-10" />)}</div>
                  ) : (
                    <Card>
                      <CardContent className="pt-5 space-y-5">
                        <div className="grid sm:grid-cols-2 gap-4">
                          <div>
                            <Label>Annual limit per donor (CAD)</Label>
                            <p className="text-xs text-gray-500 mb-1.5">Ontario municipal default: $1,200</p>
                            <Input type="number" min="0" step="1" value={configForm.annualLimitPerDonor}
                              onChange={(e) => setConfigForm((f) => ({ ...f, annualLimitPerDonor: parseFloat(e.target.value) || 0 }))} />
                          </div>
                          <div>
                            <Label>Anonymous donation cap (CAD)</Label>
                            <p className="text-xs text-gray-500 mb-1.5">Hard cap — always blocked above this</p>
                            <Input type="number" min="0" step="1" value={configForm.anonymousLimit}
                              onChange={(e) => setConfigForm((f) => ({ ...f, anonymousLimit: parseFloat(e.target.value) || 0 }))} />
                          </div>
                        </div>
                        <div>
                          <Label>Warning threshold — {Math.round(configForm.warningThreshold * 100)}% of annual limit</Label>
                          <input type="range" min="0" max="1" step="0.05" value={configForm.warningThreshold}
                            onChange={(e) => setConfigForm((f) => ({ ...f, warningThreshold: parseFloat(e.target.value) }))}
                            className="w-full mt-2" />
                        </div>
                        <div>
                          <Label className="mb-2 block">Over-limit behaviour</Label>
                          <div className="flex gap-3">
                            {(["review", "block"] as const).map((mode) => (
                              <button key={mode} onClick={() => setConfigForm((f) => ({ ...f, blockMode: mode }))}
                                className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${configForm.blockMode === mode ? (mode === "review" ? "border-amber-400 bg-amber-50 text-amber-800" : "border-red-400 bg-red-50 text-red-800") : "border-gray-200 text-gray-600"}`}>
                                {mode === "review" ? "Flag for Review" : "Hard Block"}
                              </button>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-6">
                          {(["allowCorporate", "allowUnion"] as const).map((field) => (
                            <label key={field} className="flex items-center gap-3 cursor-pointer">
                              <input type="checkbox" checked={configForm[field]} onChange={(e) => setConfigForm((f) => ({ ...f, [field]: e.target.checked }))} className="w-4 h-4 rounded" />
                              <span className="text-sm font-medium text-gray-700">{field === "allowCorporate" ? "Allow corporate donors" : "Allow union donors"}</span>
                            </label>
                          ))}
                        </div>
                        <Button onClick={saveComplianceConfig} disabled={complianceConfigSaving}
                          className="text-white flex items-center gap-2" style={{ backgroundColor: GREEN }}>
                          <Save className="w-4 h-4" />{complianceConfigSaving ? "Saving..." : "Save Limits"}
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </div>
              </div>
            )}

            {/* ─── REPORTS ──────────────────────────────────────────── */}
            {tab === "reports" && (
              <div className="space-y-6">
                <Card>
                  <CardContent className="pt-4">
                    <div className="flex flex-wrap gap-3 items-end">
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Period</Label>
                        <select className="border rounded-lg px-3 py-2 text-sm" value={reportPeriod} onChange={(e) => setReportPeriod(e.target.value)}>
                          <option value="month">This Month</option>
                          <option value="year">This Year</option>
                          <option value="all">All Time</option>
                          <option value="custom">Custom Range</option>
                        </select>
                      </div>
                      {reportPeriod === "custom" && (<>
                        <div><Label className="text-xs text-gray-500 mb-1 block">From</Label><Input type="date" value={reportFrom} onChange={(e) => setReportFrom(e.target.value)} className="text-sm" /></div>
                        <div><Label className="text-xs text-gray-500 mb-1 block">To</Label><Input type="date" value={reportTo} onChange={(e) => setReportTo(e.target.value)} className="text-sm" /></div>
                      </>)}
                      <div>
                        <Label className="text-xs text-gray-500 mb-1 block">Group By</Label>
                        <select className="border rounded-lg px-3 py-2 text-sm" value={reportGroupBy} onChange={(e) => setReportGroupBy(e.target.value)}>
                          <option value="day">Day</option>
                          <option value="week">Week</option>
                          <option value="month">Month</option>
                        </select>
                      </div>
                      <Button onClick={fetchReport} disabled={reportLoading} className="text-white" style={{ backgroundColor: NAVY }}>{reportLoading ? "Loading..." : "Run Report"}</Button>
                      <Button variant="outline" onClick={downloadCsv} className="flex items-center gap-1.5"><Download className="w-3.5 h-3.5" /> Export CSV</Button>
                    </div>
                  </CardContent>
                </Card>

                {reportLoading && <div className="space-y-3">{[...Array(3)].map((_, i) => <Shimmer key={i} className="h-32" />)}</div>}

                {!reportLoading && reportData && (<>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {([
                      { label: "Total Raised",    value: fmt(reportData.summary.totalRaised),    color: GREEN },
                      { label: "Net Revenue",      value: fmt(reportData.summary.totalNet),        color: GREEN },
                      { label: "Total Donations",  value: String(reportData.summary.totalDonations), color: NAVY },
                      { label: "Avg Gift",         value: fmt(reportData.summary.avgGift),         color: AMBER },
                      { label: "Unique Donors",    value: String(reportData.summary.uniqueDonors), color: "#a78bfa" },
                      { label: "Fees",             value: fmt(reportData.summary.totalFees),       color: "#6b7280" },
                      { label: "Refunded",         value: fmt(reportData.summary.totalRefunded),   color: RED },
                    ] as const).map((k) => (
                      <Card key={k.label}><CardContent className="pt-4"><p className="text-xs text-gray-500 mb-1">{k.label}</p><p className="text-xl font-bold" style={{ color: k.color }}>{k.value}</p></CardContent></Card>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    <Card>
                      <CardHeader><div className="flex items-center gap-2"><LineChart className="w-4 h-4 text-gray-400" /><span className="font-semibold text-sm">Revenue Over Time</span></div></CardHeader>
                      <CardContent>
                        {reportData.timeSeries.length === 0 ? (
                          <p className="text-xs text-gray-400 py-6 text-center">No donations in this period</p>
                        ) : (
                          <ResponsiveContainer width="100%" height={200}>
                            <AreaChart data={reportData.timeSeries} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                              <defs>
                                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={GREEN} stopOpacity={0.18} />
                                  <stop offset="95%" stopColor={GREEN} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
                              <XAxis dataKey="period" tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} />
                              <YAxis tick={{ fontSize: 10, fill: "#6b7280" }} axisLine={false} tickLine={false} tickFormatter={(v: number) => `$${(v / 1000).toFixed(0)}k`} />
                              <Tooltip formatter={(value) => [fmt(typeof value === "number" ? value : 0), "Raised"]} contentStyle={{ fontSize: 12, border: "1px solid #e5e7eb", borderRadius: 8 }} />
                              <Area type="monotone" dataKey="amount" stroke={GREEN} strokeWidth={2} fill="url(#revGrad)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><div className="flex items-center gap-2"><PieChart className="w-4 h-4 text-gray-400" /><span className="font-semibold text-sm">By Payment Method</span></div></CardHeader>
                      <CardContent>
                        <div className="space-y-2">{reportData.byMethod.map((r) => {
                          const pct = reportData.summary.totalRaised > 0 ? (r.amount / reportData.summary.totalRaised) * 100 : 0;
                          return (<div key={r.method}><div className="flex justify-between text-xs mb-1"><span className="capitalize">{r.method.replace(/_/g, " ")}</span><span className="font-medium">{fmt(r.amount)} ({r.count})</span></div><div className="h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: GREEN }} /></div></div>);
                        })}{reportData.byMethod.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">No data</p>}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><div className="flex items-center gap-2"><Table2 className="w-4 h-4 text-gray-400" /><span className="font-semibold text-sm">By Source</span></div></CardHeader>
                      <CardContent>
                        <div className="space-y-2">{reportData.bySource.map((r) => (<div key={r.sourceId ?? "none"} className="flex justify-between text-sm"><span className="text-gray-700">{r.name}</span><span className="font-medium" style={{ color: GREEN }}>{fmt(r.amount)} <span className="text-gray-400 text-xs">({r.count})</span></span></div>))}
                        {reportData.bySource.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">No source data</p>}</div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader><div className="flex items-center gap-2"><Users className="w-4 h-4 text-gray-400" /><span className="font-semibold text-sm">Top Donors</span></div></CardHeader>
                      <CardContent>
                        <div className="space-y-2">{reportData.topDonors.map((r, i) => (<div key={r.contactId ?? i} className="flex items-center gap-3"><span className="text-xs text-gray-400 w-5 text-right">{i + 1}.</span><span className="flex-1 text-sm text-gray-700 truncate">{r.name}</span><span className="font-semibold text-sm" style={{ color: GREEN }}>{fmt(r.amount)}</span></div>))}
                        {reportData.topDonors.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">No donor data</p>}</div>
                      </CardContent>
                    </Card>
                  </div>
                </>)}

                {!reportLoading && !reportData && (
                  <Card><CardContent className="py-16"><EmptyState title="Run a report" description="Select a period and click Run Report to view fundraising analytics." /></CardContent></Card>
                )}
              </div>
            )}

          </motion.div>
        </AnimatePresence>
      </div>

      {/* ── Add Donation Modal ── */}
      <Modal open={showAddDonation} onClose={() => setShowAddDonation(false)} title="Record Donation">
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Amount (CAD) *</Label>
              <Input type="number" min="0.01" step="0.01" value={addForm.amount}
                onChange={(e) => setAddForm((f) => ({ ...f, amount: e.target.value }))} placeholder="0.00" />
            </div>
            <div>
              <Label>Payment Method</Label>
              <select className="w-full border rounded-lg px-3 py-2 text-sm" value={addForm.method}
                onChange={(e) => setAddForm((f) => ({ ...f, method: e.target.value }))}>
                <option value="cash">Cash</option>
                <option value="cheque">Cheque</option>
                <option value="e_transfer">E-Transfer</option>
                <option value="stripe_card">Credit Card</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
          <div>
            <Label>Donation Type</Label>
            <select className="w-full border rounded-lg px-3 py-2 text-sm" value={addForm.donationType}
              onChange={(e) => setAddForm((f) => ({ ...f, donationType: e.target.value }))}>
              <option value="one_time">One-Time</option>
              <option value="recurring">Recurring</option>
              <option value="pledge">Pledge</option>
              <option value="in_kind">In-Kind</option>
              <option value="event">Event</option>
            </select>
          </div>
          <div>
            <Label>Reference / Cheque # / Transaction ID</Label>
            <Input value={addForm.externalTransactionId}
              onChange={(e) => setAddForm((f) => ({ ...f, externalTransactionId: e.target.value }))}
              placeholder="Optional" />
          </div>
          <div>
            <Label>Notes</Label>
            <Textarea value={addForm.notes} onChange={(e) => setAddForm((f) => ({ ...f, notes: e.target.value }))}
              placeholder="Optional notes..." rows={2} />
          </div>
          <div className="flex gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowAddDonation(false)} className="flex-1">Cancel</Button>
            <Button onClick={handleAddDonation} disabled={addLoading}
              className="flex-1 text-white" style={{ backgroundColor: GREEN }}>
              {addLoading ? "Saving..." : "Record Donation"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Donation Detail Modal ── */}
      {selectedDonation && (
        <Modal open={!!selectedDonation} onClose={() => setSelectedDonation(null)} title="Donation Detail">
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-2xl font-bold" style={{ color: GREEN }}>{fmt(selectedDonation.amount, selectedDonation.currency)}</p>
                <p className="text-sm text-gray-500 mt-0.5 capitalize">{selectedDonation.donationType.replace(/_/g, " ")} · {selectedDonation.paymentMethod?.replace(/_/g, " ") ?? selectedDonation.method ?? "—"}</p>
              </div>
              <Badge variant={STATUS_BADGE[selectedDonation.status]?.variant ?? "default"}>
                {STATUS_BADGE[selectedDonation.status]?.label ?? selectedDonation.status}
              </Badge>
            </div>
            {selectedDonation.contact && (
              <div className="bg-gray-50 rounded-lg p-3">
                <p className="font-medium">{selectedDonation.contact.firstName} {selectedDonation.contact.lastName}</p>
                {selectedDonation.contact.email && <p className="text-xs text-gray-500">{selectedDonation.contact.email}</p>}
              </div>
            )}
            {selectedDonation.feeAmount > 0 && (
              <div className="flex justify-between text-sm border-t pt-3">
                <span className="text-gray-500">Net (after {fmt(selectedDonation.feeAmount)} fee)</span>
                <span className="font-semibold">{fmt(selectedDonation.netAmount, selectedDonation.currency)}</span>
              </div>
            )}
            {selectedDonation.notes && (
              <div><p className="text-xs text-gray-500 mb-1">Notes</p><p className="text-sm">{selectedDonation.notes}</p></div>
            )}
            {selectedDonation.externalTransactionId && (
              <div><p className="text-xs text-gray-500 mb-1">Transaction Ref</p><p className="text-sm font-mono">{selectedDonation.externalTransactionId}</p></div>
            )}
            <p className="text-xs text-gray-400">
              Recorded by {selectedDonation.recordedBy.name ?? "unknown"} · {new Date(selectedDonation.donationDate).toLocaleString()}
            </p>
            {!selectedDonation.receipt && selectedDonation.status === "processed" && (
              <Button className="w-full text-white" style={{ backgroundColor: GREEN }}
                onClick={() => { handleGenerateReceipt(selectedDonation.id); setSelectedDonation(null); }}>
                Generate Receipt
              </Button>
            )}
          </div>
        </Modal>
      )}

      {/* ── Add Initiative Modal ── */}
      <AddInitiativeModal
        open={showAddInitiative}
        onClose={() => setShowAddInitiative(false)}
        campaignId={campaignId}
        onCreated={() => { setShowAddInitiative(false); fetchInitiatives(); fetchStats(); }}
      />
    </div>
  );
}

/* ── Add Initiative Modal ─────────────────────────────────────────────────── */

function AddInitiativeModal({ open, onClose, campaignId, onCreated }: {
  open: boolean; onClose: () => void; campaignId: string; onCreated: () => void;
}) {
  const [form, setForm] = useState({ name: "", description: "", goalAmount: "", startDate: "", endDate: "" });
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    if (!form.name || !form.startDate) { toast.error("Name and start date are required"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/fundraising/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          name: form.name,
          description: form.description || undefined,
          goalAmount: form.goalAmount ? parseFloat(form.goalAmount) : undefined,
          startDate: new Date(form.startDate).toISOString(),
          endDate: form.endDate ? new Date(form.endDate).toISOString() : undefined,
        }),
      });
      if (res.ok) { toast.success("Initiative created"); onCreated(); }
      else { const e = await res.json(); toast.error(e.error ?? "Failed to create"); }
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Fundraising Initiative">
      <div className="space-y-4 p-4">
        <div><Label>Name *</Label><Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="Spring Fundraising Drive" /></div>
        <div><Label>Description</Label><Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={2} /></div>
        <div><Label>Goal Amount (CAD)</Label><Input type="number" value={form.goalAmount} onChange={(e) => setForm((f) => ({ ...f, goalAmount: e.target.value }))} placeholder="Optional" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>Start Date *</Label><Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} /></div>
          <div><Label>End Date</Label><Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} /></div>
        </div>
        <div className="flex gap-3 pt-2">
          <Button variant="outline" onClick={onClose} className="flex-1">Cancel</Button>
          <Button onClick={handleSubmit} disabled={loading} className="flex-1 text-white" style={{ backgroundColor: GREEN }}>
            {loading ? "Creating..." : "Create Initiative"}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
