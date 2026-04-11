"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Package, PackageCheck, AlertTriangle, Layers,
  ChevronRight, Search, Plus, Box,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, StatCard,
} from "@/components/ui";
import { toast } from "sonner";
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
}

interface Props {
  campaignId: string;
  campaignName: string;
  inventory: InventoryRow[];
  shifts: ShiftWithMaterials[];
}

interface AssignmentLine {
  inventoryId: string;
  qty: number;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MaterialsClient({ campaignId, campaignName, inventory, shifts }: Props) {
  const [search, setSearch] = useState("");
  const [selectedShift, setSelectedShift] = useState<string>("");
  const [assignments, setAssignments] = useState<AssignmentLine[]>([]);
  const [assigning, setAssigning] = useState(false);

  const lowStock = inventory.filter((i) => i.availableQty === 0);
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
        body: JSON.stringify({
          campaignId,
          shiftId: selectedShift,
          assignments,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Assignment failed");
        return;
      }
      toast.success(`${assignments.length} item${assignments.length !== 1 ? "s" : ""} assigned to shift`);
      setAssignments([]);
      setSelectedShift("");
    } catch {
      toast.error("Network error");
    } finally {
      setAssigning(false);
    }
  }

  const PRODUCT_TYPE_LABELS: Partial<Record<PrintProductType, string>> = {
    flyer:           "Flyer",
    door_hanger:     "Door Hanger",
    lawn_sign:       "Lawn Sign",
    mailer_postcard: "Postcard",
    banner:          "Banner",
    palm_card:       "Palm Card",
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <PageHeader
        title="Field Materials"
        description={`Assign print inventory to field shifts for ${campaignName}`}
      />

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
          value={inventory.reduce((sum, i) => sum + i.availableQty, 0).toLocaleString()}
          icon={<Box className="h-5 w-5" />}
        />
        <StatCard
          label="Reserved"
          value={inventory.reduce((sum, i) => sum + i.reservedQty, 0).toLocaleString()}
          icon={<PackageCheck className="h-5 w-5" />}
          color="blue"
        />
        <StatCard
          label="Out of Stock"
          value={lowStock.length}
          icon={<AlertTriangle className="h-5 w-5" />}
          color={lowStock.length > 0 ? "red" : undefined}
        />
      </div>

      {/* Assignment panel */}
      <Card>
        <CardContent className="p-4 space-y-4">
          <h3 className="font-semibold text-sm">Assign Materials to Shift</h3>

          <FormField label="Target Shift">
            <Select
              value={selectedShift}
              onChange={(e) => setSelectedShift(e.target.value)}
            >
              <option value="">Select a shift...</option>
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

      {/* Inventory list */}
      <div>
        <div className="flex items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by SKU or description..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
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
              return (
                <motion.div key={item.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}>
                  <Card className={qty > 0 ? "border-[#1D9E75]" : ""}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-medium text-sm">{item.sku}</span>
                            <Badge variant="default" className="text-xs">
                              {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
                            </Badge>
                            <Badge
                              variant={pct > 50 ? "success" : pct > 20 ? "warning" : "danger"}
                              className="text-xs"
                            >
                              {item.availableQty.toLocaleString()} avail
                            </Badge>
                          </div>
                          {item.description && (
                            <p className="text-xs text-muted-foreground mt-0.5">{item.description}</p>
                          )}
                          <p className="text-xs text-muted-foreground mt-1">
                            Total: {item.totalQty.toLocaleString()} ·
                            Reserved: {item.reservedQty.toLocaleString()} ·
                            Location: {item.location}
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

        {/* Out of stock items */}
        {lowStock.length > 0 && (
          <div className="mt-6">
            <h4 className="text-sm font-medium text-muted-foreground mb-2">Out of Stock</h4>
            <div className="space-y-1">
              {lowStock.map((item) => (
                <div key={item.id} className="flex items-center gap-2 text-sm text-muted-foreground p-2 border rounded-md">
                  <AlertTriangle className="h-3.5 w-3.5 text-destructive" />
                  <span>{item.sku}</span>
                  <span className="ml-auto text-xs">
                    {PRODUCT_TYPE_LABELS[item.productType] ?? item.productType}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
