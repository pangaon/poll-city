"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity, AlertTriangle, Users, QrCode, Server, Database, Cpu, Wifi,
  Clock, HardDrive, ShieldCheck, Zap, CheckCircle, XCircle, AlertCircle,
  Copy, RefreshCw, Crown, Building2, CreditCard,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ── palette ────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

/* ── types ──────────────────────────────────────────────────── */
type Tab = "health" | "alerts" | "customers" | "demo";

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
  tier: "free" | "starter" | "pro" | "enterprise";
  mrr: number;
  active: boolean;
  createdAt: string;
}

interface DemoToken {
  id: string;
  type: "candidate" | "party" | "media";
  token: string;
  expiresAt: string;
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
  green: { bg: "bg-emerald-50", border: "border-emerald-200", dot: GREEN, text: "text-emerald-700" },
  amber: { bg: "bg-amber-50", border: "border-amber-200", dot: AMBER, text: "text-amber-700" },
  red: { bg: "bg-red-50", border: "border-red-200", dot: RED, text: "text-red-700" },
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
};

const DEMO_TYPES = [
  { type: "candidate" as const, label: "Candidate", desc: "Full campaign dashboard demo" },
  { type: "party" as const, label: "Party", desc: "Multi-campaign party view" },
  { type: "media" as const, label: "Media", desc: "Public election data access" },
];

/* ── shimmer ────────────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-xl bg-gray-200", className)} />;
}

/* ── main ───────────────────────────────────────────────────── */
export default function OpsClient() {
  const [tab, setTab] = useState<Tab>("health");
  const [health, setHealth] = useState<HealthMetric[]>([]);
  const [alerts, setAlerts] = useState<OpsAlert[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [demoTokens, setDemoTokens] = useState<DemoToken[]>([]);
  const [loading, setLoading] = useState(true);
  const [generatingDemo, setGeneratingDemo] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setHealth(mockHealth());
      setAlerts(mockAlerts());
      setCampaigns(mockCampaigns());
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  function resolveAlert(id: string) {
    setAlerts(prev => prev.map(a => a.id === id ? { ...a, resolved: true } : a));
  }

  function generateDemo(type: "candidate" | "party" | "media") {
    setGeneratingDemo(type);
    setTimeout(() => {
      const token: DemoToken = {
        id: `dt-${Date.now()}`,
        type,
        token: `DEMO-${type.toUpperCase()}-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
      };
      setDemoTokens(prev => [token, ...prev]);
      setGeneratingDemo(null);
    }, 1000);
  }

  const tabs: { id: Tab; label: string; icon: typeof Activity }[] = [
    { id: "health", label: "Health", icon: Activity },
    { id: "alerts", label: "Alerts", icon: AlertTriangle },
    { id: "customers", label: "Customers", icon: Users },
    { id: "demo", label: "Demo", icon: QrCode },
  ];

  const unresolvedCount = alerts.filter(a => !a.resolved).length;
  const totalMrr = campaigns.reduce((s, c) => s + c.mrr, 0);

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={spring} className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: NAVY }}>
          <Crown className="w-5 h-5 text-white" />
        </div>
        <div>
          <h1 className="text-xl font-bold" style={{ color: NAVY }}>Operator Dashboard</h1>
          <p className="text-sm text-gray-500">System health, alerts, customers, and demos</p>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 overflow-x-auto">
        {tabs.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap min-h-[44px]",
              tab === t.id ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
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
          <motion.div key="loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => <Shimmer key={i} className="h-28" />)}
            </div>
          </motion.div>
        ) : (
          <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={spring}>
            {tab === "health" && <HealthTab metrics={health} />}
            {tab === "alerts" && <AlertsTab alerts={alerts} onResolve={resolveAlert} />}
            {tab === "customers" && <CustomersTab campaigns={campaigns} totalMrr={totalMrr} />}
            {tab === "demo" && <DemoTab tokens={demoTokens} generating={generatingDemo} onGenerate={generateDemo} />}
          </motion.div>
        )}
      </AnimatePresence>
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
              <span className="w-3 h-3 rounded-full animate-pulse" style={{ background: s.dot }} />
            </div>
            <p className="text-2xl font-bold" style={{ color: NAVY }}>{m.value}</p>
            <p className={cn("text-xs font-medium mt-1", s.text)}>{m.label}</p>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Alerts Tab ─────────────────────────────────────────────── */
function AlertsTab({ alerts, onResolve }: { alerts: OpsAlert[]; onResolve: (id: string) => void }) {
  const unresolved = alerts.filter(a => !a.resolved);
  const resolved = alerts.filter(a => a.resolved);

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
          <p className="text-xs font-bold text-gray-400 uppercase">Active ({unresolved.length})</p>
          {unresolved.map((a, i) => (
            <motion.div
              key={a.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...spring, delay: i * 0.05 }}
              className="flex items-start gap-3 bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
            >
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: a.severity === "critical" ? RED : a.severity === "warning" ? AMBER : "#6b7280" }} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", SEVERITY_STYLES[a.severity].bg, SEVERITY_STYLES[a.severity].text)}>
                    {a.severity}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
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
          <p className="text-xs font-bold text-gray-400 uppercase">Resolved ({resolved.length})</p>
          {resolved.map(a => (
            <div key={a.id} className="flex items-start gap-3 bg-gray-50 rounded-2xl border border-gray-100 p-4 opacity-60">
              <CheckCircle className="w-5 h-5 flex-shrink-0 mt-0.5 text-gray-400" />
              <div className="flex-1 min-w-0">
                <span className="text-xs text-gray-400">{new Date(a.createdAt).toLocaleString()}</span>
                <p className="text-sm text-gray-500 line-through">{a.message}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Customers Tab ──────────────────────────────────────────── */
function CustomersTab({ campaigns, totalMrr }: { campaigns: Campaign[]; totalMrr: number }) {
  return (
    <div className="space-y-4">
      {/* MRR banner */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold text-gray-400 uppercase">Monthly Recurring Revenue</p>
          <p className="text-3xl font-bold" style={{ color: NAVY }}>${totalMrr.toLocaleString()}</p>
        </div>
        <CreditCard className="w-8 h-8 text-gray-300" />
      </div>

      {/* Campaigns table */}
      <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Campaign</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tier</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">MRR</th>
                <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {campaigns.map(c => (
                <tr key={c.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="font-medium text-gray-900">{c.name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", TIER_STYLES[c.tier])}>
                      {c.tier}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">${c.mrr}</td>
                  <td className="px-4 py-3">
                    {c.active ? (
                      <span className="inline-flex items-center gap-1 text-xs font-medium" style={{ color: GREEN }}>
                        <span className="w-2 h-2 rounded-full" style={{ background: GREEN }} /> Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-400">
                        <span className="w-2 h-2 rounded-full bg-gray-300" /> Inactive
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
function DemoTab({ tokens, generating, onGenerate }: { tokens: DemoToken[]; generating: string | null; onGenerate: (type: "candidate" | "party" | "media") => void }) {
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
        {DEMO_TYPES.map(d => (
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
          <p className="text-xs text-gray-400 mt-1">Choose a demo type above to create a token</p>
        </div>
      ) : (
        <div className="space-y-3">
          <p className="text-xs font-bold text-gray-400 uppercase">Generated Tokens</p>
          {tokens.map((t, i) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...spring, delay: i * 0.05 }}
              className="bg-white rounded-2xl border border-gray-200 p-4 shadow-sm"
            >
              <div className="flex items-center justify-between mb-2">
                <span className={cn("text-xs font-bold px-2 py-0.5 rounded-full", TIER_STYLES[t.type === "candidate" ? "starter" : t.type === "party" ? "pro" : "enterprise"])}>
                  {t.type}
                </span>
                <span className="text-xs text-gray-400">Expires {new Date(t.expiresAt).toLocaleDateString()}</span>
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

/* ── mock data ──────────────────────────────────────────────── */
function mockHealth(): HealthMetric[] {
  return [
    { id: "h1", label: "API Latency", value: "42ms", status: "green", icon: "zap" },
    { id: "h2", label: "Database", value: "Connected", status: "green", icon: "database" },
    { id: "h3", label: "CPU Usage", value: "34%", status: "green", icon: "cpu" },
    { id: "h4", label: "Memory", value: "67%", status: "amber", icon: "server" },
    { id: "h5", label: "Disk Usage", value: "52%", status: "green", icon: "hdd" },
    { id: "h6", label: "CDN", value: "Healthy", status: "green", icon: "wifi" },
    { id: "h7", label: "Auth Service", value: "Degraded", status: "red", icon: "shield" },
    { id: "h8", label: "Queue Depth", value: "12", status: "amber", icon: "clock" },
  ];
}

function mockAlerts(): OpsAlert[] {
  return [
    { id: "a1", message: "Auth service response time exceeding 2s threshold", severity: "critical", createdAt: new Date(Date.now() - 1800000).toISOString(), resolved: false },
    { id: "a2", message: "Memory usage on worker-3 above 80% for 15 minutes", severity: "warning", createdAt: new Date(Date.now() - 3600000).toISOString(), resolved: false },
    { id: "a3", message: "SSL certificate for api.pollcity.ca expires in 14 days", severity: "warning", createdAt: new Date(Date.now() - 7200000).toISOString(), resolved: false },
    { id: "a4", message: "Scheduled maintenance window completed successfully", severity: "info", createdAt: new Date(Date.now() - 86400000).toISOString(), resolved: true },
  ];
}

function mockCampaigns(): Campaign[] {
  return [
    { id: "c1", name: "Chow for Toronto", tier: "pro", mrr: 149, active: true, createdAt: "2025-09-01" },
    { id: "c2", name: "Matlow 2026", tier: "starter", mrr: 49, active: true, createdAt: "2025-11-15" },
    { id: "c3", name: "Ontario NDP", tier: "enterprise", mrr: 499, active: true, createdAt: "2025-06-01" },
    { id: "c4", name: "Green Party BC", tier: "pro", mrr: 149, active: true, createdAt: "2025-10-20" },
    { id: "c5", name: "Singh Exploratory", tier: "free", mrr: 0, active: false, createdAt: "2026-01-10" },
    { id: "c6", name: "Bailao Campaign", tier: "starter", mrr: 49, active: true, createdAt: "2025-12-01" },
  ];
}
