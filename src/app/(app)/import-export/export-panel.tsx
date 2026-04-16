"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Download, Users, MapPin, ClipboardList, Package, Heart,
  HandHelping, MessageSquare, DollarSign, History, SlidersHorizontal,
  CheckCircle2, X, Filter,
} from "lucide-react";
import { Card, CardHeader, CardContent, EmptyState } from "@/components/ui";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

/* ── Constants ────────────────────────────────────────────────── */

const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const spring = { type: "spring" as const, stiffness: 400, damping: 25 };

/* ── Types ────────────────────────────────────────────────────── */

interface Props { campaignId: string; }

type ExportType = "contacts" | "walklist" | "gotv" | "signs" | "volunteers" | "donations";

interface ExportFilters {
  ward: string;
  poll: string;
  postalCode: string;
  street: string;
  supportLevel: string[];
  hasPhone: boolean | null;
  hasEmail: boolean | null;
}

interface ExportHistoryItem {
  id: string;
  exportType: string;
  format: string;
  recordCount: number;
  filters: Record<string, unknown> | null;
  createdAt: string;
}

/* ── Static quick-export types ────────────────────────────────── */

const QUICK_EXPORTS = [
  { endpoint: "/api/export/contacts",     label: "All Contacts",       description: "Every contact with full details",              icon: <Users        className="w-4 h-4" /> },
  { endpoint: "/api/export/gotv",         label: "GOTV Priority",      description: "Supporters for election day outreach",         icon: <ClipboardList className="w-4 h-4" /> },
  { endpoint: "/api/export/walklist",     label: "Walk List",          description: "Canvassing order by street",                   icon: <MapPin       className="w-4 h-4" /> },
  { endpoint: "/api/export/signs",        label: "Signs",              description: "All sign requests and installs",               icon: <Package      className="w-4 h-4" /> },
  { endpoint: "/api/export/donations",    label: "Donations",          description: "Ontario-compliant donor report",               icon: <Heart        className="w-4 h-4" /> },
  { endpoint: "/api/export/volunteers",   label: "Volunteers",         description: "Volunteers with skills and availability",      icon: <HandHelping  className="w-4 h-4" /> },
  { endpoint: "/api/export/interactions", label: "Interaction Log",    description: "Every door knock, call, email, note",          icon: <MessageSquare className="w-4 h-4" /> },
  { endpoint: "/api/export/budget",       label: "Budget",             description: "Full budget with actuals and variances",       icon: <DollarSign   className="w-4 h-4" /> },
];

const EXPORT_TYPE_CONFIG: Record<ExportType, {
  label: string; icon: React.ReactNode; description: string;
  showSupportLevel: boolean; showStreet: boolean; showContact: boolean;
  defaultFields: string[];
}> = {
  contacts: {
    label: "All Contacts", icon: <Users className="w-4 h-4" />,
    description: "Full contact database with all fields",
    showSupportLevel: true, showStreet: true, showContact: true,
    defaultFields: ["firstName","lastName","email","phone","address1","city","province","postalCode","ward","riding","municipalPoll","supportLevel","issues","doNotContact","notes","lastContactedAt"],
  },
  walklist: {
    label: "Walk List", icon: <MapPin className="w-4 h-4" />,
    description: "Door-knocking order by street and house number",
    showSupportLevel: true, showStreet: true, showContact: true,
    defaultFields: ["firstName","lastName","address1","city","postalCode","phone","supportLevel","notes","ward","municipalPoll"],
  },
  gotv: {
    label: "GOTV Priority", icon: <ClipboardList className="w-4 h-4" />,
    description: "Strong and leaning supporters for E-Day outreach",
    showSupportLevel: false, showStreet: true, showContact: true,
    defaultFields: ["firstName","lastName","phone","address1","ward","municipalPoll","voted","votedAt"],
  },
  signs: {
    label: "Signs", icon: <Package className="w-4 h-4" />,
    description: "Sign placements filtered by ward or street",
    showSupportLevel: false, showStreet: true, showContact: false,
    defaultFields: [],
  },
  volunteers: {
    label: "Volunteers", icon: <HandHelping className="w-4 h-4" />,
    description: "Active volunteers with skills and availability",
    showSupportLevel: false, showStreet: false, showContact: false,
    defaultFields: [],
  },
  donations: {
    label: "Donations", icon: <Heart className="w-4 h-4" />,
    description: "Donation records filtered by date or amount",
    showSupportLevel: false, showStreet: false, showContact: false,
    defaultFields: [],
  },
};

const SUPPORT_LEVELS: { value: string; label: string; colour: string }[] = [
  { value: "strong_support",    label: "Strong Support",    colour: "#1D9E75" },
  { value: "leaning_support",   label: "Leaning Support",   colour: "#5bb891" },
  { value: "undecided",         label: "Undecided",         colour: "#EF9F27" },
  { value: "leaning_opposition",label: "Leaning Opposition",colour: "#e07560" },
  { value: "strong_opposition", label: "Strong Opposition", colour: "#E24B4A" },
  { value: "unknown",           label: "Unknown",           colour: "#9ca3af" },
];

const EMPTY_FILTERS: ExportFilters = {
  ward: "", poll: "", postalCode: "", street: "",
  supportLevel: [], hasPhone: null, hasEmail: null,
};

function hasActiveFilters(f: ExportFilters): boolean {
  return !!(f.ward || f.poll || f.postalCode || f.street ||
    f.supportLevel.length > 0 || f.hasPhone !== null || f.hasEmail !== null);
}

/* ── Component ────────────────────────────────────────────────── */

export default function ExportPanel({ campaignId }: Props) {
  const [exportType, setExportType]     = useState<ExportType>("contacts");
  const [filters, setFilters]           = useState<ExportFilters>(EMPTY_FILTERS);
  const [previewCount, setPreviewCount] = useState<number | null>(null);
  const [previewing, setPreviewing]     = useState(false);
  const [downloading, setDownloading]   = useState(false);
  const [quickExporting, setQuickExporting] = useState<Record<string, boolean>>({});
  const [bulkExporting, setBulkExporting]   = useState(false);
  const [showQuick, setShowQuick]           = useState(false);
  const [history, setHistory]               = useState<ExportHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load export history on mount
  useEffect(() => { void loadHistory(); }, [campaignId]);

  // Debounced preview count whenever type or filters change
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    setPreviewCount(null);
    debounceRef.current = setTimeout(() => { void fetchPreviewCount(); }, 450);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [exportType, filters]);

  async function loadHistory() {
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/export/history?campaignId=${campaignId}`);
      if (!res.ok) return;
      const json = await res.json();
      setHistory(Array.isArray(json?.data) ? json.data : []);
    } catch { /* non-blocking */ }
    finally { setHistoryLoading(false); }
  }

  async function fetchPreviewCount() {
    setPreviewing(true);
    try {
      const res = await fetch("/api/export/targeted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: exportType, filters: buildApiFilters(), fields: [], format: "csv", countOnly: true }),
      });
      if (!res.ok) return;
      const json = await res.json();
      if (typeof json?.count === "number") setPreviewCount(json.count);
    } catch { /* non-blocking */ }
    finally { setPreviewing(false); }
  }

  function buildApiFilters() {
    const f: Record<string, unknown> = {};
    if (filters.ward)         f.ward        = filters.ward;
    if (filters.poll)         f.poll        = filters.poll;
    if (filters.postalCode)   f.postalCode  = filters.postalCode;
    if (filters.street)       f.street      = filters.street;
    if (filters.supportLevel.length > 0) f.supportLevel = filters.supportLevel;
    if (filters.hasPhone  !== null) f.hasPhone  = filters.hasPhone;
    if (filters.hasEmail  !== null) f.hasEmail  = filters.hasEmail;
    return f;
  }

  async function downloadFiltered() {
    setDownloading(true);
    try {
      const res = await fetch("/api/export/targeted", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: exportType,
          filters: buildApiFilters(),
          fields: EXPORT_TYPE_CONFIG[exportType].defaultFields,
          format: "csv",
          countOnly: false,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error ?? "Export failed");
      }
      const blob = await res.blob();
      const cd   = res.headers.get("Content-Disposition") ?? "";
      const name = cd.match(/filename="([^"]+)"/)?.[1]
        ?? `${exportType}-${new Date().toISOString().slice(0, 10)}.csv`;
      const url = URL.createObjectURL(blob);
      const a   = document.createElement("a"); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${previewCount !== null ? previewCount.toLocaleString() + " " : ""}${EXPORT_TYPE_CONFIG[exportType].label} records`);
      void loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setDownloading(false);
    }
  }

  async function doQuickExport(endpoint: string, label: string) {
    setQuickExporting(prev => ({ ...prev, [endpoint]: true }));
    try {
      const res = await fetch(`${endpoint}?campaignId=${campaignId}`);
      if (!res.ok) { const j = await res.json().catch(() => ({})); throw new Error(j?.error ?? "Export failed"); }
      const blob = await res.blob();
      const cd   = res.headers.get("Content-Disposition") ?? "";
      const name = cd.match(/filename="([^"]+)"/)?.[1] ?? `${label.toLowerCase().replace(/\s+/g, "-")}-${Date.now()}.csv`;
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a"); a.href = url; a.download = name; a.click();
      URL.revokeObjectURL(url);
      toast.success(`${label} downloaded`);
      void loadHistory();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : `Failed to export ${label}`);
    } finally {
      setQuickExporting(prev => ({ ...prev, [endpoint]: false }));
    }
  }

  async function exportOpsPack() {
    setBulkExporting(true);
    for (const ex of QUICK_EXPORTS) await doQuickExport(ex.endpoint, ex.label);
    setBulkExporting(false);
    toast.success("Full operations pack downloaded");
  }

  function toggleSupportLevel(val: string) {
    setFilters(prev => ({
      ...prev,
      supportLevel: prev.supportLevel.includes(val)
        ? prev.supportLevel.filter(v => v !== val)
        : [...prev.supportLevel, val],
    }));
  }

  const cfg = EXPORT_TYPE_CONFIG[exportType];
  const activeFilterCount = [
    filters.ward, filters.poll, filters.postalCode, filters.street,
    ...filters.supportLevel,
    filters.hasPhone !== null ? "phone" : "",
    filters.hasEmail !== null ? "email" : "",
  ].filter(Boolean).length;

  /* ── Render ─────────────────────────────────────────────────── */

  return (
    <div className="space-y-5">

      {/* ── Filtered Export ─────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader className="border-b-2 border-[#1D9E75]">
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div>
              <h3 className="font-semibold flex items-center gap-2" style={{ color: NAVY }}>
                <SlidersHorizontal className="w-4 h-4" style={{ color: GREEN }} />
                Custom Filtered Export
              </h3>
              <p className="text-xs text-gray-500 mt-0.5">
                Pick a data type, apply filters, download exactly what you need.
              </p>
            </div>
            {previewCount !== null && (
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-bold text-white"
                style={{ backgroundColor: previewCount === 0 ? AMBER : NAVY }}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {previewCount.toLocaleString()} {previewCount === 1 ? "record" : "records"}
              </motion.div>
            )}
            {previewing && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gray-100 text-xs text-gray-500">
                <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" />
                counting…
              </div>
            )}
          </div>
        </CardHeader>
        <CardContent className="pt-5 space-y-5">

          {/* Export type tabs */}
          <div className="flex flex-wrap gap-2">
            {(Object.keys(EXPORT_TYPE_CONFIG) as ExportType[]).map(type => {
              const c = EXPORT_TYPE_CONFIG[type];
              const active = exportType === type;
              return (
                <motion.button
                  key={type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.97 }}
                  transition={spring}
                  onClick={() => { setExportType(type); setFilters(EMPTY_FILTERS); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium border transition-colors min-h-[40px]",
                    active
                      ? "text-white border-transparent"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                  style={active ? { backgroundColor: NAVY, borderColor: NAVY } : undefined}
                >
                  {c.icon}
                  {c.label}
                </motion.button>
              );
            })}
          </div>

          {/* Filter panel */}
          <div className="rounded-xl border border-gray-200 bg-gray-50/50 p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-gray-400 flex items-center gap-1.5">
                <Filter className="w-3 h-3" /> Filters
                {activeFilterCount > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 rounded-full text-white text-[10px]" style={{ backgroundColor: GREEN }}>
                    {activeFilterCount}
                  </span>
                )}
              </p>
              {hasActiveFilters(filters) && (
                <button
                  onClick={() => setFilters(EMPTY_FILTERS)}
                  className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1 transition-colors"
                >
                  <X className="w-3 h-3" /> Clear all
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Ward</label>
                <input
                  type="text"
                  value={filters.ward}
                  onChange={e => setFilters(prev => ({ ...prev, ward: e.target.value }))}
                  placeholder="e.g. Ward 5"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[40px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Poll #</label>
                <input
                  type="text"
                  value={filters.poll}
                  onChange={e => setFilters(prev => ({ ...prev, poll: e.target.value }))}
                  placeholder="e.g. 042"
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[40px]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Postal prefix</label>
                <input
                  type="text"
                  value={filters.postalCode}
                  onChange={e => setFilters(prev => ({ ...prev, postalCode: e.target.value.toUpperCase() }))}
                  placeholder="e.g. M4C"
                  maxLength={3}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[40px]"
                />
              </div>
              {cfg.showStreet && (
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Street</label>
                  <input
                    type="text"
                    value={filters.street}
                    onChange={e => setFilters(prev => ({ ...prev, street: e.target.value }))}
                    placeholder="e.g. Danforth"
                    className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-800 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-400 min-h-[40px]"
                  />
                </div>
              )}
            </div>

            {cfg.showSupportLevel && (
              <div className="space-y-2">
                <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Support Level</p>
                <div className="flex flex-wrap gap-2">
                  {SUPPORT_LEVELS.map(sl => {
                    const active = filters.supportLevel.includes(sl.value);
                    return (
                      <motion.button
                        key={sl.value}
                        whileHover={{ scale: 1.03 }}
                        whileTap={{ scale: 0.97 }}
                        transition={spring}
                        onClick={() => toggleSupportLevel(sl.value)}
                        className={cn(
                          "px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[32px]",
                          active ? "text-white border-transparent" : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                        )}
                        style={active ? { backgroundColor: sl.colour, borderColor: sl.colour } : undefined}
                      >
                        {sl.label}
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            )}

            {cfg.showContact && (
              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    hasPhone: prev.hasPhone === true ? null : true,
                  }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[32px]",
                    filters.hasPhone === true
                      ? "text-white border-transparent"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                  style={filters.hasPhone === true ? { backgroundColor: NAVY } : undefined}
                >
                  Has Phone
                </button>
                <button
                  onClick={() => setFilters(prev => ({
                    ...prev,
                    hasEmail: prev.hasEmail === true ? null : true,
                  }))}
                  className={cn(
                    "px-3 py-1.5 rounded-full text-xs font-medium border transition-all min-h-[32px]",
                    filters.hasEmail === true
                      ? "text-white border-transparent"
                      : "bg-white text-gray-600 border-gray-200 hover:border-gray-300"
                  )}
                  style={filters.hasEmail === true ? { backgroundColor: NAVY } : undefined}
                >
                  Has Email
                </button>
              </div>
            )}
          </div>

          {/* Download CTA */}
          <div className="flex items-center gap-3 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              onClick={downloadFiltered}
              disabled={downloading || (previewCount !== null && previewCount === 0)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white min-h-[44px] disabled:opacity-50 disabled:pointer-events-none transition-colors"
              style={{ backgroundColor: NAVY }}
            >
              {downloading
                ? <><div className="w-4 h-4 rounded-full bg-white/30 animate-pulse" /> Preparing…</>
                : <><Download className="w-4 h-4" /> Download {EXPORT_TYPE_CONFIG[exportType].label} CSV</>
              }
            </motion.button>
            {previewCount !== null && previewCount === 0 && (
              <p className="text-xs text-amber-600 font-medium">No records match these filters.</p>
            )}
            <p className="text-xs text-gray-400">{cfg.description}</p>
          </div>
        </CardContent>
      </Card>

      {/* ── Quick Exports ────────────────────────────────────── */}
      <Card className="overflow-hidden">
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <button
              onClick={() => setShowQuick(v => !v)}
              className="flex items-center gap-2 font-semibold text-sm hover:opacity-80 transition-opacity"
              style={{ color: NAVY }}
            >
              <Download className="w-4 h-4" />
              Quick Exports (One-Click)
              <span className="text-[10px] font-normal text-gray-400 ml-1">{showQuick ? "▲" : "▼"}</span>
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              transition={spring}
              onClick={exportOpsPack}
              disabled={bulkExporting}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 min-h-[36px]"
            >
              {bulkExporting
                ? <div className="w-3 h-3 rounded-full bg-gray-300 animate-pulse" />
                : <Download className="w-3 h-3" />}
              Export All (Ops Pack)
            </motion.button>
          </div>
          <p className="text-xs text-gray-500 mt-0.5">
            Full unfiltered downloads. No configuration — just click and download.
          </p>
        </CardHeader>

        <AnimatePresence>
          {showQuick && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden"
            >
              <CardContent className="pt-0">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {QUICK_EXPORTS.map(ex => (
                    <motion.button
                      key={ex.endpoint}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.98 }}
                      transition={spring}
                      onClick={() => doQuickExport(ex.endpoint, ex.label)}
                      disabled={quickExporting[ex.endpoint]}
                      className="flex items-center gap-3 text-left p-3 border border-gray-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/30 transition-colors min-h-[56px] disabled:opacity-60"
                    >
                      <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0" style={{ backgroundColor: `${GREEN}10`, color: GREEN }}>
                        {quickExporting[ex.endpoint]
                          ? <div className="w-4 h-4 rounded-full bg-emerald-300 animate-pulse" />
                          : ex.icon}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold" style={{ color: NAVY }}>{ex.label}</p>
                        <p className="text-xs text-gray-500 truncate">{ex.description}</p>
                      </div>
                      {!quickExporting[ex.endpoint] && (
                        <Download className="w-3.5 h-3.5 text-gray-300 ml-auto flex-shrink-0" />
                      )}
                    </motion.button>
                  ))}
                </div>
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>

      {/* ── Export History ───────────────────────────────────── */}
      <Card>
        <CardHeader>
          <h3 className="font-semibold flex items-center gap-2 text-sm" style={{ color: NAVY }}>
            <History className="w-4 h-4" /> Export History
          </h3>
          <p className="text-xs text-gray-500 mt-0.5">Server-side log — visible across all devices and sessions.</p>
        </CardHeader>
        <CardContent>
          {historyLoading ? (
            <div className="space-y-2">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-10 rounded-lg bg-gray-100 animate-pulse" />
              ))}
            </div>
          ) : history.length === 0 ? (
            <EmptyState
              icon={<Download className="w-10 h-10" />}
              title="No exports yet"
              description="Your exports will be logged here."
            />
          ) : (
            <div className="overflow-x-auto border border-gray-200 rounded-lg">
              <table className="w-full text-xs">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">Type</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">Records</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">Filters applied</th>
                    <th className="px-3 py-2 text-left text-gray-600 font-medium">When</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {history.map(item => {
                    const filterKeys = item.filters ? Object.keys(item.filters).filter(k => {
                      const v = (item.filters as Record<string, unknown>)[k];
                      return v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0);
                    }) : [];
                    return (
                      <tr key={item.id} className="hover:bg-gray-50/50">
                        <td className="px-3 py-2.5">
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold text-white" style={{ backgroundColor: NAVY }}>
                            {item.exportType}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-700 font-medium tabular-nums">
                          {item.recordCount.toLocaleString()}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">
                          {filterKeys.length === 0
                            ? <span className="text-gray-300">—</span>
                            : <span className="text-gray-600">{filterKeys.join(", ")}</span>}
                        </td>
                        <td className="px-3 py-2.5 text-gray-500">
                          {new Date(item.createdAt).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
