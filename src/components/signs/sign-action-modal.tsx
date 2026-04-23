"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  CheckCircle2, Trash2, AlertTriangle, HelpCircle,
  Wrench, Camera, X, Loader2, MapPin,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SignStatus = "requested" | "scheduled" | "installed" | "removed" | "declined" | "damaged" | "missing" | "needs_repair";
type SignEventAction = "install" | "remove" | "move" | "damage" | "missing" | "repair" | "audit" | "photo_added" | "notes_updated" | "reassigned";

interface Action {
  action: SignEventAction;
  label: string;
  icon: React.ReactNode;
  color: string;
  newStatus?: SignStatus;
}

interface Props {
  signId: string;
  signAddress: string;
  currentStatus: SignStatus;
  campaignId: string;
  routeId?: string;
  fieldTargetId?: string;
  onClose: () => void;
  onSuccess: (result: { newStatus: string; eventId: string }) => void;
}

// ── Status → available actions ────────────────────────────────────────────────

const ALL_ACTIONS: Action[] = [
  { action: "install",  label: "Installed",  icon: <CheckCircle2 className="w-6 h-6" />, color: "bg-green-50 border-green-200 text-green-700", newStatus: "installed" },
  { action: "remove",   label: "Removed",    icon: <Trash2 className="w-6 h-6" />,       color: "bg-gray-50 border-gray-200 text-gray-600",   newStatus: "removed" },
  { action: "damage",   label: "Damaged",    icon: <AlertTriangle className="w-6 h-6" />, color: "bg-amber-50 border-amber-200 text-amber-700", newStatus: "damaged" },
  { action: "missing",  label: "Missing",    icon: <HelpCircle className="w-6 h-6" />,   color: "bg-red-50 border-red-200 text-red-600",      newStatus: "missing" },
  { action: "repair",   label: "Repaired",   icon: <Wrench className="w-6 h-6" />,       color: "bg-blue-50 border-blue-200 text-blue-700",   newStatus: "installed" },
  { action: "audit",    label: "Audit",      icon: <Camera className="w-6 h-6" />,       color: "bg-purple-50 border-purple-200 text-purple-700" },
];

const ACTIONS_BY_STATUS: Record<SignStatus, SignEventAction[]> = {
  requested:    ["install", "damage", "missing", "audit"],
  scheduled:    ["install", "damage", "missing", "audit"],
  installed:    ["audit", "damage", "missing", "remove"],
  removed:      ["audit"],
  declined:     ["audit"],
  damaged:      ["repair", "missing", "remove", "audit"],
  missing:      ["install", "audit"],
  needs_repair: ["repair", "damage", "remove", "audit"],
};

// ── Main ──────────────────────────────────────────────────────────────────────

export function SignActionModal({
  signId, signAddress, currentStatus, campaignId,
  routeId, fieldTargetId, onClose, onSuccess,
}: Props) {
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [gpsCoords, setGpsCoords] = useState<{ lat: number; lng: number } | null>(null);

  const availableActionKeys = ACTIONS_BY_STATUS[currentStatus] ?? [];
  const availableActions = ALL_ACTIONS.filter((a) => availableActionKeys.includes(a.action));

  useEffect(() => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      (pos) => setGpsCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => {},
      { timeout: 5000, maximumAge: 30000 }
    );
  }, []);

  async function handleAction(action: Action) {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/signs/${signId}/events`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          action: action.action,
          notes: notes.trim() || null,
          lat: gpsCoords?.lat ?? null,
          lng: gpsCoords?.lng ?? null,
          routeId: routeId ?? null,
          fieldTargetId: fieldTargetId ?? null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Action failed");
      onSuccess({ newStatus: data.event.newStatus ?? action.newStatus ?? currentStatus, eventId: data.event.id });
    } catch (err) {
      setError((err as Error).message);
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 px-4">
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 40 }}
          transition={{ type: "spring", stiffness: 300, damping: 30 }}
          className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-start justify-between p-4 border-b border-gray-100">
            <div>
              <p className="font-semibold text-gray-900 text-sm">Log Field Action</p>
              <div className="flex items-center gap-1 mt-0.5">
                <MapPin className="w-3 h-3 text-gray-400" />
                <p className="text-xs text-gray-500 truncate max-w-[220px]">{signAddress}</p>
              </div>
              {gpsCoords && (
                <p className="text-xs text-[#1D9E75] mt-0.5">GPS captured</p>
              )}
            </div>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-gray-100">
              <X className="w-4 h-4 text-gray-500" />
            </button>
          </div>

          {/* Action grid */}
          <div className="p-4 grid grid-cols-2 gap-2">
            {availableActions.map((action) => (
              <button
                key={action.action}
                onClick={() => handleAction(action)}
                disabled={saving}
                className={`flex flex-col items-center justify-center gap-2 p-4 rounded-xl border-2 font-medium text-sm transition-all min-h-[80px]
                  ${saving ? "opacity-50 cursor-not-allowed" : "active:scale-95 hover:shadow-md"}
                  ${action.color}`}
              >
                {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : action.icon}
                {action.label}
              </button>
            ))}
          </div>

          {/* Notes */}
          <div className="px-4 pb-4">
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes (location details, damage description…)"
              className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#0A2342]/20 resize-none"
            />
            {error && (
              <p className="mt-1 text-xs text-red-500">{error}</p>
            )}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
