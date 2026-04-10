"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  Briefcase, Boxes, Package, LayoutTemplate, Store, MapPin, Users,
  CalendarDays, PhoneCall, Receipt, ChevronRight, AlertTriangle,
  Loader2, Plus, RefreshCw, Flag, DoorOpen, FileText, CreditCard,
  Mail, Sticker, Circle, Shirt, ShoppingBag, Square, Tag,
  TrendingUp, Clock, Truck, CheckCircle2, Gavel, Megaphone,
  RectangleHorizontal, Paintbrush,
} from "lucide-react";
import { Badge } from "@/components/ui";

// ─── Types ────────────────────────────────────────────────────────────────────

interface DashboardData {
  orders: { draft: number };
  jobs: {
    posted: number;
    bidding: number;
    awarded: number;
    in_production: number;
    quality_check: number;
    shipped: number;
    total: number;
  };
  inventory: { totalItems: number; totalAvailable: number; lowStock: number };
  recentJobs: Array<{
    id: string;
    title: string;
    productType: string;
    quantity: number;
    status: string;
    createdAt: string;
    updatedAt: string;
    _count: { bids: number };
  }>;
  recentOrders: Array<{
    id: string;
    productType: string;
    quantity: number;
    totalPriceCad: number | null;
    createdAt: string;
    template: { name: string; slug: string } | null;
  }>;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const OPERATIONAL_LINKS: {
  label: string;
  description: string;
  href: string;
  Icon: React.ElementType;
}[] = [
  {
    label: "Walk List",
    description: "Contacts organised by street for door-to-door canvassing",
    href: "/canvassing/print-walk-list",
    Icon: MapPin,
  },
  {
    label: "Volunteer Schedule",
    description: "Weekly volunteer shift schedule for your team",
    href: "/volunteers?view=schedule&print=1",
    Icon: Users,
  },
  {
    label: "Event Sign-in Sheet",
    description: "Attendance sheet for campaign events",
    href: "/events?print=1",
    Icon: CalendarDays,
  },
  {
    label: "Call List",
    description: "Phone banking contact list formatted for callers",
    href: "/contacts?format=call&print=1",
    Icon: PhoneCall,
  },
  {
    label: "Expense Report",
    description: "Campaign expense summary for compliance filing",
    href: "/budget?print=1",
    Icon: Receipt,
  },
];

const STAGE_CONFIG: Array<{
  key: keyof DashboardData["jobs"];
  label: string;
  Icon: React.ElementType;
  colour: string;
  bg: string;
  border: string;
  href: string;
}> = [
  {
    key: "posted",
    label: "Posted",
    Icon: Megaphone,
    colour: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    href: "/print/jobs?status=posted",
  },
  {
    key: "bidding",
    label: "Bidding",
    Icon: Gavel,
    colour: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    href: "/print/jobs?status=bidding",
  },
  {
    key: "awarded",
    label: "Awarded",
    Icon: CheckCircle2,
    colour: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    href: "/print/jobs?status=awarded",
  },
  {
    key: "in_production",
    label: "In Production",
    Icon: TrendingUp,
    colour: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    href: "/print/jobs?status=in_production",
  },
  {
    key: "quality_check",
    label: "QC",
    Icon: Flag,
    colour: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    href: "/print/jobs?status=quality_check",
  },
  {
    key: "shipped",
    label: "Shipped",
    Icon: Truck,
    colour: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    href: "/print/jobs?status=shipped",
  },
];

const JOB_STATUS_BADGE: Record<string, { label: string; variant: "default" | "success" | "warning" | "danger" | "info" }> = {
  draft: { label: "Draft", variant: "default" },
  posted: { label: "Posted", variant: "info" },
  bidding: { label: "Bidding", variant: "warning" },
  awarded: { label: "Awarded", variant: "success" },
  in_production: { label: "In Production", variant: "info" },
  quality_check: { label: "QC", variant: "warning" },
  shipped: { label: "Shipped", variant: "success" },
  delivered: { label: "Delivered", variant: "success" },
};

const PRODUCT_ICONS: Record<string, React.ElementType> = {
  lawn_sign: Flag,
  yard_stake: Flag,
  door_hanger: DoorOpen,
  flyer: FileText,
  palm_card: CreditCard,
  mailer_postcard: Mail,
  button_pin: Circle,
  bumper_sticker: Sticker,
  t_shirt: Shirt,
  tote_bag: ShoppingBag,
  banner: RectangleHorizontal,
  window_sign: Square,
  hat: Tag,
};

function productLabel(type: string): string {
  return type.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
  campaignId: string;
}

// ─── Stat tile ────────────────────────────────────────────────────────────────

function PipelineTile({
  cfg,
  count,
  idx,
}: {
  cfg: (typeof STAGE_CONFIG)[number];
  count: number;
  idx: number;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, duration: 0.25 }}
    >
      <Link href={cfg.href}>
        <div
          className={`rounded-xl border ${cfg.border} ${cfg.bg} p-3 md:p-4 hover:shadow-md transition-shadow cursor-pointer h-full`}
        >
          <div className="flex items-center justify-between mb-2">
            <cfg.Icon className={`w-4 h-4 ${cfg.colour}`} />
            {count > 0 && (
              <span className={`text-[10px] font-bold ${cfg.colour} uppercase tracking-wide`}>
                Active
              </span>
            )}
          </div>
          <p className={`text-2xl font-extrabold tabular-nums ${cfg.colour}`}>{count}</p>
          <p className={`text-xs font-semibold mt-0.5 ${cfg.colour} opacity-80`}>{cfg.label}</p>
        </div>
      </Link>
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function PrintClient({ campaignId }: Props) {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      else setRefreshing(true);
      try {
        const res = await fetch(`/api/print/dashboard?campaignId=${campaignId}`);
        if (res.ok) setData(await res.json() as DashboardData);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [campaignId]
  );

  useEffect(() => { fetchDashboard(); }, [fetchDashboard]);

  const jobsTotal = data?.jobs.total ?? 0;
  const draftCount = data?.orders.draft ?? 0;
  const lowStock = data?.inventory.lowStock ?? 0;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 md:py-10 pb-[env(safe-area-inset-bottom)]">

      {/* ── Hero ───────────────────────────────────────────────────────────── */}
      <header
        className="rounded-2xl p-6 md:p-8 text-white mb-6 relative overflow-hidden"
        style={{ background: "linear-gradient(135deg, #0A2342 0%, #1D9E75 100%)" }}
      >
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-widest opacity-75 font-semibold">Poll City Print</p>
            <h1 className="text-2xl md:text-3xl font-extrabold mt-0.5">Print Command Centre</h1>
            <p className="text-emerald-100 mt-1.5 text-sm max-w-lg">
              Design, post, and manage all your campaign print jobs — local shops compete for your business.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 sm:flex-col sm:items-end">
            <Link href="/print/templates">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <button className="h-10 px-4 bg-white text-[#0A2342] hover:bg-emerald-50 font-bold rounded-lg flex items-center gap-2 text-sm transition-colors">
                  <Paintbrush className="w-4 h-4" />
                  New Design
                </button>
              </motion.div>
            </Link>
            <Link href="/print/jobs/new">
              <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                <button className="h-10 px-4 border border-white/30 text-white hover:bg-white/10 font-semibold rounded-lg flex items-center gap-2 text-sm transition-colors">
                  <Plus className="w-4 h-4" />
                  Post Job
                </button>
              </motion.div>
            </Link>
          </div>
        </div>

        {/* Summary badges */}
        {!loading && data && (
          <div className="flex flex-wrap gap-2 mt-4">
            {draftCount > 0 && (
              <Link href="/print/jobs?status=draft">
                <span className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-1 rounded-full cursor-pointer">
                  <Clock className="w-3 h-3" />
                  {draftCount} draft{draftCount !== 1 ? "s" : ""}
                </span>
              </Link>
            )}
            {jobsTotal > 0 && (
              <Link href="/print/jobs">
                <span className="inline-flex items-center gap-1.5 bg-white/15 hover:bg-white/25 transition-colors text-white text-xs font-semibold px-3 py-1 rounded-full cursor-pointer">
                  <Briefcase className="w-3 h-3" />
                  {jobsTotal} active job{jobsTotal !== 1 ? "s" : ""}
                </span>
              </Link>
            )}
            {lowStock > 0 && (
              <Link href="/print/inventory">
                <span className="inline-flex items-center gap-1.5 bg-red-400/80 hover:bg-red-400 transition-colors text-white text-xs font-semibold px-3 py-1 rounded-full cursor-pointer">
                  <AlertTriangle className="w-3 h-3" />
                  {lowStock} low stock
                </span>
              </Link>
            )}
          </div>
        )}
      </header>

      {/* ── Low stock alert ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {!loading && lowStock > 0 && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-5"
          >
            <Link href="/print/inventory">
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 flex items-center gap-3 hover:bg-red-100 transition-colors cursor-pointer">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-red-900">
                    {lowStock} inventory item{lowStock !== 1 ? "s" : ""} below reorder threshold
                  </p>
                  <p className="text-xs text-red-600">Review and reorder before you run out on the campaign trail.</p>
                </div>
                <ChevronRight className="w-4 h-4 text-red-400 flex-shrink-0" />
              </div>
            </Link>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Pipeline stages ─────────────────────────────────────────────────── */}
      <section className="mb-8">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-[#0A2342]">Job Pipeline</h2>
          <button
            onClick={() => fetchDashboard(true)}
            disabled={refreshing}
            className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-700 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>

        {loading ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-gray-200 bg-gray-50 p-3 md:p-4 animate-pulse h-20" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 md:gap-3">
            {STAGE_CONFIG.map((cfg, idx) => (
              <PipelineTile
                key={cfg.key}
                cfg={cfg}
                count={data?.jobs[cfg.key] ?? 0}
                idx={idx}
              />
            ))}
          </div>
        )}
      </section>

      {/* ── Recent Activity ─────────────────────────────────────────────────── */}
      <section className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-8">

        {/* Recent jobs */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-[#0A2342]">Recent Jobs</h3>
            <Link href="/print/jobs" className="text-xs text-[#1D9E75] hover:underline font-semibold">
              View all
            </Link>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : !data?.recentJobs.length ? (
            <div className="p-8 text-center">
              <Briefcase className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">No jobs yet</p>
              <p className="text-xs text-gray-400 mt-1">Post your first print job to get quotes from local shops.</p>
              <Link href="/print/jobs/new">
                <button className="mt-3 h-9 px-4 rounded-lg bg-[#0A2342] text-white text-xs font-bold hover:bg-[#0d2d57] transition-colors">
                  Post a Job
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recentJobs.map((job) => {
                const Icon = PRODUCT_ICONS[job.productType] ?? FileText;
                const badge = JOB_STATUS_BADGE[job.status] ?? { label: job.status, variant: "default" as const };
                return (
                  <Link key={job.id} href={`/print/jobs/${job.id}`}>
                    <motion.div
                      whileHover={{ backgroundColor: "#f9fafb" }}
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-[#0A2342]/8 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-[#0A2342]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A2342] truncate">{job.title}</p>
                        <p className="text-xs text-gray-500">
                          {job.quantity.toLocaleString()} × {productLabel(job.productType)}
                          {job._count.bids > 0 && ` · ${job._count.bids} bid${job._count.bids !== 1 ? "s" : ""}`}
                        </p>
                      </div>
                      <Badge variant={badge.variant as "default" | "success" | "warning" | "danger" | "info"} className="flex-shrink-0 text-[10px]">
                        {badge.label}
                      </Badge>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>

        {/* Recent draft orders */}
        <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100">
            <h3 className="text-sm font-bold text-[#0A2342]">Draft Designs</h3>
            <Link href="/print/templates" className="text-xs text-[#1D9E75] hover:underline font-semibold">
              Browse templates
            </Link>
          </div>

          {loading ? (
            <div className="p-4 space-y-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="h-12 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : !data?.recentOrders.length ? (
            <div className="p-8 text-center">
              <LayoutTemplate className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500 font-medium">No drafts saved</p>
              <p className="text-xs text-gray-400 mt-1">Start from a template and customise your design.</p>
              <Link href="/print/templates">
                <button className="mt-3 h-9 px-4 rounded-lg bg-[#1D9E75] text-white text-xs font-bold hover:bg-[#178a65] transition-colors">
                  Open Template Library
                </button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {data.recentOrders.map((order) => {
                const Icon = PRODUCT_ICONS[order.productType] ?? FileText;
                return (
                  <Link
                    key={order.id}
                    href={
                      order.template
                        ? `/print/design/${order.template.slug}`
                        : "/print/templates"
                    }
                  >
                    <motion.div
                      whileHover={{ backgroundColor: "#f9fafb" }}
                      className="flex items-center gap-3 px-5 py-3 cursor-pointer transition-colors"
                    >
                      <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center flex-shrink-0">
                        <Icon className="w-4 h-4 text-purple-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-[#0A2342] truncate">
                          {order.template?.name ?? productLabel(order.productType)}
                        </p>
                        <p className="text-xs text-gray-500">
                          {order.quantity.toLocaleString()} units
                          {order.totalPriceCad != null &&
                            ` · $${order.totalPriceCad.toFixed(2)} est.`}
                        </p>
                      </div>
                      <span className="text-[10px] font-semibold text-purple-600 bg-purple-50 border border-purple-200 px-2 py-0.5 rounded-full flex-shrink-0">
                        Draft
                      </span>
                    </motion.div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* ── Quick links ─────────────────────────────────────────────────────── */}
      <section className="grid gap-3 grid-cols-2 sm:grid-cols-4 lg:grid-cols-5 mb-8">
        <Link href="/print/inventory">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border-2 border-[#1D9E75]/40 bg-emerald-50 p-4 hover:shadow-md transition-shadow"
          >
            <Boxes className="w-6 h-6 text-[#1D9E75] mb-2" />
            <h3 className="font-bold text-[#0A2342] text-sm">Inventory</h3>
            {!loading && data && (
              <p className="text-xs text-gray-500 mt-0.5">
                {data.inventory.totalItems} items
                {data.inventory.lowStock > 0 && (
                  <span className="text-red-500 ml-1 font-semibold">· {data.inventory.lowStock} low</span>
                )}
              </p>
            )}
          </motion.div>
        </Link>
        <Link href="/print/packs">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border-2 border-[#0A2342]/20 bg-[#0A2342]/5 p-4 hover:shadow-md transition-shadow"
          >
            <Package className="w-6 h-6 text-[#0A2342] mb-2" />
            <h3 className="font-bold text-[#0A2342] text-sm">Print Packs</h3>
            <p className="text-xs text-gray-500 mt-0.5">Walk &amp; sign kits</p>
          </motion.div>
        </Link>
        <Link href="/print/jobs">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
          >
            <Briefcase className="w-6 h-6 text-[#0A2342] mb-2" />
            <h3 className="font-bold text-[#0A2342] text-sm">Print Jobs</h3>
            <p className="text-xs text-gray-500 mt-0.5">Post, bid, award</p>
          </motion.div>
        </Link>
        <Link href="/print/shops">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
          >
            <Store className="w-6 h-6 text-[#1D9E75] mb-2" />
            <h3 className="font-bold text-[#0A2342] text-sm">Shop Directory</h3>
            <p className="text-xs text-gray-500 mt-0.5">Browse local shops</p>
          </motion.div>
        </Link>
        <Link href="/print/templates">
          <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="rounded-xl border border-gray-200 bg-white p-4 hover:shadow-md transition-shadow"
          >
            <LayoutTemplate className="w-6 h-6 text-purple-600 mb-2" />
            <h3 className="font-bold text-[#0A2342] text-sm">Templates</h3>
            <p className="text-xs text-gray-500 mt-0.5">Auto-branded designs</p>
          </motion.div>
        </Link>
      </section>

      {/* ── Campaign Operations ─────────────────────────────────────────────── */}
      <section className="mb-6">
        <h2 className="text-base font-bold text-[#0A2342] mb-1">Campaign Operations</h2>
        <p className="text-xs text-gray-500 mb-3">Print directly from your campaign data — no shop order needed.</p>
        <div className="rounded-xl border border-gray-200 bg-white divide-y divide-gray-100 overflow-hidden">
          {OPERATIONAL_LINKS.map(({ label, description, href, Icon }) => (
            <Link key={href} href={href}>
              <motion.div
                whileHover={{ backgroundColor: "#f9fafb" }}
                className="flex items-center gap-4 px-5 py-3.5 cursor-pointer transition-colors"
              >
                <div className="w-9 h-9 rounded-lg bg-[#0A2342]/8 flex items-center justify-center flex-shrink-0">
                  <Icon className="w-4 h-4 text-[#0A2342]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-[#0A2342]">{label}</p>
                  <p className="text-xs text-gray-500">{description}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0" />
              </motion.div>
            </Link>
          ))}
        </div>
      </section>

      {/* Hidden campaignId for React key purposes */}
      <div className="hidden">{campaignId}</div>
    </div>
  );
}
