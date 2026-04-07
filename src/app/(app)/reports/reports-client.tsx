"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BarChart3,
  BookOpen,
  ClipboardList,
  Download,
  FileSpreadsheet,
  Filter,
  Heart,
  Layers,
  Mail,
  MapPin,
  Megaphone,
  PieChart,
  Play,
  Plus,
  Printer,
  Save,
  Search,
  Settings2,
  Trash2,
  TrendingUp,
  Users,
  Vote,
  Wallet,
  Clock,
  CalendarDays,
  CheckCircle2,
  XCircle,
  ChevronRight,
  Eye,
  Table2,
  ArrowUpDown,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart as RechartsPie,
  Pie,
  Cell,
  Legend,
} from "recharts";

/* ── Colour Tokens ─────────────────────────────────────────────── */
const C = {
  navy: "#0A2342",
  green: "#1D9E75",
  amber: "#EF9F27",
  red: "#E24B4A",
  slate50: "#f8fafc",
  slate100: "#f1f5f9",
  slate200: "#e2e8f0",
  slate500: "#64748b",
  slate700: "#334155",
  slate900: "#0f172a",
};

const PIE_COLORS = [C.navy, C.green, C.amber, C.red, "#6366f1", "#8b5cf6", "#ec4899", "#14b8a6"];

/* ── Spring transition ─────────────────────────────────────────── */
const spring = { type: "spring" as const, stiffness: 300, damping: 26 };

/* ── Types ─────────────────────────────────────────────────────── */
interface Props {
  campaignId: string;
}

type TabId = "quick" | "builder" | "saved";

type DataSource =
  | "contacts"
  | "interactions"
  | "donations"
  | "volunteers"
  | "signs"
  | "events"
  | "gotv";

interface ColumnDef {
  key: string;
  label: string;
}

interface SavedReport {
  id: string;
  name: string;
  createdAt: string;
  dataSource: DataSource;
  columns: string[];
  filters: ReportFilters;
  groupBy: string;
}

interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  ward: string;
  supportLevel: string;
  status: string;
  tags: string;
}

type TemplateId =
  | "health"
  | "canvassing"
  | "gotv"
  | "financial"
  | "volunteer"
  | "event"
  | "sign"
  | "comms";

interface TemplateResult {
  title: string;
  rows: Record<string, string | number>[];
  chartData: Record<string, string | number>[];
  chartType: "bar" | "pie";
  columns: string[];
}

/* ── Helpers ───────────────────────────────────────────────────── */
async function getJson(url: string) {
  try {
    const res = await fetch(url, { cache: "no-store" });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

function downloadCsv(filename: string, headers: string[], rows: Record<string, string | number>[]) {
  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => `"${String(r[h] ?? "")}"`).join(",")),
  ].join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function storageKey(campaignId: string) {
  return `poll-city-saved-reports-${campaignId}`;
}

function loadSavedReports(campaignId: string): SavedReport[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey(campaignId));
    return raw ? (JSON.parse(raw) as SavedReport[]) : [];
  } catch {
    return [];
  }
}

function persistSavedReports(campaignId: string, reports: SavedReport[]) {
  localStorage.setItem(storageKey(campaignId), JSON.stringify(reports));
}

/* ── Data source columns ───────────────────────────────────────── */
const DATA_SOURCE_COLUMNS: Record<DataSource, ColumnDef[]> = {
  contacts: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "address", label: "Address" },
    { key: "ward", label: "Ward" },
    { key: "supportLevel", label: "Support Level" },
    { key: "tags", label: "Tags" },
    { key: "createdAt", label: "Created" },
  ],
  interactions: [
    { key: "contactName", label: "Contact" },
    { key: "type", label: "Type" },
    { key: "outcome", label: "Outcome" },
    { key: "volunteer", label: "Volunteer" },
    { key: "date", label: "Date" },
    { key: "notes", label: "Notes" },
  ],
  donations: [
    { key: "donorName", label: "Donor" },
    { key: "amount", label: "Amount" },
    { key: "status", label: "Status" },
    { key: "receiptSent", label: "Receipt Sent" },
    { key: "date", label: "Date" },
    { key: "method", label: "Method" },
  ],
  volunteers: [
    { key: "name", label: "Name" },
    { key: "email", label: "Email" },
    { key: "phone", label: "Phone" },
    { key: "isActive", label: "Active" },
    { key: "hoursLogged", label: "Hours" },
    { key: "shiftsWorked", label: "Shifts" },
  ],
  signs: [
    { key: "address", label: "Address" },
    { key: "ward", label: "Ward" },
    { key: "status", label: "Status" },
    { key: "requestedAt", label: "Requested" },
    { key: "installedAt", label: "Installed" },
  ],
  events: [
    { key: "title", label: "Title" },
    { key: "type", label: "Type" },
    { key: "date", label: "Date" },
    { key: "rsvpCount", label: "RSVPs" },
    { key: "attendeeCount", label: "Attendance" },
    { key: "location", label: "Location" },
  ],
  gotv: [
    { key: "contactName", label: "Contact" },
    { key: "priority", label: "Priority" },
    { key: "voted", label: "Voted" },
    { key: "ward", label: "Ward" },
    { key: "phone", label: "Phone" },
  ],
};

const GROUP_BY_OPTIONS: Record<DataSource, { key: string; label: string }[]> = {
  contacts: [
    { key: "ward", label: "Ward" },
    { key: "supportLevel", label: "Support Level" },
    { key: "createdAt", label: "Date Created" },
  ],
  interactions: [
    { key: "type", label: "Type" },
    { key: "outcome", label: "Outcome" },
    { key: "volunteer", label: "Volunteer" },
    { key: "date", label: "Date" },
  ],
  donations: [
    { key: "status", label: "Status" },
    { key: "method", label: "Method" },
    { key: "date", label: "Date" },
  ],
  volunteers: [
    { key: "isActive", label: "Active Status" },
  ],
  signs: [
    { key: "ward", label: "Ward" },
    { key: "status", label: "Status" },
  ],
  events: [
    { key: "type", label: "Event Type" },
    { key: "date", label: "Date" },
  ],
  gotv: [
    { key: "priority", label: "Priority" },
    { key: "ward", label: "Ward" },
    { key: "voted", label: "Voted Status" },
  ],
};

/* ── Shimmer skeleton ──────────────────────────────────────────── */
function Shimmer({ className = "" }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded bg-gradient-to-r from-slate-200 via-slate-100 to-slate-200 bg-[length:200%_100%] ${className}`}
      style={{ animationDuration: "1.5s" }}
    />
  );
}

function TableSkeleton() {
  return (
    <div className="space-y-3">
      <Shimmer className="h-10 w-full" />
      {Array.from({ length: 5 }).map((_, i) => (
        <Shimmer key={i} className="h-8 w-full" />
      ))}
    </div>
  );
}

/* ── Empty state ───────────────────────────────────────────────── */
function EmptyState({
  icon: Icon,
  headline,
  action,
  onAction,
}: {
  icon: React.ComponentType<{ className?: string }>;
  headline: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${C.navy}10` }}
      >
        <Icon className="h-8 w-8 text-[#0A2342]" />
      </div>
      <h3 className="text-lg font-bold" style={{ color: C.slate900 }}>
        {headline}
      </h3>
      {action && onAction && (
        <motion.button
          whileTap={{ scale: 0.97 }}
          transition={spring}
          onClick={onAction}
          className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-semibold text-white"
          style={{ backgroundColor: C.green }}
        >
          <Plus className="h-4 w-4" /> {action}
        </motion.button>
      )}
    </div>
  );
}

/* ── Template definitions ──────────────────────────────────────── */
const TEMPLATES: {
  id: TemplateId;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    id: "health",
    title: "Campaign Health Summary",
    description: "Contacts, supporters, GOTV, donations, volunteers, signs",
    icon: Heart,
    color: C.red,
  },
  {
    id: "canvassing",
    title: "Canvassing Performance",
    description: "Doors knocked by day/week, conversion rates, top canvassers",
    icon: ClipboardList,
    color: C.green,
  },
  {
    id: "gotv",
    title: "GOTV Status",
    description: "P1/P2/P3/P4 breakdown, voted, remaining, projected",
    icon: Vote,
    color: C.navy,
  },
  {
    id: "financial",
    title: "Financial Compliance",
    description: "Donations, limits, spending, receipt status",
    icon: Wallet,
    color: C.amber,
  },
  {
    id: "volunteer",
    title: "Volunteer Hours",
    description: "Shifts worked, hours credited, expense totals",
    icon: Users,
    color: "#6366f1",
  },
  {
    id: "event",
    title: "Event Performance",
    description: "RSVP vs attendance, by event type",
    icon: CalendarDays,
    color: "#ec4899",
  },
  {
    id: "sign",
    title: "Sign Operations",
    description: "Requested / installed / removed, by ward",
    icon: MapPin,
    color: "#14b8a6",
  },
  {
    id: "comms",
    title: "Communications Delivery",
    description: "Emails sent, open rate estimates, SMS delivered",
    icon: Mail,
    color: "#8b5cf6",
  },
];

/* ═══════════════════════════════════════════════════════════════ */
/*  MAIN COMPONENT                                                */
/* ═══════════════════════════════════════════════════════════════ */
export default function ReportsClient({ campaignId }: Props) {
  const [activeTab, setActiveTab] = useState<TabId>("quick");

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-black" style={{ color: C.slate900 }}>
              Reports Suite
            </h1>
            <p className="text-sm" style={{ color: C.slate500 }}>
              Enterprise reporting with 8 templates, custom builder, and saved reports.
            </p>
          </div>
        </div>

        {/* Tabs */}
        <div className="mt-5 flex gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: "quick" as const, label: "Quick Reports", icon: BarChart3 },
              { id: "builder" as const, label: "Custom Builder", icon: Settings2 },
              { id: "saved" as const, label: "Saved Reports", icon: BookOpen },
            ] as const
          ).map((tab) => (
            <motion.button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="relative flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold transition-colors"
              style={{
                color: activeTab === tab.id ? C.navy : C.slate500,
              }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
            >
              {activeTab === tab.id && (
                <motion.div
                  layoutId="tab-bg"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm"
                  transition={spring}
                />
              )}
              <span className="relative z-10 flex items-center gap-2">
                <tab.icon className="h-4 w-4" />
                <span className="hidden sm:inline">{tab.label}</span>
              </span>
            </motion.button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {activeTab === "quick" && (
          <motion.div
            key="quick"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring}
          >
            <QuickReportsTab campaignId={campaignId} />
          </motion.div>
        )}
        {activeTab === "builder" && (
          <motion.div
            key="builder"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring}
          >
            <CustomBuilderTab campaignId={campaignId} />
          </motion.div>
        )}
        {activeTab === "saved" && (
          <motion.div
            key="saved"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            transition={spring}
          >
            <SavedReportsTab campaignId={campaignId} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Print styles */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .print-area,
          .print-area * {
            visibility: visible;
          }
          .print-area {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TAB 1 — QUICK REPORTS                                        */
/* ═══════════════════════════════════════════════════════════════ */
function QuickReportsTab({ campaignId }: { campaignId: string }) {
  const [activeTemplate, setActiveTemplate] = useState<TemplateId | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TemplateResult | null>(null);

  const runTemplate = useCallback(
    async (id: TemplateId) => {
      setActiveTemplate(id);
      setLoading(true);
      setResult(null);

      const r = await generateTemplateReport(id, campaignId);
      setResult(r);
      setLoading(false);
    },
    [campaignId],
  );

  return (
    <div className="space-y-6">
      {/* Template grid */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {TEMPLATES.map((t) => {
          const Icon = t.icon;
          const isActive = activeTemplate === t.id;
          return (
            <motion.button
              key={t.id}
              onClick={() => runTemplate(t.id)}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              className={`group relative min-h-[44px] rounded-2xl border bg-white p-5 text-left transition-shadow hover:shadow-md ${
                isActive ? "border-2 shadow-md" : "border-slate-200"
              }`}
              style={isActive ? { borderColor: t.color } : undefined}
            >
              <div
                className="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl"
                style={{ backgroundColor: `${t.color}15` }}
              >
                <span style={{ color: t.color }}><Icon className="h-5 w-5" /></span>
              </div>
              <h3 className="text-sm font-bold" style={{ color: C.slate900 }}>
                {t.title}
              </h3>
              <p className="mt-1 text-xs" style={{ color: C.slate500 }}>
                {t.description}
              </p>
              <ChevronRight
                className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500 opacity-0 transition-opacity group-hover:opacity-100"
              />
            </motion.button>
          );
        })}
      </div>

      {/* Report result */}
      {activeTemplate && (
        <div className="print-area rounded-2xl border border-slate-200 bg-white p-6">
          {loading ? (
            <TableSkeleton />
          ) : result ? (
            <TemplateResultView result={result} />
          ) : (
            <EmptyState icon={FileSpreadsheet} headline="No data available for this report." />
          )}
        </div>
      )}
    </div>
  );
}

/* ── Template result view ──────────────────────────────────────── */
function TemplateResultView({ result }: { result: TemplateResult }) {
  const [sortCol, setSortCol] = useState<string | null>(null);
  const [sortAsc, setSortAsc] = useState(true);

  const sorted = useMemo(() => {
    if (!sortCol) return result.rows;
    return [...result.rows].sort((a, b) => {
      const av = a[sortCol] ?? "";
      const bv = b[sortCol] ?? "";
      if (typeof av === "number" && typeof bv === "number") return sortAsc ? av - bv : bv - av;
      return sortAsc
        ? String(av).localeCompare(String(bv))
        : String(bv).localeCompare(String(av));
    });
  }, [result.rows, sortCol, sortAsc]);

  function toggleSort(col: string) {
    if (sortCol === col) {
      setSortAsc(!sortAsc);
    } else {
      setSortCol(col);
      setSortAsc(true);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold" style={{ color: C.slate900 }}>
          {result.title}
        </h2>
        <div className="no-print flex gap-2">
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() =>
              downloadCsv(`${result.title.replace(/\s+/g, "-").toLowerCase()}.csv`, result.columns, result.rows)
            }
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
            style={{ color: C.slate700 }}
          >
            <Download className="h-4 w-4" /> CSV
          </motion.button>
          <motion.button
            whileTap={{ scale: 0.97 }}
            transition={spring}
            onClick={() => window.print()}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ backgroundColor: C.navy }}
          >
            <Printer className="h-4 w-4" /> Print
          </motion.button>
        </div>
      </div>

      {/* Chart */}
      {result.chartData.length > 0 && (
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            {result.chartType === "pie" ? (
              <RechartsPie>
                <Pie
                  data={result.chartData}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={({ name, value }: { name?: string; value?: number }) => `${name ?? ""}: ${value ?? 0}`}
                >
                  {result.chartData.map((_, i) => (
                    <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Legend />
                <Tooltip />
              </RechartsPie>
            ) : (
              <BarChart data={result.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" fill={C.green} radius={[4, 4, 0, 0]} />
              </BarChart>
            )}
          </ResponsiveContainer>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-200">
              {result.columns.map((col) => (
                <th
                  key={col}
                  onClick={() => toggleSort(col)}
                  className="cursor-pointer px-3 py-2 text-left font-semibold"
                  style={{ color: C.slate700 }}
                >
                  <span className="inline-flex items-center gap-1">
                    {col}
                    <ArrowUpDown className="h-3 w-3 text-slate-500" />
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map((row, i) => (
              <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                {result.columns.map((col) => (
                  <td key={col} className="px-3 py-2" style={{ color: C.slate700 }}>
                    {String(row[col] ?? "—")}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {result.rows.length === 0 && (
        <EmptyState icon={Table2} headline="No data found for this report period." />
      )}
    </div>
  );
}

/* ── Generate template report data ─────────────────────────────── */
async function generateTemplateReport(
  id: TemplateId,
  campaignId: string,
): Promise<TemplateResult | null> {
  const cq = `campaignId=${campaignId}`;

  switch (id) {
    case "health": {
      const [contacts, supporters, gotv, donations, signs, volunteers] = await Promise.all([
        getJson(`/api/contacts?${cq}&pageSize=1`),
        getJson(`/api/contacts?${cq}&supportLevels=strong_support,leaning_support&pageSize=1`),
        getJson(`/api/gotv?${cq}`),
        getJson(`/api/donations?${cq}&pageSize=1000`),
        getJson(`/api/signs?${cq}&pageSize=1000`),
        getJson(`/api/volunteers?${cq}&pageSize=1000`),
      ]);

      const donationRows = (donations?.data ?? []) as Array<{ amount?: number; status?: string }>;
      const raised = donationRows
        .filter((d) => d.status === "received")
        .reduce((s, d) => s + Number(d.amount ?? 0), 0);
      const signsInstalled = ((signs?.data ?? []) as Array<{ status?: string }>).filter(
        (r) => r.status === "installed",
      ).length;
      const activeVols = ((volunteers?.data ?? []) as Array<{ isActive?: boolean }>).filter(
        (v) => v.isActive,
      ).length;

      const rows = [
        { metric: "Total Contacts", value: contacts?.total ?? 0 },
        { metric: "Supporters", value: supporters?.total ?? 0 },
        { metric: "GOTV Confirmed Voted", value: gotv?.data?.confirmedVoted ?? 0 },
        { metric: "Donations Raised ($)", value: raised },
        { metric: "Signs Installed", value: signsInstalled },
        { metric: "Active Volunteers", value: activeVols },
      ];

      return {
        title: "Campaign Health Summary",
        columns: ["metric", "value"],
        rows,
        chartData: rows.map((r) => ({ name: r.metric, value: Number(r.value) })),
        chartType: "bar",
      };
    }

    case "canvassing": {
      const data = await getJson(`/api/analytics/canvassing?${cq}`);
      const daily = (data?.dailyStats ?? []) as Array<{
        date?: string;
        doorsKnocked?: number;
        conversions?: number;
      }>;
      const topCanvassers = (data?.topCanvassers ?? []) as Array<{
        name?: string;
        doors?: number;
        conversions?: number;
      }>;

      const rows = daily.length > 0
        ? daily.map((d) => ({
            date: d.date ?? "—",
            doorsKnocked: d.doorsKnocked ?? 0,
            conversions: d.conversions ?? 0,
            rate: d.doorsKnocked
              ? `${Math.round(((d.conversions ?? 0) / d.doorsKnocked) * 100)}%`
              : "0%",
          }))
        : topCanvassers.length > 0
          ? topCanvassers.map((c) => ({
              name: c.name ?? "Unknown",
              doors: c.doors ?? 0,
              conversions: c.conversions ?? 0,
              rate: c.doors
                ? `${Math.round(((c.conversions ?? 0) / c.doors) * 100)}%`
                : "0%",
            }))
          : [{ metric: "No canvassing data", value: 0 }];

      const chartData = daily.length > 0
        ? daily.map((d) => ({ name: d.date ?? "", value: d.doorsKnocked ?? 0 }))
        : topCanvassers.map((c) => ({ name: c.name ?? "", value: c.doors ?? 0 }));

      return {
        title: "Canvassing Performance",
        columns: daily.length > 0
          ? ["date", "doorsKnocked", "conversions", "rate"]
          : topCanvassers.length > 0
            ? ["name", "doors", "conversions", "rate"]
            : ["metric", "value"],
        rows,
        chartData,
        chartType: "bar",
      };
    }

    case "gotv": {
      const data = await getJson(`/api/analytics/gotv?${cq}`);
      const tiers = (data?.tiers ?? data?.data?.tiers ?? []) as Array<{
        tier?: string;
        total?: number;
        voted?: number;
      }>;

      const gotvSummary = data?.data ?? data ?? {};
      const p1 = tiers.find((t) => t.tier === "P1") ?? { total: 0, voted: 0 };
      const p2 = tiers.find((t) => t.tier === "P2") ?? { total: 0, voted: 0 };
      const p3 = tiers.find((t) => t.tier === "P3") ?? { total: 0, voted: 0 };
      const p4 = tiers.find((t) => t.tier === "P4") ?? { total: 0, voted: 0 };

      const rows = [
        {
          priority: "P1",
          total: p1.total ?? 0,
          voted: p1.voted ?? 0,
          remaining: (p1.total ?? 0) - (p1.voted ?? 0),
        },
        {
          priority: "P2",
          total: p2.total ?? 0,
          voted: p2.voted ?? 0,
          remaining: (p2.total ?? 0) - (p2.voted ?? 0),
        },
        {
          priority: "P3",
          total: p3.total ?? 0,
          voted: p3.voted ?? 0,
          remaining: (p3.total ?? 0) - (p3.voted ?? 0),
        },
        {
          priority: "P4",
          total: p4.total ?? 0,
          voted: p4.voted ?? 0,
          remaining: (p4.total ?? 0) - (p4.voted ?? 0),
        },
        {
          priority: "Total",
          total: gotvSummary.totalVoters ?? 0,
          voted: gotvSummary.confirmedVoted ?? 0,
          remaining: (gotvSummary.totalVoters ?? 0) - (gotvSummary.confirmedVoted ?? 0),
        },
      ];

      return {
        title: "GOTV Status",
        columns: ["priority", "total", "voted", "remaining"],
        rows,
        chartData: rows.filter((r) => r.priority !== "Total").map((r) => ({
          name: r.priority,
          value: Number(r.total),
        })),
        chartType: "pie",
      };
    }

    case "financial": {
      const data = await getJson(`/api/analytics/donations?${cq}`);
      const donations = await getJson(`/api/donations?${cq}&pageSize=1000`);
      const donationList = (donations?.data ?? []) as Array<{
        donorName?: string;
        amount?: number;
        status?: string;
        receiptSent?: boolean;
        date?: string;
        createdAt?: string;
      }>;

      const totalRaised = donationList
        .filter((d) => d.status === "received")
        .reduce((s, d) => s + Number(d.amount ?? 0), 0);
      const totalPledged = donationList
        .filter((d) => d.status === "pledged")
        .reduce((s, d) => s + Number(d.amount ?? 0), 0);
      const receiptsIssued = donationList.filter((d) => d.receiptSent).length;
      const receiptsPending = donationList.filter(
        (d) => d.status === "received" && !d.receiptSent,
      ).length;

      const summaryRows = [
        { metric: "Total Raised", value: `$${totalRaised.toLocaleString()}` },
        { metric: "Total Pledged", value: `$${totalPledged.toLocaleString()}` },
        { metric: "Total Donations", value: donationList.length },
        { metric: "Receipts Issued", value: receiptsIssued },
        { metric: "Receipts Pending", value: receiptsPending },
        {
          metric: "Average Donation",
          value: donationList.length
            ? `$${Math.round(totalRaised / donationList.length)}`
            : "$0",
        },
      ];

      const byStatus = (data?.byStatus ?? []) as Array<{ status?: string; count?: number }>;
      const chartData = byStatus.length > 0
        ? byStatus.map((s) => ({ name: s.status ?? "unknown", value: s.count ?? 0 }))
        : [
            { name: "Raised", value: totalRaised },
            { name: "Pledged", value: totalPledged },
          ];

      return {
        title: "Financial Compliance",
        columns: ["metric", "value"],
        rows: summaryRows,
        chartData,
        chartType: "pie",
      };
    }

    case "volunteer": {
      const [volunteers, stats, shifts] = await Promise.all([
        getJson(`/api/volunteers?${cq}&pageSize=1000`),
        getJson(`/api/volunteers/stats?${cq}`),
        getJson(`/api/volunteers/shifts?${cq}&pageSize=1000`),
      ]);

      const volList = (volunteers?.data ?? []) as Array<{
        name?: string;
        firstName?: string;
        lastName?: string;
        isActive?: boolean;
      }>;
      const shiftList = (shifts?.data ?? []) as Array<{
        volunteerId?: string;
        hours?: number;
        checkedIn?: boolean;
      }>;

      const totalActive = volList.filter((v) => v.isActive).length;
      const totalShifts = shiftList.length;
      const totalHours = shiftList.reduce((s, sh) => s + Number(sh.hours ?? 0), 0);

      const rows = [
        { metric: "Total Volunteers", value: volList.length },
        { metric: "Active", value: totalActive },
        { metric: "Total Shifts", value: totalShifts },
        { metric: "Total Hours", value: totalHours },
        {
          metric: "Avg Hours/Volunteer",
          value: volList.length ? Math.round((totalHours / volList.length) * 10) / 10 : 0,
        },
      ];

      return {
        title: "Volunteer Hours",
        columns: ["metric", "value"],
        rows,
        chartData: [
          { name: "Active", value: totalActive },
          { name: "Inactive", value: volList.length - totalActive },
        ],
        chartType: "pie",
      };
    }

    case "event": {
      const events = await getJson(`/api/events?${cq}&pageSize=1000`);
      const eventList = (events?.data ?? events ?? []) as Array<{
        title?: string;
        type?: string;
        date?: string;
        startDate?: string;
        rsvpCount?: number;
        attendeeCount?: number;
        _count?: { rsvps?: number };
      }>;

      const rows = Array.isArray(eventList)
        ? eventList.map((e) => ({
            title: e.title ?? "Untitled",
            type: e.type ?? "general",
            date: (e.date ?? e.startDate ?? "—").toString().slice(0, 10),
            rsvps: e.rsvpCount ?? e._count?.rsvps ?? 0,
            attendance: e.attendeeCount ?? 0,
          }))
        : [];

      return {
        title: "Event Performance",
        columns: ["title", "type", "date", "rsvps", "attendance"],
        rows,
        chartData: rows.slice(0, 10).map((r) => ({ name: r.title, value: Number(r.rsvps) })),
        chartType: "bar",
      };
    }

    case "sign": {
      const signs = await getJson(`/api/signs?${cq}&pageSize=1000`);
      const signList = (signs?.data ?? []) as Array<{
        address?: string;
        ward?: string;
        status?: string;
      }>;

      const requested = signList.filter((s) => s.status === "requested").length;
      const installed = signList.filter((s) => s.status === "installed").length;
      const removed = signList.filter((s) => s.status === "removed").length;

      const byWard: Record<string, { requested: number; installed: number; removed: number }> = {};
      for (const s of signList) {
        const w = s.ward ?? "Unknown";
        if (!byWard[w]) byWard[w] = { requested: 0, installed: 0, removed: 0 };
        if (s.status === "requested") byWard[w].requested++;
        else if (s.status === "installed") byWard[w].installed++;
        else if (s.status === "removed") byWard[w].removed++;
      }

      const rows = Object.entries(byWard).map(([ward, counts]) => ({
        ward,
        requested: counts.requested,
        installed: counts.installed,
        removed: counts.removed,
        total: counts.requested + counts.installed + counts.removed,
      }));

      if (rows.length === 0) {
        rows.push({
          ward: "All",
          requested,
          installed,
          removed,
          total: signList.length,
        });
      }

      return {
        title: "Sign Operations",
        columns: ["ward", "requested", "installed", "removed", "total"],
        rows,
        chartData: [
          { name: "Requested", value: requested },
          { name: "Installed", value: installed },
          { name: "Removed", value: removed },
        ],
        chartType: "pie",
      };
    }

    case "comms": {
      const stats = await getJson(`/api/notifications/stats?${cq}`);
      const totals = stats?.data?.totals ?? {};

      const rows = [
        { metric: "Emails Sent", value: totals.sent ?? 0 },
        { metric: "Delivered", value: totals.delivered ?? 0 },
        { metric: "Open Rate (est.)", value: totals.opened ? `${totals.opened}%` : "N/A" },
        { metric: "SMS Delivered", value: totals.smsDelivered ?? 0 },
        { metric: "Push Sent", value: totals.pushSent ?? 0 },
        { metric: "Failed", value: totals.failed ?? 0 },
      ];

      return {
        title: "Communications Delivery",
        columns: ["metric", "value"],
        rows,
        chartData: [
          { name: "Delivered", value: Number(totals.delivered ?? 0) },
          { name: "SMS", value: Number(totals.smsDelivered ?? 0) },
          { name: "Push", value: Number(totals.pushSent ?? 0) },
          { name: "Failed", value: Number(totals.failed ?? 0) },
        ],
        chartType: "pie",
      };
    }

    default:
      return null;
  }
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TAB 2 — CUSTOM REPORT BUILDER                                */
/* ═══════════════════════════════════════════════════════════════ */
function CustomBuilderTab({ campaignId }: { campaignId: string }) {
  const [step, setStep] = useState(1);
  const [dataSource, setDataSource] = useState<DataSource>("contacts");
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [filters, setFilters] = useState<ReportFilters>({
    dateFrom: "",
    dateTo: "",
    ward: "",
    supportLevel: "",
    status: "",
    tags: "",
  });
  const [groupBy, setGroupBy] = useState("");
  const [previewData, setPreviewData] = useState<Record<string, string | number>[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [saveName, setSaveName] = useState("");

  const availableColumns = DATA_SOURCE_COLUMNS[dataSource];
  const groupOptions = GROUP_BY_OPTIONS[dataSource];

  function handleColumnToggle(key: string) {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((c) => c !== key) : [...prev, key],
    );
  }

  function selectAllColumns() {
    setSelectedColumns(availableColumns.map((c) => c.key));
  }

  useEffect(() => {
    setSelectedColumns([]);
    setGroupBy("");
    setPreviewData(null);
  }, [dataSource]);

  async function runPreview() {
    setLoading(true);
    setPreviewData(null);

    const data = await fetchCustomData(campaignId, dataSource, filters);
    setPreviewData(data);
    setLoading(false);
    setStep(5);
  }

  function handleSave() {
    if (!saveName.trim()) return;
    const saved = loadSavedReports(campaignId);
    const report: SavedReport = {
      id: `rpt-${Date.now()}`,
      name: saveName.trim(),
      createdAt: new Date().toISOString(),
      dataSource,
      columns: selectedColumns,
      filters,
      groupBy,
    };
    persistSavedReports(campaignId, [...saved, report]);
    setSaveName("");
    setStep(6);
  }

  function handleExport() {
    if (!previewData) return;
    const cols = selectedColumns.length > 0 ? selectedColumns : availableColumns.map((c) => c.key);
    downloadCsv(`custom-report-${Date.now()}.csv`, cols, previewData);
  }

  const stepLabels = [
    "Data Source",
    "Columns",
    "Filters",
    "Grouping",
    "Preview",
    "Save",
  ];

  return (
    <div className="space-y-6">
      {/* Progress steps */}
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex items-center gap-1 overflow-x-auto">
          {stepLabels.map((label, i) => {
            const stepNum = i + 1;
            const isActive = step === stepNum;
            const isDone = step > stepNum;
            return (
              <button
                key={label}
                onClick={() => stepNum <= step && setStep(stepNum)}
                className="flex min-h-[44px] flex-1 items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold transition-colors sm:text-sm"
                style={{
                  color: isActive ? C.navy : isDone ? C.green : C.slate500,
                  backgroundColor: isActive ? `${C.navy}08` : "transparent",
                }}
              >
                <span
                  className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full text-xs text-white"
                  style={{
                    backgroundColor: isActive ? C.navy : isDone ? C.green : C.slate200,
                    color: isActive || isDone ? "white" : C.slate500,
                  }}
                >
                  {isDone ? "\u2713" : stepNum}
                </span>
                <span className="hidden sm:inline">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Step content */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div
              key="s1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h3 className="mb-4 text-lg font-bold" style={{ color: C.slate900 }}>
                Step 1: Select Data Source
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {(Object.keys(DATA_SOURCE_COLUMNS) as DataSource[]).map((ds) => {
                  const icons: Record<DataSource, React.ComponentType<{ className?: string }>> = {
                    contacts: Users,
                    interactions: Megaphone,
                    donations: Wallet,
                    volunteers: Heart,
                    signs: MapPin,
                    events: CalendarDays,
                    gotv: Vote,
                  };
                  const Icon = icons[ds];
                  return (
                    <motion.button
                      key={ds}
                      whileTap={{ scale: 0.97 }}
                      transition={spring}
                      onClick={() => {
                        setDataSource(ds);
                        setStep(2);
                      }}
                      className={`min-h-[44px] rounded-xl border p-4 text-left transition-shadow hover:shadow-md ${
                        dataSource === ds ? "border-2" : "border-slate-200"
                      }`}
                      style={dataSource === ds ? { borderColor: C.green } : undefined}
                    >
                      <Icon className="mb-2 h-5 w-5 text-emerald-600" />
                      <span className="text-sm font-bold capitalize" style={{ color: C.slate900 }}>
                        {ds}
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div
              key="s2"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-bold" style={{ color: C.slate900 }}>
                  Step 2: Select Columns
                </h3>
                <button
                  onClick={selectAllColumns}
                  className="text-sm font-semibold"
                  style={{ color: C.green }}
                >
                  Select All
                </button>
              </div>
              <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {availableColumns.map((col) => (
                  <label
                    key={col.key}
                    className="flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border border-slate-200 p-3 hover:bg-slate-50"
                  >
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(col.key)}
                      onChange={() => handleColumnToggle(col.key)}
                      className="h-4 w-4 rounded"
                    />
                    <span className="text-sm font-medium" style={{ color: C.slate700 }}>
                      {col.label}
                    </span>
                  </label>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => setStep(1)}
                  className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                  style={{ color: C.slate700 }}
                >
                  Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => setStep(3)}
                  className="min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: C.navy }}
                  disabled={selectedColumns.length === 0}
                >
                  Next
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div
              key="s3"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h3 className="mb-4 text-lg font-bold" style={{ color: C.slate900 }}>
                Step 3: Filters
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: C.slate500 }}>
                    Date From
                  </label>
                  <input
                    type="date"
                    value={filters.dateFrom}
                    onChange={(e) => setFilters({ ...filters, dateFrom: e.target.value })}
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: C.slate500 }}>
                    Date To
                  </label>
                  <input
                    type="date"
                    value={filters.dateTo}
                    onChange={(e) => setFilters({ ...filters, dateTo: e.target.value })}
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: C.slate500 }}>
                    Ward
                  </label>
                  <input
                    type="text"
                    value={filters.ward}
                    onChange={(e) => setFilters({ ...filters, ward: e.target.value })}
                    placeholder="e.g. Ward 10"
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: C.slate500 }}>
                    Support Level
                  </label>
                  <select
                    value={filters.supportLevel}
                    onChange={(e) => setFilters({ ...filters, supportLevel: e.target.value })}
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  >
                    <option value="">All</option>
                    <option value="strong_support">Strong Support</option>
                    <option value="leaning_support">Leaning Support</option>
                    <option value="undecided">Undecided</option>
                    <option value="leaning_oppose">Leaning Oppose</option>
                    <option value="strong_oppose">Strong Oppose</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: C.slate500 }}>
                    Status
                  </label>
                  <input
                    type="text"
                    value={filters.status}
                    onChange={(e) => setFilters({ ...filters, status: e.target.value })}
                    placeholder="e.g. active, received"
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: C.slate500 }}>
                    Tags
                  </label>
                  <input
                    type="text"
                    value={filters.tags}
                    onChange={(e) => setFilters({ ...filters, tags: e.target.value })}
                    placeholder="comma-separated"
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
              </div>
              <div className="mt-4 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => setStep(2)}
                  className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                  style={{ color: C.slate700 }}
                >
                  Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => setStep(4)}
                  className="min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: C.navy }}
                >
                  Next
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div
              key="s4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h3 className="mb-4 text-lg font-bold" style={{ color: C.slate900 }}>
                Step 4: Grouping
              </h3>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => setGroupBy("")}
                  className={`min-h-[44px] rounded-xl border p-4 text-left text-sm font-semibold ${
                    groupBy === "" ? "border-2" : "border-slate-200"
                  }`}
                  style={groupBy === "" ? { borderColor: C.green, color: C.green } : { color: C.slate700 }}
                >
                  No Grouping
                </motion.button>
                {groupOptions.map((opt) => (
                  <motion.button
                    key={opt.key}
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    onClick={() => setGroupBy(opt.key)}
                    className={`min-h-[44px] rounded-xl border p-4 text-left text-sm font-semibold ${
                      groupBy === opt.key ? "border-2" : "border-slate-200"
                    }`}
                    style={
                      groupBy === opt.key
                        ? { borderColor: C.green, color: C.green }
                        : { color: C.slate700 }
                    }
                  >
                    Group by {opt.label}
                  </motion.button>
                ))}
              </div>
              <div className="mt-4 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => setStep(3)}
                  className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                  style={{ color: C.slate700 }}
                >
                  Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={runPreview}
                  className="min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: C.green }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Play className="h-4 w-4" /> Generate Preview
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 5 && (
            <motion.div
              key="s5"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-bold" style={{ color: C.slate900 }}>
                  Step 5: Preview Results
                </h3>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    onClick={handleExport}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                    style={{ color: C.slate700 }}
                  >
                    <Download className="h-4 w-4" /> Export CSV
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    onClick={() => window.print()}
                    className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                    style={{ color: C.slate700 }}
                  >
                    <Printer className="h-4 w-4" /> Print
                  </motion.button>
                </div>
              </div>

              {loading ? (
                <TableSkeleton />
              ) : previewData && previewData.length > 0 ? (
                <div className="print-area overflow-x-auto">
                  <p className="mb-2 text-sm" style={{ color: C.slate500 }}>
                    {previewData.length} record{previewData.length !== 1 ? "s" : ""} found
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {selectedColumns.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left font-semibold"
                            style={{ color: C.slate700 }}
                          >
                            {availableColumns.find((c) => c.key === col)?.label ?? col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {previewData.map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          {selectedColumns.map((col) => (
                            <td key={col} className="px-3 py-2" style={{ color: C.slate700 }}>
                              {String(row[col] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <EmptyState
                  icon={Search}
                  headline="No records match your filters."
                  action="Adjust Filters"
                  onAction={() => setStep(3)}
                />
              )}

              <div className="mt-4 flex gap-2">
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => setStep(4)}
                  className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                  style={{ color: C.slate700 }}
                >
                  Back
                </motion.button>
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => setStep(6)}
                  className="min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white"
                  style={{ backgroundColor: C.navy }}
                >
                  <span className="inline-flex items-center gap-2">
                    <Save className="h-4 w-4" /> Save as Template
                  </span>
                </motion.button>
              </div>
            </motion.div>
          )}

          {step === 6 && (
            <motion.div
              key="s6"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <h3 className="mb-4 text-lg font-bold" style={{ color: C.slate900 }}>
                Step 6: Save Report Template
              </h3>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="mb-1 block text-xs font-semibold" style={{ color: C.slate500 }}>
                    Report Name
                  </label>
                  <input
                    type="text"
                    value={saveName}
                    onChange={(e) => setSaveName(e.target.value)}
                    placeholder="e.g. Weekly Ward 10 Contacts"
                    className="min-h-[44px] w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                  />
                </div>
                <div className="rounded-lg bg-slate-50 p-3 text-sm" style={{ color: C.slate700 }}>
                  <p>
                    <strong>Source:</strong> {dataSource}
                  </p>
                  <p>
                    <strong>Columns:</strong> {selectedColumns.length}
                  </p>
                  <p>
                    <strong>Group by:</strong> {groupBy || "None"}
                  </p>
                </div>
                <div className="flex gap-2">
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    onClick={() => setStep(5)}
                    className="min-h-[44px] rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                    style={{ color: C.slate700 }}
                  >
                    Back
                  </motion.button>
                  <motion.button
                    whileTap={{ scale: 0.97 }}
                    transition={spring}
                    onClick={handleSave}
                    disabled={!saveName.trim()}
                    className="min-h-[44px] rounded-lg px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: C.green }}
                  >
                    <span className="inline-flex items-center gap-2">
                      <Save className="h-4 w-4" /> Save Template
                    </span>
                  </motion.button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* ── Fetch custom data ─────────────────────────────────────────── */
async function fetchCustomData(
  campaignId: string,
  source: DataSource,
  filters: ReportFilters,
): Promise<Record<string, string | number>[]> {
  const cq = `campaignId=${campaignId}`;
  const params = new URLSearchParams();
  params.set("campaignId", campaignId);
  params.set("pageSize", "1000");
  if (filters.supportLevel) params.set("supportLevels", filters.supportLevel);
  if (filters.status) params.set("status", filters.status);
  if (filters.tags) params.set("tags", filters.tags);

  const urlMap: Record<DataSource, string> = {
    contacts: `/api/contacts?${params.toString()}`,
    interactions: `/api/analytics/canvassing?${cq}`,
    donations: `/api/donations?${params.toString()}`,
    volunteers: `/api/volunteers?${params.toString()}`,
    signs: `/api/signs?${params.toString()}`,
    events: `/api/events?${params.toString()}`,
    gotv: `/api/gotv?${cq}`,
  };

  const data = await getJson(urlMap[source]);
  if (!data) return [];

  const rawList = Array.isArray(data) ? data : data.data ?? data.contacts ?? [];
  if (!Array.isArray(rawList)) return [];

  return rawList.map((item: Record<string, unknown>) => {
    const row: Record<string, string | number> = {};
    const cols = DATA_SOURCE_COLUMNS[source];
    for (const col of cols) {
      const val = item[col.key];
      if (val === null || val === undefined) {
        row[col.key] = "—";
      } else if (typeof val === "object") {
        row[col.key] = JSON.stringify(val);
      } else {
        row[col.key] = val as string | number;
      }
    }
    return row;
  });
}

/* ═══════════════════════════════════════════════════════════════ */
/*  TAB 3 — SAVED REPORTS                                        */
/* ═══════════════════════════════════════════════════════════════ */
function SavedReportsTab({ campaignId }: { campaignId: string }) {
  const [reports, setReports] = useState<SavedReport[]>([]);
  const [runningId, setRunningId] = useState<string | null>(null);
  const [runResult, setRunResult] = useState<Record<string, string | number>[] | null>(null);
  const [runColumns, setRunColumns] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setReports(loadSavedReports(campaignId));
  }, [campaignId]);

  function handleDelete(id: string) {
    const updated = reports.filter((r) => r.id !== id);
    persistSavedReports(campaignId, updated);
    setReports(updated);
    if (runningId === id) {
      setRunningId(null);
      setRunResult(null);
    }
  }

  async function handleRun(report: SavedReport) {
    setRunningId(report.id);
    setRunColumns(report.columns);
    setLoading(true);
    setRunResult(null);

    const data = await fetchCustomData(campaignId, report.dataSource, report.filters);
    setRunResult(data);
    setLoading(false);
  }

  function handleExport(report: SavedReport) {
    if (!runResult) return;
    downloadCsv(`${report.name.replace(/\s+/g, "-").toLowerCase()}.csv`, report.columns, runResult);
  }

  if (reports.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-6">
        <EmptyState
          icon={BookOpen}
          headline="No saved reports yet."
          action="Build a Custom Report"
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {reports.map((report) => (
        <motion.div
          key={report.id}
          layout
          transition={spring}
          className="rounded-2xl border border-slate-200 bg-white p-5"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="text-sm font-bold" style={{ color: C.slate900 }}>
                {report.name}
              </h3>
              <p className="text-xs" style={{ color: C.slate500 }}>
                {report.dataSource} &middot; {report.columns.length} columns &middot; Created{" "}
                {report.createdAt.slice(0, 10)}
              </p>
            </div>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => handleRun(report)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
                style={{ backgroundColor: C.green }}
              >
                <Play className="h-4 w-4" /> Run
              </motion.button>
              {runningId === report.id && runResult && (
                <motion.button
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => handleExport(report)}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                  style={{ color: C.slate700 }}
                >
                  <Download className="h-4 w-4" /> CSV
                </motion.button>
              )}
              <motion.button
                whileTap={{ scale: 0.97 }}
                transition={spring}
                onClick={() => handleDelete(report.id)}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold"
                style={{ color: C.red }}
              >
                <Trash2 className="h-4 w-4" />
              </motion.button>
            </div>
          </div>

          {/* Run results */}
          {runningId === report.id && (
            <div className="mt-4">
              {loading ? (
                <TableSkeleton />
              ) : runResult && runResult.length > 0 ? (
                <div className="overflow-x-auto">
                  <p className="mb-2 text-xs" style={{ color: C.slate500 }}>
                    {runResult.length} records
                  </p>
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-slate-200">
                        {runColumns.map((col) => (
                          <th
                            key={col}
                            className="px-3 py-2 text-left font-semibold"
                            style={{ color: C.slate700 }}
                          >
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {runResult.slice(0, 50).map((row, i) => (
                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50">
                          {runColumns.map((col) => (
                            <td key={col} className="px-3 py-2" style={{ color: C.slate700 }}>
                              {String(row[col] ?? "—")}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {runResult.length > 50 && (
                    <p className="mt-2 text-xs" style={{ color: C.slate500 }}>
                      Showing first 50 of {runResult.length} records. Export CSV for full data.
                    </p>
                  )}
                </div>
              ) : (
                <EmptyState icon={Search} headline="No records found." />
              )}
            </div>
          )}
        </motion.div>
      ))}
    </div>
  );
}
