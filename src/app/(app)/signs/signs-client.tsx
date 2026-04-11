"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, Search, ChevronLeft, ChevronRight, Camera, Plus, Download,
  ChevronUp, ChevronDown, ArrowUpDown, Package, Truck, CheckCircle2,
  XCircle, Clock, AlertTriangle, Eye, List, Layers, Map as MapIcon,
  Home, Maximize2, AppWindow, Grid3X3, CornerDownRight, Building2, Minus,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, CardHeader, CardTitle, FormField,
  Input, Label, Modal, PageHeader, Select, StatCard, Textarea, EmptyState,
} from "@/components/ui";
import { toast } from "sonner";
import dynamic from "next/dynamic";

// ── Lazy map ─────────────────────────────────────────────────────────────────

const SignsMapView = dynamic(() => import("./signs-map"), {
  ssr: false,
  loading: () => <ShimmerBlock className="h-[500px] w-full rounded-xl" />,
});

// ── Types ────────────────────────────────────────────────────────────────────

type SignStatus = "requested" | "scheduled" | "installed" | "removed" | "declined";

interface SignRow {
  id: string;
  address1: string;
  city: string | null;
  postalCode: string | null;
  lat: number | null;
  lng: number | null;
  signType: string;
  status: SignStatus;
  assignedTeam: string | null;
  notes: string | null;
  requestedAt: string;
  installedAt: string | null;
  removedAt: string | null;
  photoUrl: string | null;
  quantity: number;
  isOpponent: boolean;
  contact: { id: string; firstName: string; lastName: string; phone: string | null; email?: string | null } | null;
}

type SortField = "address1" | "status" | "signType" | "requestedAt" | "assignedTeam" | "quantity";
type SortDir = "asc" | "desc";

// ── Constants ────────────────────────────────────────────────────────────────

const STATUS_META: Record<SignStatus, { label: string; badge: "default" | "success" | "warning" | "danger" | "info" }> = {
  requested: { label: "Requested", badge: "warning" },
  scheduled: { label: "Scheduled", badge: "info" },
  installed: { label: "Installed", badge: "success" },
  removed:   { label: "Removed",   badge: "default" },
  declined:  { label: "Declined",  badge: "danger" },
};

const SIGN_TYPES = [
  { value: "standard", label: "Lawn Sign" },
  { value: "large", label: "Large Sign" },
  { value: "window", label: "Window Sign" },
] as const;

const CAPTURE_SIGN_TYPES = [
  { value: "small_yard",  label: "Small Yard",  Icon: Home },
  { value: "large_yard",  label: "Large Yard",  Icon: Maximize2 },
  { value: "window",      label: "Window",      Icon: AppWindow },
  { value: "fence",       label: "Fence",       Icon: Grid3X3 },
  { value: "corner_lot",  label: "Corner Lot",  Icon: CornerDownRight },
  { value: "business",    label: "Business",    Icon: Building2 },
] as const;
type CaptureSignTypeValue = typeof CAPTURE_SIGN_TYPES[number]["value"];

const pageSize = 25;

// ── Shimmer skeleton ─────────────────────────────────────────────────────────

function ShimmerBlock({ className }: { className?: string }) {
  return (
    <div
      className={`animate-pulse rounded ${className ?? "h-4 w-full"}`}
      style={{
        background: "linear-gradient(90deg, #e5e7eb 25%, #f3f4f6 50%, #e5e7eb 75%)",
        backgroundSize: "200% 100%",
        animation: "shimmer 1.5s infinite",
      }}
    />
  );
}

function TableSkeleton({ rows = 8 }: { rows?: number }) {
  return (
    <div className="space-y-3 p-4">
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <ShimmerBlock className="h-5 w-1/4" />
          <ShimmerBlock className="h-5 w-1/6" />
          <ShimmerBlock className="h-5 w-1/6" />
          <ShimmerBlock className="h-5 w-1/6" />
          <ShimmerBlock className="h-5 w-1/6" />
        </div>
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────

export default function SignsClient({ campaignId }: { campaignId: string }) {
  const [signs, setSigns] = useState<SignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [sortField, setSortField] = useState<SortField>("requestedAt");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const [activeView, setActiveView] = useState<"table" | "map" | "inventory">("table");
  const [showNewModal, setShowNewModal] = useState(false);
  const [showQuickCapture, setShowQuickCapture] = useState(false);
  const [showOpponentSpot, setShowOpponentSpot] = useState(false);
  const [editingSign, setEditingSign] = useState<SignRow | null>(null);

  // Debounce
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Fetch
  const loadSigns = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ campaignId, page: String(page), pageSize: String(pageSize) });
      if (statusFilter !== "all") params.set("status", statusFilter);
      if (debouncedSearch) params.set("search", debouncedSearch);
      const res = await fetch(`/api/signs?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load signs");
      setSigns(data.data ?? []);
      setTotal(data.total ?? 0);
    } catch (err) {
      toast.error((err as Error).message || "Unable to load signs");
    } finally {
      setLoading(false);
    }
  }, [campaignId, page, debouncedSearch, statusFilter]);

  useEffect(() => { loadSigns(); }, [loadSigns]);
  useEffect(() => { setPage(1); }, [debouncedSearch, statusFilter]);

  // Update sign
  const updateSign = useCallback(async (signId: string, data: Record<string, unknown>) => {
    try {
      const res = await fetch(`/api/signs?id=${signId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error("Update failed");
      const json = await res.json();
      setSigns(prev => prev.map(s => s.id === signId ? { ...s, ...json.data } : s));
      toast.success("Sign updated");
    } catch {
      toast.error("Failed to update sign");
    }
  }, []);

  // Create via quick-capture
  const createSign = useCallback(async (payload: Record<string, unknown>): Promise<boolean> => {
    try {
      const res = await fetch("/api/signs/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, campaignId }),
      });
      if (!res.ok) throw new Error("Create failed");
      toast.success("Sign request created");
      loadSigns();
      return true;
    } catch {
      toast.error("Failed to create sign");
      return false;
    }
  }, [campaignId, loadSigns]);

  // Sort
  const handleSort = (field: SortField) => {
    if (sortField === field) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortField(field); setSortDir("asc"); }
  };

  const sortedSigns = useMemo(() => {
    const arr = [...signs];
    arr.sort((a, b) => {
      const av = a[sortField];
      const bv = b[sortField];
      let cmp = 0;
      if (typeof av === "string" && typeof bv === "string") cmp = av.localeCompare(bv);
      else if (typeof av === "number" && typeof bv === "number") cmp = av - bv;
      else if (av == null && bv != null) cmp = 1;
      else if (av != null && bv == null) cmp = -1;
      return sortDir === "asc" ? cmp : -cmp;
    });
    return arr;
  }, [signs, sortField, sortDir]);

  // Stats
  const stats = useMemo(() => ({
    requested: signs.filter(s => s.status === "requested").length,
    scheduled: signs.filter(s => s.status === "scheduled").length,
    installed: signs.filter(s => s.status === "installed").length,
    removed: signs.filter(s => s.status === "removed").length,
    opponent: signs.filter(s => s.isOpponent).length,
    totalQty: signs.reduce((sum, s) => sum + (s.quantity ?? 1), 0),
  }), [signs]);

  // Inventory by type
  const inventory = useMemo(() => {
    const inv: Record<string, { requested: number; inField: number; removed: number; total: number }> = {};
    SIGN_TYPES.forEach(t => { inv[t.value] = { requested: 0, inField: 0, removed: 0, total: 0 }; });
    signs.forEach(s => {
      const key = s.signType in inv ? s.signType : "standard";
      const qty = s.quantity ?? 1;
      inv[key].total += qty;
      if (s.status === "installed") inv[key].inField += qty;
      else if (s.status === "removed" || s.status === "declined") inv[key].removed += qty;
      else inv[key].requested += qty;
    });
    return inv;
  }, [signs]);

  // Distribution zones
  const distributionZones = useMemo(() => {
    const zones = new Map<string, { total: number; installed: number; requested: number; removed: number }>();
    signs.forEach(s => {
      const zone = s.city || "Unknown";
      const z = zones.get(zone) || { total: 0, installed: 0, requested: 0, removed: 0 };
      const qty = s.quantity ?? 1;
      z.total += qty;
      if (s.status === "installed") z.installed += qty;
      if (s.status === "requested" || s.status === "scheduled") z.requested += qty;
      if (s.status === "removed") z.removed += qty;
      zones.set(zone, z);
    });
    return Array.from(zones.entries()).map(([name, d]) => ({ name, ...d })).sort((a, b) => b.total - a.total);
  }, [signs]);

  // Export CSV
  const exportCSV = () => {
    if (signs.length === 0) { toast.error("No signs to export"); return; }
    const headers = ["Address", "City", "Postal Code", "Type", "Status", "Assigned Team", "Contact", "Qty", "Requested", "Installed", "Removed", "Notes", "Opponent"];
    const rows = sortedSigns.map(s => [
      s.address1, s.city ?? "", s.postalCode ?? "", s.signType, s.status,
      s.assignedTeam ?? "", s.contact ? `${s.contact.firstName} ${s.contact.lastName}`.trim() : "",
      s.quantity ?? 1, s.requestedAt, s.installedAt ?? "", s.removedAt ?? "", s.notes ?? "",
      s.isOpponent ? "Yes" : "No",
    ]);
    const csv = [headers, ...rows].map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `signs-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Exported to CSV");
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      {/* Shimmer keyframes */}
      <style>{`@keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }`}</style>

      <PageHeader
        title="Signs"
        description="Track sign requests, installations, and removals across your campaign."
        actions={
          <div className="flex items-center gap-2 flex-wrap">
            <MotionButton variant="outline" size="sm" onClick={() => setShowQuickCapture(true)}>
              <Camera className="w-4 h-4" /> Quick Capture
            </MotionButton>
            <MotionButton variant="outline" size="sm" onClick={() => setShowOpponentSpot(true)}>
              <Eye className="w-4 h-4" /> Opponent Sign
            </MotionButton>
            <MotionButton variant="outline" size="sm" onClick={exportCSV}>
              <Download className="w-4 h-4" /> Export
            </MotionButton>
            <MotionButton size="sm" onClick={() => setShowNewModal(true)} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white">
              <Plus className="w-4 h-4" /> New Request
            </MotionButton>
          </div>
        }
      />

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Signs" value={total} icon={<MapPin className="w-5 h-5" />} color="blue" />
        <StatCard label="Installed" value={stats.installed} icon={<CheckCircle2 className="w-5 h-5" />} color="green" />
        <StatCard label="Pending" value={stats.requested + stats.scheduled} icon={<Clock className="w-5 h-5" />} color="amber" />
        <StatCard label="Inventory" value={stats.totalQty} icon={<Package className="w-5 h-5" />} color="purple" change={`${stats.opponent} opponent spotted`} />
      </div>

      {/* View tabs */}
      <div className="flex items-center gap-2 flex-wrap">
        {(["table", "map", "inventory"] as const).map(v => (
          <motion.button
            key={v}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setActiveView(v)}
            className={`inline-flex items-center gap-1.5 px-4 py-2.5 min-h-[44px] rounded-lg text-sm font-medium transition-colors ${
              activeView === v ? "bg-[#0A2342] text-white" : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {v === "table" && <List className="w-4 h-4" />}
            {v === "map" && <MapIcon className="w-4 h-4" />}
            {v === "inventory" && <Package className="w-4 h-4" />}
            {v.charAt(0).toUpperCase() + v.slice(1)}
          </motion.button>
        ))}
      </div>

      {/* Search + filter */}
      <Card>
        <div className="p-4 flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input className="pl-9 min-h-[44px]" value={search} onChange={e => setSearch(e.target.value)} placeholder="Search address, team, contact..." />
          </div>
          <Select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="min-h-[44px] w-full sm:w-48">
            <option value="all">All Statuses</option>
            {(Object.keys(STATUS_META) as SignStatus[]).map(s => (
              <option key={s} value={s}>{STATUS_META[s].label}</option>
            ))}
          </Select>
        </div>
      </Card>

      {/* ── Table view ── */}
      {activeView === "table" && (
        <Card>
          {loading ? (
            <TableSkeleton />
          ) : signs.length === 0 ? (
            <EmptyState
              icon={<MapPin className="w-12 h-12" />}
              title="No signs yet"
              description="Create your first sign request to start tracking."
              action={
                <MotionButton onClick={() => setShowNewModal(true)} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white">
                  <Plus className="w-4 h-4" /> New Sign Request
                </MotionButton>
              }
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      {([
                        ["address1", "Address"],
                        ["status", "Status"],
                        ["signType", "Type"],
                        ["assignedTeam", "Team"],
                        ["quantity", "Qty"],
                        ["requestedAt", "Requested"],
                      ] as [SortField, string][]).map(([field, label]) => (
                        <th
                          key={field}
                          onClick={() => handleSort(field)}
                          className="px-4 py-3 text-left font-medium text-gray-500 cursor-pointer select-none hover:text-gray-700 whitespace-nowrap"
                        >
                          <span className="inline-flex items-center gap-1">
                            {label}
                            {sortField === field
                              ? (sortDir === "asc" ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
                              : <ArrowUpDown className="w-3 h-3 opacity-30" />}
                          </span>
                        </th>
                      ))}
                      <th className="px-4 py-3 text-left font-medium text-gray-500">Contact</th>
                      <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence mode="popLayout">
                      {sortedSigns.map(sign => (
                        <motion.tr
                          key={sign.id}
                          layout
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              {sign.isOpponent && <AlertTriangle className="w-3.5 h-3.5 text-red-500 flex-shrink-0" />}
                              <div>
                                <p className="font-medium text-gray-900 truncate max-w-[220px]">{sign.address1}</p>
                                {(sign.city || sign.postalCode) && (
                                  <p className="text-xs text-gray-500">{[sign.city, sign.postalCode].filter(Boolean).join(", ")}</p>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <Badge variant={STATUS_META[sign.status]?.badge ?? "default"}>
                              {STATUS_META[sign.status]?.label ?? sign.status}
                            </Badge>
                          </td>
                          <td className="px-4 py-3 text-gray-600 capitalize">{sign.signType}</td>
                          <td className="px-4 py-3 text-gray-600">{sign.assignedTeam || "—"}</td>
                          <td className="px-4 py-3 text-gray-600">{sign.quantity ?? 1}</td>
                          <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">
                            {new Date(sign.requestedAt).toLocaleDateString()}
                          </td>
                          <td className="px-4 py-3 text-gray-600 text-xs">
                            {sign.contact ? `${sign.contact.firstName} ${sign.contact.lastName}`.trim() || "—" : "—"}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              {sign.status === "requested" && (
                                <MotionButton size="sm" variant="ghost" onClick={() => updateSign(sign.id, { status: "scheduled" })} className="text-blue-600">
                                  <Truck className="w-3.5 h-3.5" />
                                </MotionButton>
                              )}
                              {(sign.status === "requested" || sign.status === "scheduled") && (
                                <MotionButton size="sm" variant="ghost" onClick={() => updateSign(sign.id, { status: "installed" })} className="text-emerald-600">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                </MotionButton>
                              )}
                              {sign.status === "installed" && (
                                <MotionButton size="sm" variant="ghost" onClick={() => updateSign(sign.id, { status: "removed" })} className="text-gray-500">
                                  <XCircle className="w-3.5 h-3.5" />
                                </MotionButton>
                              )}
                              <MotionButton size="sm" variant="ghost" onClick={() => setEditingSign(sign)}>
                                <Eye className="w-3.5 h-3.5" />
                              </MotionButton>
                            </div>
                          </td>
                        </motion.tr>
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
                  <p className="text-sm text-gray-500">
                    Showing {(page - 1) * pageSize + 1}&ndash;{Math.min(page * pageSize, total)} of {total}
                  </p>
                  <div className="flex items-center gap-1">
                    <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage(p => p - 1)} className="min-h-[44px]">
                      <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <Button size="sm" variant="outline" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)} className="min-h-[44px]">
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </Card>
      )}

      {/* ── Map view ── */}
      {activeView === "map" && (
        <Card className="overflow-hidden">
          <SignsMapView signs={signs} onStatusChange={updateSign} />
        </Card>
      )}

      {/* ── Inventory view ── */}
      {activeView === "inventory" && (
        <div className="space-y-6">
          <Card>
            <CardHeader><CardTitle>Inventory by Type</CardTitle></CardHeader>
            <CardContent>
              {loading ? <TableSkeleton rows={3} /> : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {SIGN_TYPES.map(t => {
                    const d = inventory[t.value];
                    const pct = d.total > 0 ? Math.round((d.inField / d.total) * 100) : 0;
                    return (
                      <motion.div key={t.value} whileHover={{ scale: 1.02 }} className="p-4 border border-gray-200 rounded-xl">
                        <h4 className="font-semibold text-gray-900 mb-3">{t.label}</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between"><span className="text-gray-500">Total</span><span className="font-medium">{d.total}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">In Field</span><span className="font-medium text-emerald-600">{d.inField}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Pending</span><span className="font-medium text-amber-600">{d.requested}</span></div>
                          <div className="flex justify-between"><span className="text-gray-500">Removed</span><span className="font-medium text-gray-500">{d.removed}</span></div>
                          <div className="h-2 bg-gray-100 rounded-full overflow-hidden mt-2">
                            <div className="h-full bg-[#1D9E75] rounded-full transition-all" style={{ width: `${pct}%` }} />
                          </div>
                          <p className="text-xs text-gray-400 text-right">{pct}% deployed</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Distribution Zones</CardTitle></CardHeader>
            <CardContent>
              {loading ? <TableSkeleton rows={4} /> : distributionZones.length === 0 ? (
                <EmptyState icon={<Layers className="w-10 h-10" />} title="No zones" description="Signs will be grouped by city." />
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-100 bg-gray-50/50">
                        <th className="px-4 py-2 text-left font-medium text-gray-500">Zone</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">Total</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">Installed</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">Pending</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">Removed</th>
                        <th className="px-4 py-2 text-right font-medium text-gray-500">Coverage</th>
                      </tr>
                    </thead>
                    <tbody>
                      {distributionZones.map(z => (
                        <tr key={z.name} className="border-b border-gray-50 hover:bg-gray-50/50">
                          <td className="px-4 py-2.5 font-medium text-gray-900">{z.name}</td>
                          <td className="px-4 py-2.5 text-right text-gray-600">{z.total}</td>
                          <td className="px-4 py-2.5 text-right text-emerald-600">{z.installed}</td>
                          <td className="px-4 py-2.5 text-right text-amber-600">{z.requested}</td>
                          <td className="px-4 py-2.5 text-right text-gray-500">{z.removed}</td>
                          <td className="px-4 py-2.5 text-right">
                            <div className="inline-flex items-center gap-2">
                              <div className="w-16 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-full bg-[#1D9E75] rounded-full" style={{ width: `${z.total > 0 ? Math.round((z.installed / z.total) * 100) : 0}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{z.total > 0 ? Math.round((z.installed / z.total) * 100) : 0}%</span>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Modals */}
      <NewSignModal open={showNewModal} onClose={() => setShowNewModal(false)} onCreate={createSign} />
      <QuickCaptureModal open={showQuickCapture} onClose={() => setShowQuickCapture(false)} onCreate={createSign} />
      <OpponentSpotModal open={showOpponentSpot} onClose={() => setShowOpponentSpot(false)} campaignId={campaignId} onCreated={loadSigns} />
      {editingSign && <SignDetailModal sign={editingSign} onClose={() => setEditingSign(null)} onUpdate={updateSign} />}
    </div>
  );
}

// ── Spring button wrapper ────────────────────────────────────────────────────

function MotionButton({ children, className, ...props }: React.ComponentProps<typeof Button>) {
  return (
    <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} className="inline-flex">
      <Button className={`min-h-[44px] ${className ?? ""}`} {...props}>{children}</Button>
    </motion.div>
  );
}

// ── New Sign Request Modal ───────────────────────────────────────────────────

function NewSignModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (d: Record<string, unknown>) => Promise<boolean> }) {
  const [address, setAddress] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [signType, setSignType] = useState("standard");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const reset = () => { setAddress(""); setFirstName(""); setLastName(""); setPhone(""); setSignType("standard"); setNotes(""); };

  const handleSubmit = async () => {
    if (!address.trim()) { toast.error("Address is required"); return; }
    setSubmitting(true);
    const ok = await onCreate({ address: address.trim(), firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), signType, notes: notes.trim() });
    setSubmitting(false);
    if (ok) { reset(); onClose(); }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Sign Request" size="md">
      <div className="space-y-4">
        <div><Label required>Address</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="123 Main St" className="min-h-[44px]" /></div>
        <div className="grid grid-cols-2 gap-3">
          <div><Label>First Name</Label><Input value={firstName} onChange={e => setFirstName(e.target.value)} className="min-h-[44px]" /></div>
          <div><Label>Last Name</Label><Input value={lastName} onChange={e => setLastName(e.target.value)} className="min-h-[44px]" /></div>
        </div>
        <div><Label>Phone</Label><Input value={phone} onChange={e => setPhone(e.target.value)} className="min-h-[44px]" /></div>
        <div>
          <Label>Sign Type</Label>
          <Select value={signType} onChange={e => setSignType(e.target.value)} className="min-h-[44px]">
            {SIGN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
          </Select>
        </div>
        <div><Label>Notes</Label><Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Special instructions..." /></div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="min-h-[44px]">Cancel</Button>
          <MotionButton onClick={handleSubmit} loading={submitting} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white">Create Request</MotionButton>
        </div>
      </div>
    </Modal>
  );
}

// ── Quick Capture Modal ──────────────────────────────────────────────────────

function QuickCaptureModal({ open, onClose, onCreate }: { open: boolean; onClose: () => void; onCreate: (d: Record<string, unknown>) => Promise<boolean> }) {
  const [address, setAddress]       = useState("");
  const [signType, setSignType]     = useState<CaptureSignTypeValue>("small_yard");
  const [name, setName]             = useState("");
  const [phone, setPhone]           = useState("");
  const [notes, setNotes]           = useState("");
  const [showNotes, setShowNotes]   = useState(false);
  const [quantity, setQuantity]     = useState(1);
  const [submitting, setSubmitting] = useState(false);

  const reset = () => {
    setAddress(""); setSignType("small_yard"); setName(""); setPhone("");
    setNotes(""); setShowNotes(false); setQuantity(1);
  };

  const handleSubmit = async () => {
    if (!address.trim()) { toast.error("Address is required"); return; }
    setSubmitting(true);
    const parts     = name.trim().split(" ");
    const firstName = parts[0] || undefined;
    const lastName  = parts.slice(1).join(" ") || undefined;
    const ok = await onCreate({
      address:   address.trim(),
      signType,
      notes:     notes.trim() || undefined,
      firstName,
      lastName,
      phone:     phone.trim() || undefined,
      quantity,
    });
    setSubmitting(false);
    if (ok) { reset(); onClose(); }
  };

  return (
    <Modal open={open} onClose={() => { reset(); onClose(); }} title="Capture Sign Request" size="sm">
      <div className="space-y-4">

        {/* Subtitle */}
        <div className="flex items-center gap-2 -mt-1">
          <div className="w-6 h-6 rounded-full bg-[#1D9E75] flex items-center justify-center flex-shrink-0">
            <Camera className="w-3 h-3 text-white" />
          </div>
          <p className="text-xs text-gray-500">Field canvassing · quick entry</p>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Address</label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
            <Input
              value={address}
              onChange={e => setAddress(e.target.value)}
              placeholder="123 Main St..."
              className="pl-9 min-h-[44px]"
              autoFocus
            />
          </div>
        </div>

        {/* Sign Type Grid */}
        <div>
          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Sign Type Requested</label>
          <div className="grid grid-cols-3 gap-2">
            {CAPTURE_SIGN_TYPES.map(({ value, label, Icon }) => (
              <button
                key={value}
                type="button"
                onClick={() => setSignType(value)}
                className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border p-3 text-xs font-medium transition-all ${
                  signType === value
                    ? "border-[#1D9E75] bg-[#1D9E75]/10 text-[#1D9E75]"
                    : "border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Name + Phone + Photo */}
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Name</label>
            <Input value={name} onChange={e => setName(e.target.value)} placeholder="Optional" className="min-h-[40px] text-sm" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Phone</label>
            <Input value={phone} onChange={e => setPhone(e.target.value)} placeholder="Optional" className="min-h-[40px] text-sm" type="tel" />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">Photo</label>
            <button
              type="button"
              onClick={() => toast.info("Photo upload coming soon")}
              className="w-full min-h-[40px] border border-gray-200 rounded-lg flex items-center justify-center text-gray-400 hover:border-gray-300 hover:bg-gray-50 transition-colors"
            >
              <Camera className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Notes — expandable */}
        {!showNotes ? (
          <button
            type="button"
            onClick={() => setShowNotes(true)}
            className="flex items-center gap-1 text-xs text-[#1D9E75] hover:text-[#1D9E75]/80 transition-colors"
          >
            <Plus className="w-3 h-3" /> Add notes (sign type, colour, etc.)
          </button>
        ) : (
          <Textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Sign type, colour, placement preference..."
            rows={2}
          />
        )}

        {/* Quantity + Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQuantity(q => Math.max(1, q - 1))}
              className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Minus className="w-3 h-3" />
            </button>
            <span className="text-sm font-semibold w-5 text-center">{quantity}</span>
            <button
              type="button"
              onClick={() => setQuantity(q => q + 1)}
              className="w-7 h-7 rounded-full border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Plus className="w-3 h-3" />
            </button>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 text-xs">
              {CAPTURE_SIGN_TYPES.find(t => t.value === signType)?.label ?? "sign"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => { reset(); onClose(); }}
              className="text-sm text-gray-500 hover:text-gray-700 transition-colors px-3 py-1.5"
            >
              Cancel
            </button>
            <MotionButton onClick={handleSubmit} loading={submitting} size="sm" className="bg-[#1D9E75] hover:bg-[#1D9E75]/90 text-white">
              <Camera className="w-3.5 h-3.5" /> Capture Request
            </MotionButton>
          </div>
        </div>

      </div>
    </Modal>
  );
}

// ── Opponent Sign Modal ──────────────────────────────────────────────────────

function OpponentSpotModal({ open, onClose, campaignId, onCreated }: { open: boolean; onClose: () => void; campaignId: string; onCreated: () => void }) {
  const [address, setAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!address.trim()) { toast.error("Address is required"); return; }
    setSubmitting(true);
    try {
      const res = await fetch("/api/signs/quick-capture", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, address: address.trim(), signType: "standard", notes: `[OPPONENT] ${notes.trim()}`.trim() }),
      });
      if (!res.ok) throw new Error();
      toast.success("Opponent sign recorded");
      setAddress(""); setNotes("");
      onCreated();
      onClose();
    } catch {
      toast.error("Failed to record opponent sign");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Spot Opponent Sign" size="sm">
      <div className="space-y-4">
        <p className="text-sm text-gray-500">Record the location of a competitor&apos;s sign.</p>
        <div><Label required>Address / Location</Label><Input value={address} onChange={e => setAddress(e.target.value)} placeholder="Corner of Main & 1st" className="min-h-[44px]" autoFocus /></div>
        <div><Label>Notes</Label><Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Candidate name, sign size..." className="min-h-[44px]" /></div>
        <MotionButton onClick={handleSubmit} loading={submitting} className="w-full bg-red-600 hover:bg-red-700 text-white">
          <AlertTriangle className="w-4 h-4" /> Record Opponent Sign
        </MotionButton>
      </div>
    </Modal>
  );
}

// ── Sign Detail Modal ────────────────────────────────────────────────────────

function SignDetailModal({ sign, onClose, onUpdate }: { sign: SignRow; onClose: () => void; onUpdate: (id: string, d: Record<string, unknown>) => Promise<void> }) {
  const [status, setStatus] = useState(sign.status);
  const [team, setTeam] = useState(sign.assignedTeam || "");
  const [notes, setNotes] = useState(sign.notes || "");
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(sign.id, { status, assignedTeam: team, notes });
    setSaving(false);
    onClose();
  };

  return (
    <Modal open={true} onClose={onClose} title="Sign Details" size="md">
      <div className="space-y-4">
        <div className="bg-gray-50 rounded-lg p-4 space-y-2 text-sm">
          <Row label="Address" value={sign.address1} />
          {sign.city && <Row label="City" value={sign.city} />}
          {sign.postalCode && <Row label="Postal Code" value={sign.postalCode} />}
          <Row label="Type" value={<span className="capitalize">{sign.signType}</span>} />
          <Row label="Quantity" value={String(sign.quantity ?? 1)} />
          {sign.contact && <Row label="Contact" value={`${sign.contact.firstName} ${sign.contact.lastName}`} />}
          <Row label="Requested" value={new Date(sign.requestedAt).toLocaleDateString()} />
          {sign.installedAt && <Row label="Installed" value={new Date(sign.installedAt).toLocaleDateString()} />}
          {sign.removedAt && <Row label="Removed" value={new Date(sign.removedAt).toLocaleDateString()} />}
          {sign.isOpponent && <Row label="Flag" value={<Badge variant="danger">Opponent</Badge>} />}
        </div>
        <FormField label="Status">
          <Select value={status} onChange={e => setStatus(e.target.value as SignStatus)} className="min-h-[44px]">
            {(Object.keys(STATUS_META) as SignStatus[]).map(s => <option key={s} value={s}>{STATUS_META[s].label}</option>)}
          </Select>
        </FormField>
        <FormField label="Assigned Team">
          <Input value={team} onChange={e => setTeam(e.target.value)} placeholder="e.g. North Team" className="min-h-[44px]" />
        </FormField>
        <FormField label="Notes">
          <Textarea value={notes} onChange={e => setNotes(e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={onClose} className="min-h-[44px]">Cancel</Button>
          <MotionButton onClick={handleSave} loading={saving} className="bg-[#0A2342] hover:bg-[#0A2342]/90 text-white">Save Changes</MotionButton>
        </div>
      </div>
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-gray-900">{value}</span>
    </div>
  );
}
