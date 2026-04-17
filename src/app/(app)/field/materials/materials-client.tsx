"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, PackageCheck, AlertTriangle, Layers,
  Search, Box, TrendingDown, BarChart3, Clock,
  Printer, ScanLine, X, ChevronDown, ChevronUp, ExternalLink,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, StatCard,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import Link from "next/link";
import type { PrintProductType, FieldShiftType, FieldShiftStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface InventoryRow {
  id: string;
  sku: string;
  productType: PrintProductType;
  description: string | null;
  totalQty: number;
  availableQty: number;
  reservedQty: number;
  depletedQty: number;
  wastedQty: number;
  location: string;
  reorderThreshold: number | null;
  notes: string | null;
}

export interface ShiftWithMaterials {
  id: string;
  name: string;
  shiftType: FieldShiftType;
  status: FieldShiftStatus;
  scheduledDate: string;
  startTime: string;
  materialsJson: Record<string, unknown> | null;
  ward: string | null;
  pollNumber: string | null;
  _count?: { assignments: number };
}

export interface RecentLog {
  id: string;
  action: string;
  qty: number;
  balance: number;
  notes: string | null;
  referenceType: string | null;
  createdAt: string;
  inventory: { sku: string; productType: PrintProductType };
}

interface Props {
  campaignId: string;
  campaignName: string;
  inventory: InventoryRow[];
  shifts: ShiftWithMaterials[];
  recentLogs?: RecentLog[];
}

interface AssignmentLine {
  inventoryId: string;
  qty: number;
}

type Tab = "inventory" | "shifts" | "activity";

// ── Product type labels ───────────────────────────────────────────────────────

const PRODUCT_LABELS: Partial<Record<PrintProductType, string>> = {
  flyer:           "Flyer",
  door_hanger:     "Door Hanger",
  lawn_sign:       "Lawn Sign",
  mailer_postcard: "Postcard",
  banner:          "Banner",
  palm_card:       "Palm Card",
};

const ACTION_COLORS: Record<string, string> = {
  received:  "text-[#1D9E75]",
  assigned:  "text-blue-400",
  returned:  "text-amber-400",
  depleted:  "text-slate-400",
  wasted:    "text-[#E24B4A]",
  adjusted:  "text-purple-400",
};

// ── Main component ────────────────────────────────────────────────────────────

export default function MaterialsClient({
  campaignId,
  campaignName,
  inventory,
  shifts,
  recentLogs = [],
}: Props) {
  const [tab, setTab] = useState<Tab>("inventory");
  const [search, setSearch] = useState("");
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentLine[]>([]);
  const [assigning, setAssigning] = useState(false);
  const [expandedShift, setExpandedShift] = useState<string | null>(null);
  const [scanMode, setScanMode] = useState(false);
  const [scanInput, setScanInput] = useState("");
  const scanRef = useRef<HTMLInputElement>(null);

  const lowStock = inventory.filter((i) => i.availableQty === 0);
  const reorderNeeded = inventory.filter(
    (i) => i.reorderThreshold != null && i.availableQty <= i.reorderThreshold && i.availableQty > 0
  );
  const available = inventory.filter((i) => i.availableQty > 0);

  const filtered = available.filter((i) =>
    !search ||
    i.sku.toLowerCase().includes(search.toLowerCase()) ||
    (i.description ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function setQty(inventoryId: string, qty: number) {
    setAssignments((prev) => {
      const existing = prev.find((a) => a.inventoryId === inventoryId);
      if (qty <= 0) return prev.filter((a) => a.inventoryId !== inventoryId);
      if (existing) return prev.map((a) => a.inventoryId === inventoryId ? { ...a, qty } : a);
      return [...prev, { inventoryId, qty }];
    });
  }

  function getQty(inventoryId: string) {
    return assignments.find((a) => a.inventoryId === inventoryId)?.qty ?? 0;
  }

  async function handleAssign() {
    if (!selectedShift) { toast.error("Select a shift first"); return; }
    if (assignments.length === 0) { toast.error("Add at least one item to assign"); return; }
    setAssigning(true);
    try {
      const res = await fetch("/api/field/materials/assign", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId, shiftId: selectedShift, assignments }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Assignment failed"); return; }
      toast.success(`${assignments.length} item${assignments.length !== 1 ? "s" : ""} assigned to shift`);
      setAssignments([]);
      setSelectedShift("");
    } catch {
      toast.error("Network error");
    } finally {
      setAssigning(false);
    }
  }

  // Barcode scan: focus hidden input, auto-search when Enter pressed
  const handleScanToggle = useCallback(() => {
    setScanMode((v) => {
      if (!v) setTimeout(() => scanRef.current?.focus(), 100);
      return !v;
    });
    setScanInput("");
    setSearch("");
  }, []);

  function handleScanEnter(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" && scanInput.trim()) {
      setSearch(scanInput.trim());
      setScanMode(false);
      setTab("inventory");
      const match = inventory.find((i) => i.sku.toLowerCase() === scanInput.trim().toLowerCase());
      if (match) toast.success(`Found: ${match.sku}`);
      else toast.error(`No match for "${scanInput.trim()}"`);
    }
  }

  const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

  // Per-shift material summary from materialsJson
  function shiftMaterialsSummary(shift: ShiftWithMaterials) {
    const mj = shift.materialsJson;
    if (!mj || !Array.isArray(mj.assignments)) return null;
    return mj.assignments as Array<{ sku: string; qty: number; assignedAt: string }>;
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div className="flex items-start justify-between gap-4">
        <PageHeader
          title="Field Materials"
          description={`Inventory management for ${campaignName}`}
        />
        <div className="flex items-center gap-2 shrink-0 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={handleScanToggle}
            className={scanMode ? "border-[#1D9E75] text-[#1D9E75]" : ""}
          >
            <ScanLine className="h-4 w-4 mr-1.5" />
            {scanMode ? "Cancel Scan" : "Scan SKU"}
          </Button>
          <Link href="/print">
            <Button variant="outline" size="sm">
              <Printer className="h-4 w-4 mr-1.5" />
              Order More
              <ExternalLink className="h-3 w-3 ml-1 opacity-60" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Barcode scan input (hidden unless active) */}
      <AnimatePresence>
        {scanMode && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={spring}
            className="overflow-hidden"
          >
            <Card className="border-[#1D9E75]">
              <CardContent className="p-3 flex items-center gap-3">
                <ScanLine className="h-5 w-5 text-[#1D9E75] shrink-0" />
                <input
                  ref={scanRef}
                  className="flex-1 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
                  placeholder="Scan barcode or type SKU, press Enter…"
                  value={scanInput}
                  onChange={(e) => setScanInput(e.target.value)}
                  onKeyDown={handleScanEnter}
                />
                <button onClick={handleScanToggle}><X className="h-4 w-4 text-muted-foreground" /></button>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Reorder alerts */}
      {(reorderNeeded.length > 0 || lowStock.length > 0) && (
        <div className="rounded-md bg-amber-500/10 border border-amber-500/30 p-3 space-y-1">
          <p className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
            <AlertTriangle className="h-3.5 w-3.5" />
            Reorder Alerts
          </p>
          {reorderNeeded.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-xs text-amber-300">
              <span>{i.sku} — {i.availableQty.toLocaleString()} left (threshold: {i.reorderThreshold!.toLocaleString()})</span>
              <Link href="/print" className="underline opacity-70 hover:opacity-100">Order</Link>
            </div>
          ))}
          {lowStock.map((i) => (
            <div key={i.id} className="flex items-center justify-between text-xs text-[#E24B4A]">
              <span>{i.sku} — OUT OF STOCK</span>
              <Link href="/print" className="underline opacity-70 hover:opacity-100">Order</Link>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="SKUs Available"
          value={available.length}
          icon={<Package className="h-5 w-5" />}
          color="green"
        />
        <StatCard
          label="Total Pieces"
          value={inventory.reduce((s, i) => s + i.availableQty, 0).toLocaleString()}
          icon={<Box className="h-5 w-5" />}
        />
        <StatCard
          label="Reserved"
          value={inventory.reduce((s, i) => s + i.reservedQty, 0).toLocaleString()}
          icon={<PackageCheck className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Reorder Needed"
          value={reorderNeeded.length + lowStock.length}
          icon={<TrendingDown className="h-5 w-5" />}
          color={reorderNeeded.length + lowStock.length > 0 ? "red" : undefined}
        />
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {(["inventory", "shifts", "activity"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={cn(
              "px-4 py-2 text-sm font-medium capitalize border-b-2 transition-colors",
              tab === t
                ? "border-blue-500 text-blue-400"
                : "border-transparent text-muted-foreground hover:text-foreground"
            )}
          >
            {t === "shifts" ? "Per-Shift Allocation" : t === "activity" ? "Activity Log" : "Inventory"}
          </button>
        ))}
      </div>

      {/* ── Inventory tab ─────────────────────────────────────────────────── */}
      {tab === "inventory" && (
        <div className="space-y-4">
          {/* Assignment panel */}
          <Card>
            <CardContent className="p-4 space-y-4">
              <h3 className="font-semibold text-sm">Assign Materials to Shift</h3>
              <FormField label="Target Shift">
                <Select value={selectedShift} onChange={(e) => setSelectedShift(e.target.value)}>
                  <option value="">Select a shift…</option>
                  {shifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {new Date(s.scheduledDate).toLocaleDateString("en-CA")} {s.startTime}
                      {s.ward ? ` (Ward ${s.ward})` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>

              {assignments.length > 0 && (
                <div className="rounded-md border p-3 bg-muted/30 space-y-1">
                  <p className="text-xs font-medium mb-2">Items to assign:</p>
                  {assignments.map((a) => {
                    const item = inventory.find((i) => i.id === a.inventoryId);
                    return item ? (
                      <div key={a.inventoryId} className="flex items-center justify-between text-sm">
                        <span>{item.sku}</span>
                        <span className="font-medium">{a.qty.toLocaleString()} pcs</span>
                      </div>
                    ) : null;
                  })}
                </div>
              )}

              <Button
                onClick={handleAssign}
                disabled={assigning || assignments.length === 0 || !selectedShift}
                className="w-full"
              >
                {assigning ? <Spinner className="h-4 w-4 mr-2" /> : <Layers className="h-4 w-4 mr-2" />}
                Assign {assignments.length > 0 ? `${assignments.length} Item${assignments.length !== 1 ? "s" : ""}` : "Materials"}
              </Button>
            </CardContent>
          </Card>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by SKU or description…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <EmptyState
              icon={<Package className="h-8 w-8" />}
              title="No available inventory"
              description="Receive print orders to stock your field inventory."
            />
          ) : (
            <div className="space-y-2">
              {filtered.map((item) => {
                const qty = getQty(item.id);
                const pct = item.totalQty > 0 ? Math.round((item.availableQty / item.totalQty) * 100) : 0;
                const belowReorder = item.reorderThreshold != null && item.availableQty <= item.reorderThreshold;
                return (
                  <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                    <Card className={cn(
                      qty > 0 ? "border-[#1D9E75]" : "",
                      belowReorder ? "border-amber-500/50" : ""
                    )}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm">{item.sku}</span>
                              <Badge variant="default" className="text-xs">
                                {PRODUCT_LABELS[item.productType] ?? item.productType}
                              </Badge>
                              <Badge
                                variant={pct > 50 ? "success" : pct > 20 ? "warning" : "danger"}
                                className="text-xs"
                              >
                                {item.availableQty.toLocaleString()} avail
                              </Badge>
                              {belowReorder && (
                                <Badge variant="warning" className="text-xs">
                                  <AlertTriangle className="h-3 w-3 mr-0.5" /> Reorder
                                </Badge>
                              )}
                            </div>
                            {item.description && (
                              <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Total: {item.totalQty.toLocaleString()} ·
                              Reserved: {item.reservedQty.toLocaleString()} ·
                              Location: {item.location}
                              {item.reorderThreshold != null ? ` · Reorder @ ${item.reorderThreshold.toLocaleString()}` : ""}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <Input
                              type="number"
                              min={0}
                              max={item.availableQty}
                              className="w-20 text-center"
                              placeholder="0"
                              value={qty || ""}
                              onChange={(e) => setQty(item.id, Number(e.target.value))}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                );
              })}
            </div>
          )}

          {/* Out of stock */}
          {lowStock.length > 0 && (
            <div className="mt-6">
              <h4 className="text-sm font-medium text-muted-foreground mb-2">Out of Stock</h4>
              <div className="space-y-1">
                {lowStock.map((item) => (
                  <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                    <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                    <span>{item.sku}</span>
                    <span className="ml-auto text-xs">{PRODUCT_LABELS[item.productType] ?? item.productType}</span>
                    <Link href="/print" className="text-xs text-blue-400 underline">Order</Link>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Per-shift allocation tab ───────────────────────────────────────── */}
      {tab === "shifts" && (
        <div className="space-y-3">
          {shifts.length === 0 ? (
            <EmptyState
              icon={<BarChart3 className="h-8 w-8" />}
              title="No upcoming shifts"
              description="Shifts scheduled in the next 14 days appear here."
            />
          ) : shifts.map((shift) => {
            const materialLines = shiftMaterialsSummary(shift);
            const isExpanded = expandedShift === shift.id;
            const totalPieces = materialLines?.reduce((s, l) => s + l.qty, 0) ?? 0;
            return (
              <Card key={shift.id}>
                <CardContent className="p-4">
                  <button
                    className="w-full flex items-center justify-between gap-3 text-left"
                    onClick={() => setExpandedShift(isExpanded ? null : shift.id)}
                  >
                    <div>
                      <p className="font-medium text-sm">{shift.name}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {new Date(shift.scheduledDate).toLocaleDateString("en-CA")} · {shift.startTime}
                        {shift.ward ? ` · Ward ${shift.ward}` : ""}
                        {(shift._count?.assignments ?? 0) > 0 ? ` · ${shift._count!.assignments} canvasser${shift._count!.assignments !== 1 ? "s" : ""}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {totalPieces > 0 ? (
                        <span className="text-xs font-medium text-[#1D9E75]">{totalPieces.toLocaleString()} pcs</span>
                      ) : (
                        <span className="text-xs text-muted-foreground">No materials</span>
                      )}
                      {isExpanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={spring}
                        className="overflow-hidden"
                      >
                        <div className="pt-3 mt-3 border-t space-y-2">
                          {!materialLines || materialLines.length === 0 ? (
                            <p className="text-xs text-muted-foreground">No materials assigned yet.</p>
                          ) : materialLines.map((line, idx) => (
                            <div key={idx} className="flex items-center justify-between text-sm">
                              <span>{line.sku}</span>
                              <span className="font-medium text-[#1D9E75]">{line.qty.toLocaleString()} pcs</span>
                            </div>
                          ))}
                          <button
                            className="text-xs text-blue-400 underline mt-1"
                            onClick={() => { setSelectedShift(shift.id); setTab("inventory"); }}
                          >
                            + Assign more materials
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* ── Activity log tab ──────────────────────────────────────────────── */}
      {tab === "activity" && (
        <div className="space-y-2">
          {recentLogs.length === 0 ? (
            <EmptyState
              icon={<Clock className="h-8 w-8" />}
              title="No recent activity"
              description="Inventory changes in the last 7 days appear here."
            />
          ) : recentLogs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 text-sm py-2 border-b border-border/50 last:border-0">
              <span className={cn("capitalize font-medium shrink-0 w-20 text-xs pt-0.5", ACTION_COLORS[log.action] ?? "text-slate-400")}>
                {log.action}
              </span>
              <div className="flex-1 min-w-0">
                <p className="font-medium text-xs">{log.inventory.sku} <span className="font-normal text-muted-foreground">({PRODUCT_LABELS[log.inventory.productType] ?? log.inventory.productType})</span></p>
                {log.notes && <p className="text-xs text-muted-foreground truncate">{log.notes}</p>}
              </div>
              <div className="text-right shrink-0">
                <p className={cn("text-xs font-medium", log.qty < 0 ? "text-[#E24B4A]" : "text-[#1D9E75]")}>
                  {log.qty > 0 ? `+${log.qty.toLocaleString()}` : log.qty.toLocaleString()}
                </p>
                <p className="text-[10px] text-muted-foreground">bal: {log.balance.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
