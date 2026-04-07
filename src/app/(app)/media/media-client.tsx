"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Building2,
  Check,
  CheckCircle2,
  ClipboardCopy,
  Code2,
  Crown,
  Eye,
  EyeOff,
  Globe,
  Megaphone,
  Newspaper,
  Plus,
  Radio,
  Rss,
  Shield,
  Star,
  Tv,
  Users,
  Vote,
  XCircle,
  Zap,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ─── Brand palette ─────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ─── Spring config ─────────────────────────────────────────────────────── */
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };
const fadeUp = {
  initial: { opacity: 0, y: 16 },
  animate: { opacity: 1, y: 0, transition: spring },
  exit: { opacity: 0, y: -8 },
};
const hoverTap = { whileHover: { scale: 1.02 }, whileTap: { scale: 0.97 } };

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Outlet {
  id: string;
  name: string;
  domain: string | null;
  apiKey: string;
  plan: string;
  isActive: boolean;
  createdAt: string;
}

interface TickerItem {
  id: string;
  mediaOutletId: string | null;
  text: string;
  url: string | null;
  type: string;
  priority: number;
  isActive: boolean;
  expiresAt: string | null;
  createdAt: string;
}

interface LiveResult {
  id: string;
  mediaOutletId: string | null;
  province: string;
  municipality: string;
  ward: string | null;
  office: string;
  candidateName: string;
  party: string | null;
  votes: number;
  percentReporting: number;
  isLeading: boolean;
  isCalled: boolean;
  entryOneUserId: string | null;
  entryTwoUserId: string | null;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

type Tab = "dashboard" | "outlets" | "ticker" | "results";

interface Props {
  campaignId: string;
}

/* ─── Shimmer ───────────────────────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "animate-pulse rounded-xl bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 bg-[length:200%_100%]",
        className
      )}
    />
  );
}

/* ─── Empty state ───────────────────────────────────────────────────────── */
function EmptyState({
  icon: Icon,
  title,
  action,
  onAction,
}: {
  icon: React.ElementType;
  title: string;
  action?: string;
  onAction?: () => void;
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: `${NAVY}10` }}
      >
        <Icon className="w-7 h-7" style={{ color: NAVY }} />
      </div>
      <p className="text-sm font-medium text-gray-500 mb-4">{title}</p>
      {action && onAction && (
        <motion.button
          {...hoverTap}
          onClick={onAction}
          className="px-4 py-2 rounded-lg text-sm font-medium text-white min-h-[44px]"
          style={{ backgroundColor: GREEN }}
        >
          {action}
        </motion.button>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
   ═══════════════════════════════════════════════════════════════════════════ */
export default function MediaClient({ campaignId }: Props) {
  const [tab, setTab] = useState<Tab>("dashboard");
  const [outlets, setOutlets] = useState<Outlet[]>([]);
  const [tickerItems, setTickerItems] = useState<TickerItem[]>([]);
  const [liveResults, setLiveResults] = useState<LiveResult[]>([]);
  const [loading, setLoading] = useState(true);

  /* ─── Data fetching ─────────────────────────────────────────────────── */
  const fetchOutlets = useCallback(async () => {
    try {
      const res = await fetch("/api/media/outlets");
      if (res.ok) {
        const data = await res.json();
        setOutlets(data.data ?? []);
      }
    } catch {
      /* silent */
    }
  }, []);

  const fetchTickerItems = useCallback(async () => {
    try {
      const res = await fetch("/api/ticker/items", {
        headers: { "x-api-key": outlets[0]?.apiKey ?? "" },
      });
      if (res.ok) {
        const data = await res.json();
        setTickerItems(data.data ?? []);
      }
    } catch {
      /* silent */
    }
  }, [outlets]);

  const fetchLiveResults = useCallback(async () => {
    try {
      const res = await fetch("/api/live-results");
      if (res.ok) {
        const data = await res.json();
        setLiveResults(data.data ?? []);
      }
    } catch {
      /* silent */
    }
  }, []);

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchOutlets(), fetchLiveResults()]).finally(() =>
      setLoading(false)
    );
  }, [fetchOutlets, fetchLiveResults]);

  useEffect(() => {
    if (outlets.length > 0) fetchTickerItems();
  }, [outlets, fetchTickerItems]);

  /* ─── Tabs ──────────────────────────────────────────────────────────── */
  const tabs: { key: Tab; label: string; icon: React.ElementType }[] = [
    { key: "dashboard", label: "Dashboard", icon: Newspaper },
    { key: "outlets", label: "Outlets", icon: Building2 },
    { key: "ticker", label: "Ticker", icon: Rss },
    { key: "results", label: "Live Results", icon: Vote },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: NAVY }}>
          Media Suite
        </h1>
        <p className="text-sm text-gray-500">
          Manage outlets, tickers, and live election results.
        </p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 overflow-x-auto rounded-xl bg-gray-100 p-1">
        {tabs.map((t) => (
          <motion.button
            key={t.key}
            {...hoverTap}
            onClick={() => setTab(t.key)}
            className={cn(
              "flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap min-h-[44px] transition-colors",
              tab === t.key
                ? "bg-white text-gray-900 shadow-sm"
                : "text-gray-500 hover:text-gray-700"
            )}
          >
            <t.icon className="w-4 h-4" />
            {t.label}
          </motion.button>
        ))}
      </div>

      {/* Content */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="loading" {...fadeUp} className="space-y-4">
            <Shimmer className="h-32" />
            <div className="grid md:grid-cols-3 gap-4">
              <Shimmer className="h-48" />
              <Shimmer className="h-48" />
              <Shimmer className="h-48" />
            </div>
          </motion.div>
        ) : (
          <motion.div key={tab} {...fadeUp}>
            {tab === "dashboard" && (
              <DashboardTab
                outlets={outlets}
                tickerItems={tickerItems}
                liveResults={liveResults}
                onNavigate={setTab}
              />
            )}
            {tab === "outlets" && (
              <OutletsTab outlets={outlets} onRefresh={fetchOutlets} />
            )}
            {tab === "ticker" && (
              <TickerTab
                outlets={outlets}
                tickerItems={tickerItems}
                onRefresh={fetchTickerItems}
              />
            )}
            {tab === "results" && (
              <ResultsTab
                outlets={outlets}
                liveResults={liveResults}
                onRefresh={fetchLiveResults}
              />
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   DASHBOARD TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function DashboardTab({
  outlets,
  tickerItems,
  liveResults,
  onNavigate,
}: {
  outlets: Outlet[];
  tickerItems: TickerItem[];
  liveResults: LiveResult[];
  onNavigate: (tab: Tab) => void;
}) {
  return (
    <div className="space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatCard
          label="Connected Outlets"
          value={outlets.filter((o) => o.isActive).length}
          icon={Building2}
          color={NAVY}
        />
        <StatCard
          label="Active Ticker Items"
          value={tickerItems.filter((t) => t.isActive).length}
          icon={Rss}
          color={GREEN}
        />
        <StatCard
          label="Live Results"
          value={liveResults.length}
          icon={Vote}
          color={AMBER}
        />
        <StatCard
          label="Verified Results"
          value={liveResults.filter((r) => r.isVerified).length}
          icon={Shield}
          color={GREEN}
        />
      </div>

      {/* Connected outlets */}
      <Section title="Connected Outlets" action="Manage" onAction={() => onNavigate("outlets")}>
        {outlets.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No media outlets connected yet"
            action="Add Outlet"
            onAction={() => onNavigate("outlets")}
          />
        ) : (
          <div className="divide-y">
            {outlets.slice(0, 5).map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between py-3 px-1"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-9 h-9 rounded-lg flex items-center justify-center text-white text-xs font-bold"
                    style={{ backgroundColor: NAVY }}
                  >
                    {o.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {o.name}
                    </p>
                    <p className="text-xs text-gray-500">{o.domain ?? "No domain"}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PlanBadge plan={o.plan} />
                  <StatusBadge active={o.isActive} />
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>

      {/* Ticker preview */}
      <Section title="Ticker Preview" action="Manage" onAction={() => onNavigate("ticker")}>
        {tickerItems.filter((t) => t.isActive).length === 0 ? (
          <EmptyState
            icon={Rss}
            title="No active ticker items"
            action="Create Item"
            onAction={() => onNavigate("ticker")}
          />
        ) : (
          <TickerPreview items={tickerItems.filter((t) => t.isActive)} />
        )}
      </Section>

      {/* Flash poll composer */}
      <Section title="Flash Poll Composer">
        <FlashPollComposer />
      </Section>

      {/* Recent ticker items */}
      <Section title="Recent Ticker Items" action="View All" onAction={() => onNavigate("ticker")}>
        {tickerItems.length === 0 ? (
          <EmptyState icon={Rss} title="No ticker items yet" />
        ) : (
          <div className="space-y-2">
            {tickerItems.slice(0, 5).map((item) => (
              <div
                key={item.id}
                className="flex items-start gap-3 py-2 px-1 border-b last:border-0"
              >
                <TickerTypeBadge type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900 truncate">{item.text}</p>
                  <p className="text-xs text-gray-400">
                    {new Date(item.createdAt).toLocaleString()}
                  </p>
                </div>
                {item.isActive ? (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700">
                    Live
                  </span>
                ) : (
                  <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">
                    Off
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   OUTLETS TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function OutletsTab({
  outlets,
  onRefresh,
}: {
  outlets: Outlet[];
  onRefresh: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", domain: "", plan: "COMMUNITY" });
  const [saving, setSaving] = useState(false);
  const [embedCodes, setEmbedCodes] = useState<Record<string, Record<string, string>>>({});
  const [expandedOutlet, setExpandedOutlet] = useState<string | null>(null);

  async function createOutlet() {
    setSaving(true);
    try {
      const res = await fetch("/api/media/outlets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ name: "", domain: "", plan: "COMMUNITY" });
        setShowForm(false);
        await onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }

  async function loadEmbedCodes(outletId: string) {
    if (embedCodes[outletId]) {
      setExpandedOutlet(expandedOutlet === outletId ? null : outletId);
      return;
    }
    try {
      const res = await fetch(`/api/media/outlets/${outletId}/embed-codes`);
      if (res.ok) {
        const data = await res.json();
        setEmbedCodes((prev) => ({ ...prev, [outletId]: data.data }));
        setExpandedOutlet(outletId);
      }
    } catch {
      /* silent */
    }
  }

  const tiers = [
    {
      plan: "COMMUNITY",
      name: "Community",
      price: "Free",
      features: [
        "Basic ticker embed",
        "Up to 50 items/day",
        "Standard branding",
      ],
      color: NAVY,
    },
    {
      plan: "STANDARD",
      name: "Standard",
      price: "$199/mo",
      features: [
        "All embed formats",
        "Unlimited items",
        "Custom branding",
        "Priority support",
      ],
      color: GREEN,
      popular: true,
    },
    {
      plan: "PREMIUM",
      name: "Premium",
      price: "$499/mo",
      features: [
        "Everything in Standard",
        "Live results iframe",
        "SSE streaming",
        "API access",
        "Dedicated account manager",
      ],
      color: AMBER,
    },
  ];

  return (
    <div className="space-y-6">
      {/* Pricing tiers */}
      <Section title="Pricing Tiers">
        <div className="grid md:grid-cols-3 gap-4">
          {tiers.map((tier) => (
            <motion.div
              key={tier.plan}
              {...hoverTap}
              className={cn(
                "relative rounded-xl border-2 p-5 transition-colors",
                tier.popular ? "border-current" : "border-gray-200"
              )}
              style={tier.popular ? { borderColor: tier.color } : undefined}
            >
              {tier.popular && (
                <span
                  className="absolute -top-3 left-4 px-3 py-0.5 rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: tier.color }}
                >
                  Popular
                </span>
              )}
              <div className="mb-4">
                <p
                  className="text-sm font-semibold"
                  style={{ color: tier.color }}
                >
                  {tier.name}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {tier.price}
                </p>
              </div>
              <ul className="space-y-2">
                {tier.features.map((f) => (
                  <li key={f} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 flex-shrink-0" style={{ color: tier.color }} />
                    {f}
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* Add outlet */}
      <Section
        title="Media Outlets"
        action={showForm ? "Cancel" : "Add Outlet"}
        onAction={() => setShowForm(!showForm)}
      >
        <AnimatePresence>
          {showForm && (
            <motion.div
              {...fadeUp}
              className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3"
            >
              <div className="grid md:grid-cols-2 gap-3">
                <input
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="Outlet name"
                  value={form.name}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, name: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="Domain (e.g. cbc.ca)"
                  value={form.domain}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, domain: e.target.value }))
                  }
                />
              </div>
              <select
                className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                value={form.plan}
                onChange={(e) =>
                  setForm((s) => ({ ...s, plan: e.target.value }))
                }
              >
                <option value="COMMUNITY">Community (Free)</option>
                <option value="STANDARD">Standard ($199/mo)</option>
                <option value="PREMIUM">Premium ($499/mo)</option>
              </select>
              <motion.button
                {...hoverTap}
                onClick={createOutlet}
                disabled={saving || !form.name.trim()}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white min-h-[44px] disabled:opacity-50"
                style={{ backgroundColor: GREEN }}
              >
                {saving ? "Creating..." : "Create Outlet"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {outlets.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No outlets yet"
            action="Add Your First Outlet"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="space-y-3">
            {outlets.map((o) => (
              <motion.div
                key={o.id}
                layout
                className="border rounded-xl overflow-hidden"
              >
                <div className="flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                      style={{ backgroundColor: NAVY }}
                    >
                      {o.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {o.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {o.domain ?? "No domain"} · API Key: {o.apiKey.slice(0, 8)}...
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <PlanBadge plan={o.plan} />
                    <StatusBadge active={o.isActive} />
                    <motion.button
                      {...hoverTap}
                      onClick={() => loadEmbedCodes(o.id)}
                      className="p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
                      title="Embed codes"
                    >
                      <Code2 className="w-4 h-4 text-gray-500" />
                    </motion.button>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedOutlet === o.id && embedCodes[o.id] && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1, transition: spring }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="border-t bg-gray-50 p-4 space-y-3">
                        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                          Embed Codes
                        </p>
                        {Object.entries(embedCodes[o.id]).map(
                          ([key, code]) => (
                            <EmbedCodeRow key={key} label={key} code={code} />
                          )
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   TICKER TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function TickerTab({
  outlets,
  tickerItems,
  onRefresh,
}: {
  outlets: Outlet[];
  tickerItems: TickerItem[];
  onRefresh: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    text: "",
    url: "",
    type: "GENERAL",
    priority: 5,
  });
  const [saving, setSaving] = useState(false);
  const [previewType, setPreviewType] = useState<string | null>(null);

  async function createItem() {
    if (!outlets[0]?.apiKey) return;
    setSaving(true);
    try {
      const res = await fetch("/api/ticker/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": outlets[0].apiKey,
        },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setForm({ text: "", url: "", type: "GENERAL", priority: 5 });
        setShowForm(false);
        await onRefresh();
      }
    } finally {
      setSaving(false);
    }
  }

  const tickerTypes = ["GENERAL", "ELECTION_RESULT", "FLASH_POLL", "BREAKING"];

  return (
    <div className="space-y-6">
      {/* Ticker preview by format */}
      <Section title="Format Previews">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
          {(["dark", "light", "top", "bottom"] as const).map((fmt) => (
            <motion.button
              key={fmt}
              {...hoverTap}
              onClick={() => setPreviewType(previewType === fmt ? null : fmt)}
              className={cn(
                "px-3 py-2.5 rounded-lg text-sm font-medium min-h-[44px] border transition-colors",
                previewType === fmt
                  ? "border-current text-white"
                  : "border-gray-200 text-gray-600 hover:border-gray-300"
              )}
              style={
                previewType === fmt
                  ? { backgroundColor: NAVY, borderColor: NAVY }
                  : undefined
              }
            >
              {fmt.charAt(0).toUpperCase() + fmt.slice(1)} Theme
            </motion.button>
          ))}
        </div>
        <AnimatePresence>
          {previewType && (
            <motion.div {...fadeUp}>
              <TickerPreview
                items={tickerItems.filter((t) => t.isActive)}
                theme={previewType as "dark" | "light" | "top" | "bottom"}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* Create ticker item */}
      <Section
        title="Ticker Items"
        action={showForm ? "Cancel" : "Create Item"}
        onAction={() => setShowForm(!showForm)}
      >
        <AnimatePresence>
          {showForm && (
            <motion.div
              {...fadeUp}
              className="bg-gray-50 rounded-xl p-4 mb-4 space-y-3"
            >
              {outlets.length === 0 && (
                <p className="text-sm text-amber-600 bg-amber-50 rounded-lg p-3">
                  Create a media outlet first to add ticker items.
                </p>
              )}
              <textarea
                className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                placeholder="Ticker text..."
                rows={2}
                value={form.text}
                onChange={(e) =>
                  setForm((s) => ({ ...s, text: e.target.value }))
                }
              />
              <div className="grid md:grid-cols-3 gap-3">
                <input
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="URL (optional)"
                  value={form.url}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, url: e.target.value }))
                  }
                />
                <select
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  value={form.type}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, type: e.target.value }))
                  }
                >
                  {tickerTypes.map((t) => (
                    <option key={t} value={t}>
                      {t.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500 whitespace-nowrap">
                    Priority
                  </label>
                  <input
                    type="range"
                    min={1}
                    max={10}
                    value={form.priority}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        priority: Number(e.target.value),
                      }))
                    }
                    className="flex-1"
                  />
                  <span className="text-sm font-medium text-gray-700 w-6 text-right">
                    {form.priority}
                  </span>
                </div>
              </div>
              <motion.button
                {...hoverTap}
                onClick={createItem}
                disabled={saving || !form.text.trim() || outlets.length === 0}
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white min-h-[44px] disabled:opacity-50"
                style={{ backgroundColor: GREEN }}
              >
                {saving ? "Publishing..." : "Publish Item"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>

        {tickerItems.length === 0 ? (
          <EmptyState
            icon={Rss}
            title="No ticker items yet"
            action="Create First Item"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="space-y-2">
            {tickerItems.map((item) => (
              <motion.div
                key={item.id}
                layout
                className="flex items-start gap-3 p-3 border rounded-xl"
              >
                <TickerTypeBadge type={item.type} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{item.text}</p>
                  {item.url && (
                    <a
                      href={item.url}
                      className="text-xs text-blue-600 hover:underline truncate block"
                      target="_blank"
                      rel="noreferrer"
                    >
                      {item.url}
                    </a>
                  )}
                  <p className="text-xs text-gray-400 mt-1">
                    Priority {item.priority} ·{" "}
                    {new Date(item.createdAt).toLocaleString()}
                    {item.expiresAt &&
                      ` · Expires ${new Date(item.expiresAt).toLocaleDateString()}`}
                  </p>
                </div>
                <div className="flex items-center gap-1">
                  {item.isActive ? (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-green-50 text-green-700">
                      <Eye className="w-3 h-3" /> Live
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs px-2 py-1 rounded-full bg-gray-100 text-gray-500">
                      <EyeOff className="w-3 h-3" /> Off
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   RESULTS TAB
   ═══════════════════════════════════════════════════════════════════════════ */
function ResultsTab({
  outlets,
  liveResults,
  onRefresh,
}: {
  outlets: Outlet[];
  liveResults: LiveResult[];
  onRefresh: () => Promise<void>;
}) {
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    mediaOutletId: "",
    province: "Ontario",
    municipality: "",
    ward: "",
    office: "Mayor",
    candidateName: "",
    party: "",
    votes: 0,
    percentReporting: 0,
    isLeading: false,
    isCalled: false,
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{
    text: string;
    type: "success" | "error" | "warning";
  } | null>(null);

  async function submitResult() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/live-results", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          votes: Number(form.votes),
          percentReporting: Number(form.percentReporting),
          ward: form.ward || null,
          party: form.party || null,
          mediaOutletId: form.mediaOutletId || outlets[0]?.id || null,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage({
          text: data.message ?? "Result recorded",
          type: "success",
        });
        setForm((s) => ({
          ...s,
          candidateName: "",
          party: "",
          votes: 0,
          isLeading: false,
          isCalled: false,
        }));
        await onRefresh();
      } else if (res.status === 409) {
        setMessage({
          text: data.message ?? "Vote count mismatch — needs review",
          type: "warning",
        });
        await onRefresh();
      } else {
        setMessage({ text: data.error ?? "Error", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error", type: "error" });
    } finally {
      setSaving(false);
    }
  }

  // Group results by race (municipality + office + ward)
  const grouped = useMemo(() => {
    const map = new Map<string, LiveResult[]>();
    for (const r of liveResults) {
      const key = `${r.municipality}|${r.office}|${r.ward ?? ""}`;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(r);
    }
    return Array.from(map.entries()).map(([key, results]) => {
      const [municipality, office, ward] = key.split("|");
      return {
        municipality,
        office,
        ward: ward || null,
        results: results.sort((a, b) => b.votes - a.votes),
        maxVotes: Math.max(...results.map((r) => r.votes), 1),
      };
    });
  }, [liveResults]);

  return (
    <div className="space-y-6">
      {/* Double-entry info */}
      <div
        className="flex items-start gap-3 rounded-xl p-4 text-sm"
        style={{ backgroundColor: `${NAVY}08` }}
      >
        <Shield className="w-5 h-5 flex-shrink-0 mt-0.5" style={{ color: NAVY }} />
        <div>
          <p className="font-medium" style={{ color: NAVY }}>
            Double-Entry Verification
          </p>
          <p className="text-gray-600 mt-1">
            Two different users must enter the same vote count for a result to be
            verified. Mismatches are flagged for review.
          </p>
        </div>
      </div>

      {/* Entry form */}
      <Section
        title="Enter Result"
        action={showForm ? "Cancel" : "New Entry"}
        onAction={() => setShowForm(!showForm)}
      >
        <AnimatePresence>
          {showForm && (
            <motion.div
              {...fadeUp}
              className="bg-gray-50 rounded-xl p-4 space-y-3"
            >
              {message && (
                <div
                  className={cn(
                    "rounded-lg p-3 text-sm",
                    message.type === "success" &&
                      "bg-green-50 text-green-700",
                    message.type === "error" && "bg-red-50 text-red-700",
                    message.type === "warning" &&
                      "bg-amber-50 text-amber-700"
                  )}
                >
                  {message.text}
                </div>
              )}
              <div className="grid md:grid-cols-2 gap-3">
                <select
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  value={form.mediaOutletId}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, mediaOutletId: e.target.value }))
                  }
                >
                  <option value="">Select outlet...</option>
                  {outlets.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <input
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="Province"
                  value={form.province}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, province: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="Municipality"
                  value={form.municipality}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, municipality: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="Ward (optional)"
                  value={form.ward}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, ward: e.target.value }))
                  }
                />
                <select
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  value={form.office}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, office: e.target.value }))
                  }
                >
                  <option value="Mayor">Mayor</option>
                  <option value="Councillor">Councillor</option>
                  <option value="School Trustee">School Trustee</option>
                  <option value="Regional Chair">Regional Chair</option>
                </select>
                <input
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="Candidate name"
                  value={form.candidateName}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, candidateName: e.target.value }))
                  }
                />
                <input
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="Party (optional)"
                  value={form.party}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, party: e.target.value }))
                  }
                />
                <input
                  type="number"
                  className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
                  placeholder="Votes"
                  value={form.votes || ""}
                  onChange={(e) =>
                    setForm((s) => ({ ...s, votes: Number(e.target.value) }))
                  }
                />
                <div className="flex items-center gap-2">
                  <label className="text-xs text-gray-500">% Reporting</label>
                  <input
                    type="number"
                    min={0}
                    max={100}
                    className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] flex-1"
                    value={form.percentReporting || ""}
                    onChange={(e) =>
                      setForm((s) => ({
                        ...s,
                        percentReporting: Number(e.target.value),
                      }))
                    }
                  />
                </div>
                <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    checked={form.isLeading}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, isLeading: e.target.checked }))
                    }
                  />
                  Leading
                </label>
                <label className="flex items-center gap-2 min-h-[44px] text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="w-4 h-4 rounded"
                    checked={form.isCalled}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, isCalled: e.target.checked }))
                    }
                  />
                  Race Called
                </label>
              </div>
              <motion.button
                {...hoverTap}
                onClick={submitResult}
                disabled={
                  saving || !form.candidateName.trim() || !form.municipality.trim()
                }
                className="px-4 py-2.5 rounded-lg text-sm font-medium text-white min-h-[44px] disabled:opacity-50"
                style={{ backgroundColor: GREEN }}
              >
                {saving ? "Submitting..." : "Submit Entry"}
              </motion.button>
            </motion.div>
          )}
        </AnimatePresence>
      </Section>

      {/* Results table */}
      <Section title="Results by Race">
        {grouped.length === 0 ? (
          <EmptyState
            icon={Vote}
            title="No live results entered yet"
            action="Enter First Result"
            onAction={() => setShowForm(true)}
          />
        ) : (
          <div className="space-y-6">
            {grouped.map(({ municipality, office, ward, results, maxVotes }) => (
              <div
                key={`${municipality}-${office}-${ward ?? ""}`}
                className="border rounded-xl overflow-hidden"
              >
                <div
                  className="px-4 py-3 text-sm font-medium text-white"
                  style={{ backgroundColor: NAVY }}
                >
                  {municipality} — {office}
                  {ward ? ` (${ward})` : ""}
                  <span className="ml-2 opacity-70">
                    {results[0]?.percentReporting ?? 0}% reporting
                  </span>
                </div>
                <div className="divide-y">
                  {results.map((r) => (
                    <div key={r.id} className="px-4 py-3">
                      <div className="flex items-center justify-between mb-1.5">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-900">
                            {r.candidateName}
                          </span>
                          {r.party && (
                            <span className="text-xs text-gray-500">
                              ({r.party})
                            </span>
                          )}
                          {r.isLeading && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                              style={{ backgroundColor: GREEN }}
                            >
                              Leading
                            </span>
                          )}
                          {r.isCalled && (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded font-medium text-white"
                              style={{ backgroundColor: AMBER }}
                            >
                              Elected
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-gray-900">
                            {r.votes.toLocaleString()}
                          </span>
                          {r.isVerified ? (
                            <CheckCircle2
                              className="w-4 h-4"
                              style={{ color: GREEN }}
                            />
                          ) : r.entryTwoUserId ? (
                            <XCircle className="w-4 h-4" style={{ color: RED }} />
                          ) : (
                            <span
                              className="text-xs px-1.5 py-0.5 rounded-full"
                              style={{
                                backgroundColor: `${AMBER}20`,
                                color: AMBER,
                              }}
                            >
                              1 of 2
                            </span>
                          )}
                        </div>
                      </div>
                      {/* Vote bar */}
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          style={{
                            backgroundColor: r.isLeading ? GREEN : NAVY,
                          }}
                          initial={{ width: 0 }}
                          animate={{
                            width: `${(r.votes / maxVotes) * 100}%`,
                          }}
                          transition={{ duration: 0.8, ease: "easeOut" }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Section>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════
   SHARED COMPONENTS
   ═══════════════════════════════════════════════════════════════════════════ */

function Section({
  title,
  action,
  onAction,
  children,
}: {
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-white border rounded-xl p-4 md:p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-900">{title}</h2>
        {action && onAction && (
          <motion.button
            {...hoverTap}
            onClick={onAction}
            className="text-xs font-medium px-3 py-1.5 rounded-lg min-h-[44px] flex items-center"
            style={{ color: GREEN }}
          >
            {action}
          </motion.button>
        )}
      </div>
      {children}
    </section>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
}) {
  return (
    <motion.div
      {...hoverTap}
      className="bg-white border rounded-xl p-4"
    >
      <div className="flex items-center gap-2 mb-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
      <p className="text-xs text-gray-500 mt-0.5">{label}</p>
    </motion.div>
  );
}

function PlanBadge({ plan }: { plan: string }) {
  const config: Record<string, { bg: string; text: string; label: string }> = {
    COMMUNITY: { bg: `${NAVY}10`, text: NAVY, label: "Community" },
    STANDARD: { bg: `${GREEN}15`, text: GREEN, label: "Standard" },
    PREMIUM: { bg: `${AMBER}15`, text: AMBER, label: "Premium" },
  };
  const c = config[plan] ?? config.COMMUNITY;
  return (
    <span
      className="text-xs font-medium px-2 py-0.5 rounded-full"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      {c.label}
    </span>
  );
}

function StatusBadge({ active }: { active: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full",
        active ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-500"
      )}
    >
      <span
        className={cn(
          "w-1.5 h-1.5 rounded-full",
          active ? "bg-green-500" : "bg-gray-400"
        )}
      />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function TickerTypeBadge({ type }: { type: string }) {
  const config: Record<string, { icon: React.ElementType; color: string }> = {
    GENERAL: { icon: Newspaper, color: NAVY },
    ELECTION_RESULT: { icon: Vote, color: GREEN },
    FLASH_POLL: { icon: Zap, color: AMBER },
    BREAKING: { icon: Radio, color: RED },
  };
  const c = config[type] ?? config.GENERAL;
  return (
    <div
      className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
      style={{ backgroundColor: `${c.color}15` }}
    >
      <c.icon className="w-4 h-4" style={{ color: c.color }} />
    </div>
  );
}

function TickerPreview({
  items,
  theme = "dark",
}: {
  items: TickerItem[];
  theme?: "dark" | "light" | "top" | "bottom";
}) {
  const isDark = theme === "dark" || theme === "bottom";
  const text = items.map((i) => i.text).join("  ·  ");

  return (
    <div
      className={cn(
        "rounded-lg overflow-hidden py-2.5 px-4",
        isDark ? "text-white" : "text-gray-900"
      )}
      style={{ backgroundColor: isDark ? NAVY : "#f1f5f9" }}
    >
      <div className="overflow-hidden whitespace-nowrap">
        <motion.div
          className="inline-block text-sm font-medium"
          animate={{ x: ["0%", "-50%"] }}
          transition={{
            repeat: Infinity,
            duration: Math.max(items.length * 4, 10),
            ease: "linear",
          }}
        >
          {text}{"  ·  "}{text}
        </motion.div>
      </div>
    </div>
  );
}

function EmbedCodeRow({ label, code }: { label: string; code: string }) {
  const [copied, setCopied] = useState(false);

  function copy() {
    navigator.clipboard.writeText(code).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  const friendlyLabel = label
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (s) => s.toUpperCase())
    .trim();

  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-gray-700 mb-1">
          {friendlyLabel}
        </p>
        <code className="block text-xs bg-white border rounded-lg px-3 py-2 text-gray-600 truncate">
          {code}
        </code>
      </div>
      <motion.button
        {...hoverTap}
        onClick={copy}
        className="p-2 rounded-lg hover:bg-white min-h-[44px] min-w-[44px] flex items-center justify-center"
        title="Copy"
      >
        {copied ? (
          <Check className="w-4 h-4" style={{ color: GREEN }} />
        ) : (
          <ClipboardCopy className="w-4 h-4 text-gray-400" />
        )}
      </motion.button>
    </div>
  );
}

function FlashPollComposer() {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [published, setPublished] = useState(false);
  const [votes, setVotes] = useState<number[]>([]);

  function addOption() {
    if (options.length < 5) setOptions([...options, ""]);
  }

  function updateOption(idx: number, val: string) {
    setOptions((prev) => prev.map((o, i) => (i === idx ? val : o)));
  }

  function publish() {
    if (!question.trim() || options.filter((o) => o.trim()).length < 2) return;
    // Simulate flash poll with random votes
    setVotes(
      options.map(() => Math.floor(Math.random() * 200) + 10)
    );
    setPublished(true);
  }

  function reset() {
    setQuestion("");
    setOptions(["", ""]);
    setPublished(false);
    setVotes([]);
  }

  const totalVotes = votes.reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-3">
      {!published ? (
        <>
          <input
            className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
            placeholder="What is your poll question?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
          />
          {options.map((opt, i) => (
            <input
              key={i}
              className="border rounded-lg px-3 py-2.5 text-sm min-h-[44px] w-full"
              placeholder={`Option ${i + 1}`}
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
            />
          ))}
          <div className="flex gap-2">
            {options.length < 5 && (
              <motion.button
                {...hoverTap}
                onClick={addOption}
                className="px-3 py-2 rounded-lg text-sm text-gray-600 border min-h-[44px]"
              >
                <Plus className="w-4 h-4 inline mr-1" />
                Add Option
              </motion.button>
            )}
            <motion.button
              {...hoverTap}
              onClick={publish}
              disabled={
                !question.trim() || options.filter((o) => o.trim()).length < 2
              }
              className="px-4 py-2 rounded-lg text-sm font-medium text-white min-h-[44px] disabled:opacity-50"
              style={{ backgroundColor: AMBER }}
            >
              <Zap className="w-4 h-4 inline mr-1" />
              Publish Flash Poll
            </motion.button>
          </div>
        </>
      ) : (
        <>
          <p className="text-sm font-medium text-gray-900">{question}</p>
          <div className="space-y-2">
            {options
              .filter((o) => o.trim())
              .map((opt, i) => {
                const pct =
                  totalVotes > 0
                    ? Math.round((votes[i] / totalVotes) * 100)
                    : 0;
                return (
                  <div key={i}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="text-gray-700">{opt}</span>
                      <span className="font-medium text-gray-900">
                        {pct}% ({votes[i]})
                      </span>
                    </div>
                    <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                      <motion.div
                        className="h-full rounded-full"
                        style={{
                          backgroundColor: i === 0 ? GREEN : i === 1 ? NAVY : AMBER,
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.8, ease: "easeOut" }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
          <p className="text-xs text-gray-500">
            {totalVotes.toLocaleString()} total votes
          </p>
          <motion.button
            {...hoverTap}
            onClick={reset}
            className="px-3 py-2 rounded-lg text-sm text-gray-600 border min-h-[44px]"
          >
            New Poll
          </motion.button>
        </>
      )}
    </div>
  );
}
