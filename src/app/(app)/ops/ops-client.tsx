"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  Users,
  QrCode,
  Server,
  Database,
  Cpu,
  Wifi,
  Clock,
  HardDrive,
  ShieldCheck,
  Zap,
  CheckCircle,
  AlertCircle,
  Copy,
  RefreshCw,
  Crown,
  Building2,
  CreditCard,
  BarChart3,
  TrendingUp,
  FileText,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── palette ────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ── types ──────────────────────────────────────────────────── */
type Tab = "health" | "alerts" | "customers" | "demo" | "platform";

interface HealthMetric {
  id: string;
  label: string;
  value: string;
  status: "green" | "amber" | "red";
  icon: keyof typeof METRIC_ICONS;
}

interface OpsAlert {
  id: string;
  message: string;
  severity: "info" | "warning" | "critical";
  createdAt: string;
  resolved: boolean;
}

interface Campaign {
  id: string;
  name: string;
  tier: string;
  mrr: number;
  active: boolean;
  createdAt: string;
}

interface DemoToken {
  id: string;
  type: string;
  token: string;
  expiresAt: string;
}

interface RecentCampaign {
  id: string;
  name: string;
  slug: string;
  isActive: boolean;
  createdAt: string;
  _count: { memberships: number };
}

interface PlatformStats {
  campaigns: { total: number; active: number; inactive: number };
  users: { total: number; last30days: number };
  contacts: { total: number };
  polls: { total: number; responses: number };
  pipeline: { sourcesActive: number; contentPending: number };
  recentCampaigns: RecentCampaign[];
}

interface SecurityEvent {
  id: string;
  type: string;
  createdAt: string;
  success: boolean;
}

interface SecurityResponse {
  recentEvents: SecurityEvent[];
}

interface DemosResponse {
  data: DemoToken[];
}

interface DemoCreateResponse {
  data: DemoToken;
}

const METRIC_ICONS = {
  server: Server,
  database: Database,
  cpu: Cpu,
  wifi: Wifi,
  clock: Clock,
  hdd: HardDrive,
  shield: ShieldCheck,
  zap: Zap,
};

const STATUS_COLORS = {
  green: {
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    dot: GREEN,
    text: "text-emerald-700",
  },
  amber: {
    bg: "bg-amber-50",
    border: "border-amber-200",
    dot: AMBER,
    text: "text-amber-700",
  },
  red: {
    bg: "bg-red-50",
    border: "border-red-200",
    dot: RED,
    text: "text-red-700",
  },
};

const SEVERITY_STYLES = {
  info: { bg: "bg-blue-100", text: "text-blue-800" },
  warning: { bg: "bg-amber-100", text: "text-amber-800" },
  critical: { bg: "bg-red-100", text: "text-red-800" },
};

const TIER_STYLES: Record<string, string> = {
  free: "bg-gray-100 text-gray-600",
  starter: "bg-blue-100 text-blue-700",
  pro: "bg-purple-100 text-purple-700",
  enterprise: "bg-amber-100 text-amber-700",
  active: "bg-emerald-100 text-emerald-700",
};

const DEMO_TYPES = [
  {
    type: "candidate" as const,
    label: "Candidate",
    desc: "Full campaign dashboard demo",
  },
  {
    type: "party" as const,
    label: "Party",
    desc: "Multi-campaign party view",
  },
  {
    type: "media" as const,
    label: "Media",
    desc: "Public election data access",
  },
];

/* ── shimmer ────────────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />
  );
}

/* ── main ───────────────────────────────────────────────────── */
export default function OpsClient() {
  const [tab, setTab] = useState<Tab>("platform");
  const [health, setHealth] = useState<HealthMetric[]>([]);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [demoTokens, setDemoTokens] = useState<DemoToken[]>([]);
  const [platformStats, setPlatformStats] = useState<PlatformStats | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [generatingDemo, setGeneratingDemo] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      // Load platform stats (real data)
      const statsRes = await fetch("/api/platform/stats");
      if (statsRes.ok) {
        const stats = (await statsRes.json()) as PlatformStats;
        setPlatformStats(stats);

        // Build health metrics from real platform data
        const healthMetrics: HealthMetric[] = [
          {
            id: "h-campaigns",
            label: "Total Campaigns",
            value: String(stats.campaigns.total),
            status: stats.campaigns.total > 0 ? "green" : "amber",
            icon: "server",
          },
          {
            id: "h-active",
            label: "Active Campaigns",
            value: String(stats.campaigns.active),
            status: stats.campaigns.active > 0 ? "green" : "amber",
            icon: "zap",
          },
          {
            id: "h-users",
            label: "Total Users",
            value: String(stats.users.total),
            status: stats.users.total > 0 ? "green" : "amber",
            icon: "shield",
          },
          {
            id: "h-new-users",
            label: "New Users (30d)",
            value: String(stats.users.last30days),
            status: "green",
            icon: "wifi",
          },
          {
            id: "h-contacts",
            label: "Total Contacts",
            value: stats.contacts.total.toLocaleString(),
            status: "green",
            icon: "database",
          },
          {
            id: "h-polls",
            label: "Polls Created",
            value: String(stats.polls.total),
            status: "green",
            icon: "cpu",
          },
          {
            id: "h-responses",
            label: "Poll Responses",
            value: stats.polls.responses.toLocaleString(),
            status: "green",
            icon: "hdd",
          },
          {
            id: "h-content",
            label: "Content Pending",
            value: String(stats.pipeline.contentPending),
            status: stats.pipeline.contentPending > 10 ? "amber" : "green",
            icon: "clock",
          },
        ];
        setHealth(healthMetrics);

        // Build campaigns list from recent campaigns
        const campaignList: Campaign[] = stats.recentCampaigns.map((c) => ({
          id: c.id,
          name: c.name,
          tier: "active",
          mrr: 0,
          active: c.isActive,
          createdAt: c.createdAt,
        }));
        setCampaigns(campaignList);
      }

      // Load security alerts (real data)
      const secRes = await fetch("/api/ops/security");
      if (secRes.ok) {
        const secData = (await secRes.json()) as SecurityResponse;
        const mappedAlerts: OpsAlert[] = (secData.recentEvents ?? [])
          .slice(0, 20)
          .map((e) => ({
            id: e.id,
            message: e.type.replace(/_/g, " "),
            severity: e.success ? ("info" as const) : ("warning" as const),
            createdAt: e.createdAt,
            resolved: e.success,
          }));
        setAlerts(mappedAlerts);
      }

      // Load demo tokens (real data)
      const demosRes = await fetch("/api/ops/demos");
      if (demosRes.ok) {
        const demosData = (await demosRes.json()) as DemosResponse;
        setDemoTokens(demosData.data ?? []);
      }
    } catch (err) {
      console.error("Failed to load ops data:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function resolveAlert(id: string) {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, resolved: true } : a)),
    );
  }

  async function generateDemo(type: "candidate" | "party" | "media") {
    setGeneratingDemo(type);
    try {
      const res = await fetch("/api/ops/demos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, expiresInHours: 168 }),
      });
      if (res.ok) {
        const data = (await res.json()) as DemoCreateResponse;
        setDemoTokens((prev) => [data.data, ...prev]);
      }
    } catch (err) {
      console.error("Failed to generate demo:", err);
    } finally {
      setGeneratingDemo(null);
    }
  }

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: "platform", label: "Platform", icon: BarChart3 },
    { id: "health", label: "Health", icon: Activity },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "customers", label: "Customers", icon: Users },
    { id: "demo", label: "Demo", icon: QrCode },
  ];

  const unresolvedCount = alerts.filter((a) => !a.resolved).length;
  const totalMrr = campaigns.reduce((s, c) => s + c.mrr, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={spring}
        className="flex items-center gap-3"
      >
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center"
          style={{ background: NAVY }}
        >
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>
            Operator Dashboard
          </h1>
          <p className="text-sm text-gray-500">
            Platform master control — health, alerts, customers, and demos
          </p>
        </div>
        <button
          onClick={() => void loadData()}
          className="ml-auto p-2 rounded-lg hover:bg-gray-100 transition-colors"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4 text-gray-400" />
        </button>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px]",
              tab === t.id
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700",
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
            {t.id === "alerts" && unresolvedCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                {unresolvedCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <Shimmer key={i} className="h-28" />
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key={tab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={spring}
          >
            {tab === "platform" && <PlatformTab stats={platformStats} />}
            {tab === "health" && <HealthTab metrics={health} />}
            {tab === "alerts" && (
              <AlertsTab alerts={alerts} onResolve={resolveAlert} />
            )}
            {tab === "customers" && (
              <CustomersTab campaigns={campaigns} totalMrr={totalMrr} />
            )}
            {tab === "demo" && (
              <DemoTab
                tokens={demoTokens}
                generating={generatingDemo}
                onGenerate={generateDemo}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── Platform Tab ───────────────────────────────────────────── */
function PlatformTab({ stats }: { stats: PlatformStats | null }) {
  if (!stats) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <BarChart3 className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-500">No platform data available</p>
      </div>
    );
  }

  const bigStats: Array<{
    label: string;
    value: string | number;
    sub: string;
    icon: typeof Building2;
    color: string;
  }> = [
    {
      label: "Total Campaigns",
      value: stats.campaigns.total,
      sub: `${stats.campaigns.active} active`,
      icon: Building2,
      color: NAVY,
    },
    {
      label: "Total Users",
      value: stats.users.total,
      sub: `+${stats.users.last30days} this month`,
      icon: Users,
      color: GREEN,
    },
    {
      label: "Total Contacts",
      value: stats.contacts.total.toLocaleString(),
      sub: "across all campaigns",
      icon: TrendingUp,
      color: "#6366f1",
    },
    {
      label: "Poll Responses",
      value: stats.polls.responses.toLocaleString(),
      sub: `${stats.polls.total} polls total`,
      icon: Activity,
      color: AMBER,
    },
    {
      label: "Content Pending",
      value: stats.pipeline.contentPending,
      sub: "draft posts awaiting approval",
      icon: FileText,
      color: RED,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Big stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {bigStats.map((s, i) => {
          const Icon = s.icon;
          return (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm"
            >
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-gray-400 uppercase">
                  {s.label}
                </p>
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center"
                  style={{ background: `${s.color}18` }}
                >
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <p className="text-3xl font-bold" style={{ color: NAVY }}>
                {s.value}
              </p>
              <p className="text-xs text-gray-400 mt-1">{s.sub}</p>
            </motion.div>
          );
        })}
      </div>

      {/* Recent campaigns table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="text-sm font-bold text-gray-900">Recent Campaigns</h2>
          <span className="text-xs text-gray-400">
            {stats.recentCampaigns.length} shown
          </span>
        </div>
        {stats.recentCampaigns.length === 0 ? (
          <div className="p-12 text-center">
            <Building2 className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p className="text-sm text-gray-500">No campaigns yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-left">
                <tr>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Campaign
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Slug
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Members
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Created
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recentCampaigns.map((c, i) => (
                  <motion.tr
                    key={c.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ ...spring, delay: i * 0.03 }}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 flex-shrink-0" />
                        <span className="font-medium text-gray-900">
                          {c.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <code className="text-xs text-gray-500 bg-gray-50 px-2 py-0.5 rounded">
                        {c.slug}
                      </code>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {c._count.memberships}
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-xs">
                      {new Date(c.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      {c.isActive ? (
                        <span
                          className="inline-flex items-center gap-1 text-xs font-medium"
                          style={{ color: GREEN }}
                        >
                          <span
                            className="w-2 h-2 rounded-full"
                            style={{ background: GREEN }}
                          />{" "}
                          Active
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                          <span className="w-2 h-2 rounded-full bg-gray-300" />{" "}
                          Inactive
                        </span>
                      )}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Health Tab ─────────────────────────────────────────────── */
function HealthTab({ metrics }: { metrics: HealthMetric[] }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {metrics.map((m, i) => {
        const Icon = METRIC_ICONS[m.icon] ?? Activity;
        const s = STATUS_COLORS[m.status];
        return (
          <motion.div
            key={m.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: i * 0.04 }}
            className={cn("rounded-2xl border p-4 shadow-sm", s.bg, s.border)}
          >
            <div className="flex items-center justify-between mb-3">
              <Icon className="w-5 h-5 text-gray-400" />
              <span
                className="w-3 h-3 rounded-full animate-pulse"
                style={{ background: s.dot }}
              />
            </div>
            <p className="text-2xl font-bold" style={{ color: NAVY }}>
              {m.value}
            </p>
            <p className={cn("text-xs font-medium mt-1", s.text)}>{m.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Alerts Tab ─────────────────────────────────────────────── */
function AlertsTab({
  alerts,
  onResolve,
}: {
  alerts: OpsAlert[];
  onResolve: (id: string) => void;
}) {
  const unresolved = alerts.filter((a) => !a.resolved);
  const resolved = alerts.filter((a) => a.resolved);

  if (alerts.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
        <CheckCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
        <p className="text-sm text-gray-500">No alerts to display</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {unresolved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase">
            Active ({unresolved.length})
          </p>
          {unresolved.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: i * 0.05 }}
              className="flex items-start gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
            >
              <AlertCircle
                className="w-5 h-5 flex-shrink-0 mt-0.5"
                style={{
                  color:
                    a.severity === "critical"
                      ? RED
                      : a.severity === "warning"
                        ? AMBER
                        : "#6b7280",
                }}
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span
                    className={cn(
                      "text-xs font-bold px-2 py-0.5 rounded-full",
                      SEVERITY_STYLES[a.severity].bg,
                      SEVERITY_STYLES[a.severity].text,
                    )}
                  >
                    {a.severity}
                  </span>
                  <span className="text-xs text-gray-400">
                    {new Date(a.createdAt).toLocaleString()}
                  </span>
                </div>
                <p className="text-sm text-gray-900">{a.message}</p>
              </div>
              <button
                onClick={() => onResolve(a.id)}
                className="text-xs font-semibold text-white px-3 py-1.5 rounded-lg min-h-[44px] hover:opacity-90"
                style={{ background: GREEN }}
              >
                Resolve
              </button>
            </motion.div>
          ))}
        </div>
      )}
      {resolved.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase">
            Resolved ({resolved.length})
          </p>
          {resolved.map((a) => (
            <div
              key={a.id}
              className="flex items-start gap-3 bg-gray-50 rounded-2xl border border-gray-100 p-4 opacity-60"
            >
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-400">
                  {new Date(a.createdAt).toLocaleString()}
                </span>
                <p className="text-sm text-gray-500 line-through">
                  {a.message}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Customers Tab ──────────────────────────────────────────── */
function CustomersTab({
  campaigns,
  totalMrr,
}: {
  campaigns: Campaign[];
  totalMrr: number;
}) {
  return (
    <div className="space-y-4">
      {/* MRR banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase">
            Monthly Recurring Revenue
          </p>
          <p className="text-3xl font-bold" style={{ color: NAVY }}>
            ${totalMrr.toLocaleString()}
          </p>
        </div>
        <CreditCard className="w-8 h-8 text-gray-300" />
      </div>

      {/* Campaigns table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Campaign
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Tier
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  MRR
                </th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">
                  Status
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map((c) => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={cn(
                        "text-xs font-bold px-2 py-0.5 rounded-full",
                        TIER_STYLES[c.tier] ?? "bg-gray-100 text-gray-600",
                      )}
                    >
                      {c.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">
                    ${c.mrr}
                  </td>
                  <td className="px-4 py-3">
                    {c.active ? (
                      <span
                        className="inline-flex items-center gap-1 text-xs font-medium"
                        style={{ color: GREEN }}
                      >
                        <span
                          className="w-2 h-2 rounded-full"
                          style={{ background: GREEN }}
                        />{" "}
                        Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-gray-300" />{" "}
                        Inactive
                      </span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ── Demo Tab ───────────────────────────────────────────────── */
function DemoTab({
  tokens,
  generating,
  onGenerate,
}: {
  tokens: DemoToken[];
  generating: string | null;
  onGenerate: (type: "candidate" | "party" | "media") => void;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyToken(token: string) {
    navigator.clipboard.writeText(token);
    setCopied(token);
    setTimeout(() => setCopied(null), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Generate */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {DEMO_TYPES.map((d) => (
          <motion.button
            key={d.type}
            whileTap={{ scale: 0.97 }}
            onClick={() => onGenerate(d.type)}
            disabled={generating === d.type}
            className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm text-left hover:border-blue-300 transition-colors disabled:opacity-60 min-h-[44px]"
          >
            <QrCode className="w-6 h-6 mb-3 text-gray-400" />
            <p className="font-bold text-gray-900 text-sm">{d.label}</p>
            <p className="text-xs text-gray-500 mt-1">{d.desc}</p>
            {generating === d.type && (
              <div className="flex items-center gap-2 mt-3">
                <RefreshCw className="w-3.5 h-3.5 animate-spin text-gray-400" />
                <span className="text-xs text-gray-400">Generating...</span>
              </div>
            )}
          </motion.button>
        ))}
      </div>

      {/* Tokens */}
      {tokens.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
          <QrCode className="w-12 h-12 mx-auto mb-3 text-gray-300" />
          <p className="text-sm text-gray-500">No demo tokens generated yet</p>
          <p className="text-xs text-gray-400 mt-1">
            Choose a demo type above to create a token
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase">
            Generated Tokens ({tokens.length})
          </p>
          {tokens.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span
                  className={cn(
                    "text-xs font-bold px-2 py-0.5 rounded-full",
                    TIER_STYLES[
                      t.type === "candidate"
                        ? "starter"
                        : t.type === "party"
                          ? "pro"
                          : "enterprise"
                    ] ?? "bg-gray-100 text-gray-600",
                  )}
                >
                  {t.type}
                </span>
                <span className="text-xs text-gray-400">
                  Expires {new Date(t.expiresAt).toLocaleDateString()}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 text-sm font-mono bg-gray-50 px-3 py-2 rounded-lg border border-gray-100 text-gray-700 truncate">
                  {t.token}
                </code>
                <button
                  onClick={() => copyToken(t.token)}
                  className="p-2 rounded-lg hover:bg-gray-100 transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
                >
                  {copied === t.token ? (
                    <CheckCircle className="w-4 h-4" style={{ color: GREEN }} />
                  ) : (
                    <Copy className="w-4 h-4 text-gray-400" />
                  )}
                </button>
              </div>
              {/* QR placeholder */}
              <div className="mt-3 bg-gray-50 border border-gray-100 rounded-lg p-4 flex flex-col items-center">
                <div className="w-24 h-24 bg-white border-2 border-gray-200 rounded-lg flex items-center justify-center">
                  <QrCode className="w-16 h-16 text-gray-300" />
                </div>
                <p className="text-xs text-gray-400 mt-2">Scan to open demo</p>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
