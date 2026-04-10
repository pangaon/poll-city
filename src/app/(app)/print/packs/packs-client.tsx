"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Package, Plus, ChevronRight, CheckCircle2, AlertTriangle,
  Clock, Send, RotateCcw, Loader2, X, Sparkles, MapPin,
  Users, Calendar, FileText,
} from "lucide-react";
import { Button } from "@/components/ui";
import { toast } from "sonner";
import { PrintProductType } from "@prisma/client";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;

type PackType = "walk_kit" | "sign_install_kit" | "lit_drop_kit" | "event_kit" | "gotv_kit";
type PackStatus = "draft" | "fulfilled" | "distributed" | "returned" | "cancelled";

interface PackItem {
  id: string;
  productType: PrintProductType;
  requiredQty: number;
  fulfilledQty: number;
  inventoryId: string | null;
  inventory?: {
    id: string;
    sku: string;
    availableQty: number;
  } | null;
  inventorySufficient?: boolean;
  inventoryAvailable?: number;
  shortfall?: number;
}

interface Pack {
  id: string;
  name: string;
  packType: PackType;
  targetCount: number;
  bufferPct: number;
  turfId: string | null;
  pollNumber: string | null;
  fieldAssignmentId: string | null;
  eventId: string | null;
  status: PackStatus;
  notes: string | null;
  generatedAt: string | null;
  distributedAt: string | null;
  items: PackItem[];
}

const PACK_TYPE_LABELS: Record<PackType, string> = {
  walk_kit: "Walk Kit",
  sign_install_kit: "Sign Install Kit",
  lit_drop_kit: "Lit Drop Kit",
  event_kit: "Event Kit",
  gotv_kit: "GOTV Kit",
};

const PACK_TYPE_ICONS: Record<PackType, React.ElementType> = {
  walk_kit: MapPin,
  sign_install_kit: Users,
  lit_drop_kit: FileText,
  event_kit: Calendar,
  gotv_kit: CheckCircle2,
};

const PACK_TYPE_COLORS: Record<PackType, string> = {
  walk_kit: "from-blue-500 to-cyan-400",
  sign_install_kit: "from-emerald-500 to-green-400",
  lit_drop_kit: "from-amber-500 to-orange-400",
  event_kit: "from-purple-500 to-violet-400",
  gotv_kit: "from-red-500 to-rose-400",
};

const PRODUCT_LABELS: Record<string, string> = {
  flyer: "Flyers",
  door_hanger: "Door Hangers",
  lawn_sign: "Lawn Signs",
  palm_card: "Palm Cards",
  mailer_postcard: "Postcards",
};

const STATUS_CONFIG: Record<PackStatus, { label: string; color: string; dotColor: string }> = {
  draft: { label: "Draft", color: "text-gray-500 bg-gray-100", dotColor: "bg-gray-400" },
  fulfilled: { label: "Fulfilled", color: "text-[#1D9E75] bg-emerald-50", dotColor: "bg-[#1D9E75]" },
  distributed: { label: "Distributed", color: "text-blue-600 bg-blue-50", dotColor: "bg-blue-500" },
  returned: { label: "Returned", color: "text-purple-600 bg-purple-50", dotColor: "bg-purple-500" },
  cancelled: { label: "Cancelled", color: "text-gray-400 bg-gray-100", dotColor: "bg-gray-300" },
};

// ── Generate Modal ─────────────────────────────────────────────────────────────

function GenerateModal({ campaignId, onClose, onGenerated }: {
  campaignId: string;
  onClose: () => void;
  onGenerated: (pack: Pack) => void;
}) {
  const [step, setStep] = useState<"type" | "scope" | "review">("type");
  const [packType, setPackType] = useState<PackType>("walk_kit");
  const [scope, setScope] = useState({ pollNumber: "", turfId: "", bufferPct: "20" });
  const [result, setResult] = useState<Pack | null>(null);
  const [hasShortfall, setHasShortfall] = useState(false);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/print/packs/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          packType,
          ...(scope.turfId && { turfId: scope.turfId }),
          ...(scope.pollNumber && !scope.turfId && { pollNumber: scope.pollNumber }),
          bufferPct: parseFloat(scope.bufferPct) / 100,
          productTypes: [],  // server picks defaults per pack type
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      setResult(data.data);
      setHasShortfall(data.hasShortfall);
      setStep("review");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const confirm = () => {
    if (result) {
      onGenerated(result);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/50">
      <motion.div
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 40 }}
        transition={SPRING}
        className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[#1D9E75]" />
            <h2 className="font-bold text-[#0A2342]">Generate Print Pack</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100">
            <X className="w-4 h-4 text-gray-500" />
          </button>
        </div>

        <AnimatePresence mode="wait">
          {step === "type" && (
            <motion.div key="type" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-5">
              <p className="text-sm text-gray-600 mb-4">What are you packing materials for?</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(PACK_TYPE_LABELS) as [PackType, string][]).map(([type, label]) => {
                  const Icon = PACK_TYPE_ICONS[type];
                  return (
                    <button
                      key={type}
                      onClick={() => setPackType(type)}
                      className={`p-3 rounded-xl border-2 text-left transition-all ${
                        packType === type
                          ? "border-[#1D9E75] bg-emerald-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${PACK_TYPE_COLORS[type]} flex items-center justify-center mb-2`}>
                        <Icon className="w-4 h-4 text-white" />
                      </div>
                      <p className="text-xs font-semibold text-[#0A2342]">{label}</p>
                    </button>
                  );
                })}
              </div>
              <Button
                onClick={() => setStep("scope")}
                className="w-full mt-4 h-12 bg-[#0A2342] hover:bg-[#0d2d57] text-white font-bold"
              >
                Next — Set Scope <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </motion.div>
          )}

          {step === "scope" && (
            <motion.div key="scope" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-5 space-y-4">
              <p className="text-sm text-gray-600">
                Define the scope for <strong>{PACK_TYPE_LABELS[packType]}</strong>.
              </p>
              {packType !== "sign_install_kit" && (
                <>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Poll Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 042"
                      value={scope.pollNumber}
                      onChange={(e) => setScope((s) => ({ ...s, pollNumber: e.target.value }))}
                      className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
                    <div className="flex-1 h-px bg-gray-200" />
                    <span>or</span>
                    <div className="flex-1 h-px bg-gray-200" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-700 block mb-1">Turf ID <span className="font-normal text-gray-400">(optional)</span></label>
                    <input
                      type="text"
                      placeholder="Paste turf ID"
                      value={scope.turfId}
                      onChange={(e) => setScope((s) => ({ ...s, turfId: e.target.value }))}
                      className="w-full h-11 px-3 border-2 border-gray-300 rounded-lg focus:border-[#1D9E75] focus:outline-none text-sm"
                    />
                  </div>
                </>
              )}
              {packType === "sign_install_kit" && (
                <div className="rounded-lg bg-blue-50 border border-blue-200 p-3 text-sm text-blue-800">
                  Sign kits are generated from all pending sign requests in your campaign. No scope needed.
                </div>
              )}
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  Buffer <span className="font-normal text-gray-400">(extra %)</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={50}
                    step={5}
                    value={scope.bufferPct}
                    onChange={(e) => setScope((s) => ({ ...s, bufferPct: e.target.value }))}
                    className="flex-1"
                  />
                  <span className="text-sm font-bold text-[#0A2342] w-10 text-right">{scope.bufferPct}%</span>
                </div>
              </div>
              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("type")} className="flex-1 h-11">Back</Button>
                <Button
                  onClick={generate}
                  disabled={loading || (packType !== "sign_install_kit" && !scope.pollNumber && !scope.turfId)}
                  className="flex-1 h-11 bg-[#1D9E75] hover:bg-[#178a65] text-white font-bold"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Generate Pack"}
                </Button>
              </div>
            </motion.div>
          )}

          {step === "review" && result && (
            <motion.div key="review" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }} className="p-5">
              <div className="mb-4">
                <p className="font-bold text-[#0A2342]">{result.name}</p>
                <p className="text-xs text-gray-500 mt-0.5">
                  {result.targetCount.toLocaleString()} target × {Math.round(result.bufferPct * 100)}% buffer
                </p>
              </div>
              <div className="space-y-2 mb-4">
                {result.items.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-3 rounded-lg border border-gray-100">
                    <div>
                      <p className="text-sm font-semibold text-[#0A2342]">
                        {PRODUCT_LABELS[item.productType] ?? item.productType}
                      </p>
                      <p className="text-xs text-gray-500">{item.requiredQty.toLocaleString()} units required</p>
                    </div>
                    {(item as PackItem & { inventorySufficient?: boolean; shortfall?: number }).inventorySufficient ? (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#1D9E75]">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Covered
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-semibold text-[#E24B4A]">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        {(item as PackItem & { shortfall?: number }).shortfall?.toLocaleString()} short
                      </span>
                    )}
                  </div>
                ))}
              </div>
              {hasShortfall && (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-3 text-xs text-amber-800 mb-4">
                  <strong>Shortfall detected.</strong> Order more materials before distributing this pack.
                </div>
              )}
              <div className="flex gap-3">
                <Button variant="outline" onClick={onClose} className="flex-1 h-11">Discard</Button>
                <Button onClick={confirm} className="flex-1 h-11 bg-[#0A2342] hover:bg-[#0d2d57] text-white font-bold">
                  Save Pack
                </Button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}

// ── Pack Card ─────────────────────────────────────────────────────────────────

function PackCard({ pack, idx, onStatusChange }: {
  pack: Pack;
  idx: number;
  onStatusChange: (id: string, status: PackStatus) => void;
}) {
  const Icon = PACK_TYPE_ICONS[pack.packType];
  const status = STATUS_CONFIG[pack.status];
  const [updating, setUpdating] = useState(false);

  const transition = async (newStatus: PackStatus) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/print/packs/${pack.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignId: pack.fieldAssignmentId ? undefined : "", status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed");
      onStatusChange(pack.id, newStatus);
      toast.success(`Pack ${newStatus}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed");
    } finally {
      setUpdating(false);
    }
  };

  const shortfallItems = pack.items.filter(
    (i) => (i as PackItem & { shortfall?: number }).shortfall !== undefined
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.04, ...SPRING }}
      className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-sm transition-shadow"
    >
      <div className="flex items-start gap-3 mb-3">
        <div className={`w-10 h-10 rounded-lg bg-gradient-to-br ${PACK_TYPE_COLORS[pack.packType]} flex items-center justify-center flex-shrink-0`}>
          <Icon className="w-5 h-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-[#0A2342] text-sm truncate">{pack.name}</p>
          <p className="text-xs text-gray-500 mt-0.5">
            {PACK_TYPE_LABELS[pack.packType]} · {pack.targetCount.toLocaleString()} target
          </p>
        </div>
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full flex-shrink-0 ${status.color}`}>
          {status.label}
        </span>
      </div>

      {/* Items summary */}
      <div className="space-y-1.5 mb-3">
        {pack.items.map((item) => (
          <div key={item.id} className="flex items-center justify-between text-xs">
            <span className="text-gray-600">{PRODUCT_LABELS[item.productType] ?? item.productType}</span>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-[#0A2342]">{item.requiredQty.toLocaleString()}</span>
              {item.inventoryId ? (
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1D9E75]" />
              ) : (
                <Clock className="w-3.5 h-3.5 text-gray-400" />
              )}
            </div>
          </div>
        ))}
      </div>

      {shortfallItems.length > 0 && (
        <div className="rounded-lg bg-amber-50 border border-amber-200 p-2 mb-3">
          <p className="text-xs text-amber-800 font-semibold flex items-center gap-1">
            <AlertTriangle className="w-3.5 h-3.5" />
            {shortfallItems.length} product{shortfallItems.length > 1 ? "s" : ""} short — order more before distributing
          </p>
        </div>
      )}

      {/* Action buttons */}
      {pack.status === "draft" && (
        <button
          onClick={() => transition("fulfilled")}
          disabled={updating}
          className="w-full h-9 text-xs font-semibold rounded-lg bg-[#1D9E75] hover:bg-[#178a65] text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
          Mark Fulfilled
        </button>
      )}
      {pack.status === "fulfilled" && (
        <button
          onClick={() => transition("distributed")}
          disabled={updating}
          className="w-full h-9 text-xs font-semibold rounded-lg bg-[#0A2342] hover:bg-[#0d2d57] text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
          Distribute Pack
        </button>
      )}
      {pack.status === "distributed" && (
        <button
          onClick={() => transition("returned")}
          disabled={updating}
          className="w-full h-9 text-xs font-semibold rounded-lg border border-[#1D9E75] text-[#1D9E75] hover:bg-[#1D9E75]/5 transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
        >
          {updating ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
          Return Unused
        </button>
      )}
    </motion.div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────

export default function PacksClient({ campaignId }: { campaignId: string }) {
  const [packs, setPacks] = useState<Pack[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGenerate, setShowGenerate] = useState(false);
  const [filter, setFilter] = useState<"all" | PackStatus>("all");

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/print/packs?campaignId=${campaignId}`);
      const data = await res.json();
      setPacks(data.data ?? []);
    } catch {
      toast.error("Failed to load print packs");
    } finally {
      setLoading(false);
    }
  }, [campaignId]);

  useEffect(() => { load(); }, [load]);

  const handleStatusChange = (id: string, status: PackStatus) => {
    setPacks((prev) => prev.map((p) => p.id === id ? { ...p, status } : p));
  };

  const filtered = filter === "all" ? packs : packs.filter((p) => p.status === filter);

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 pb-[env(safe-area-inset-bottom)]">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0A2342]">Print Packs</h1>
          <p className="text-sm text-gray-500 mt-0.5">Auto-generated material kits for field operations</p>
        </div>
        <motion.div whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
          <Button
            onClick={() => setShowGenerate(true)}
            className="bg-[#1D9E75] hover:bg-[#178a65] text-white font-bold h-11 px-4 gap-2"
          >
            <Plus className="w-4 h-4" /> Generate Pack
          </Button>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[
          { id: "all", label: "All" },
          { id: "draft", label: "Draft" },
          { id: "fulfilled", label: "Fulfilled" },
          { id: "distributed", label: "Distributed" },
          { id: "returned", label: "Returned" },
        ].map(({ id, label }) => (
          <button
            key={id}
            onClick={() => setFilter(id as "all" | PackStatus)}
            className={`h-9 px-4 rounded-full text-xs font-semibold whitespace-nowrap transition-colors ${
              filter === id
                ? "bg-[#0A2342] text-white"
                : "border border-gray-200 text-gray-600 hover:border-gray-300 bg-white"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[#1D9E75] animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-center py-20"
        >
          <Package className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="font-bold text-[#0A2342] text-lg">No print packs yet</p>
          <p className="text-sm text-gray-500 mt-1 mb-6">
            Generate a pack to auto-calculate materials for a turf or poll.
          </p>
          <Button
            onClick={() => setShowGenerate(true)}
            className="bg-[#1D9E75] hover:bg-[#178a65] text-white font-bold"
          >
            <Plus className="w-4 h-4 mr-2" /> Generate First Pack
          </Button>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map((pack, idx) => (
            <PackCard
              key={pack.id}
              pack={pack}
              idx={idx}
              onStatusChange={handleStatusChange}
            />
          ))}
        </div>
      )}

      {/* Generate Modal */}
      <AnimatePresence>
        {showGenerate && (
          <GenerateModal
            campaignId={campaignId}
            onClose={() => setShowGenerate(false)}
            onGenerated={(pack) => {
              setPacks((prev) => [pack, ...prev]);
              toast.success(`Pack "${pack.name}" created`);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
