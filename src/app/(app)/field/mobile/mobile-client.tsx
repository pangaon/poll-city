"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  MapPin, CheckCircle2, XCircle, PhoneOff, AlertTriangle,
  MessageSquare, Clock, Download, ChevronDown, ChevronUp,
  Radio, Wifi, WifiOff, Battery, Zap, Navigation,
  NavigationOff,
} from "lucide-react";
import {
  Badge, Button, Card, CardContent, EmptyState,
  FormField, Input, PageHeader, Select, Spinner, Textarea,
} from "@/components/ui";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { FieldShiftType, FieldShiftStatus } from "@prisma/client";

// ── Types ─────────────────────────────────────────────────────────────────────

export interface ActiveShiftRow {
  id: string;
  campaignId: string;
  name: string;
  shiftType: FieldShiftType;
  status: FieldShiftStatus;
  scheduledDate: string;
  startTime: string;
  endTime: string;
  ward: string | null;
  pollNumber: string | null;
  meetingPoint: string | null;
  meetingAddress: string | null;
  notes: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
  _count: { attempts: number };
  turf: { id: string; name: string } | null;
  route: { id: string; name: string } | null;
  fieldProgram: { id: string; name: string } | null;
}

interface QueuedAttempt {
  id: string;
  campaignId: string;
  shiftId: string;
  outcome: Outcome;
  outcomeNotes?: string;
  latitude?: number;
  longitude?: number;
  queuedAt: string;
}

interface Props {
  campaignId: string;
  campaignName: string;
  activeShifts: ActiveShiftRow[];
  doorsToday?: number;
}

// ── Outcome definitions ───────────────────────────────────────────────────────

const OUTCOMES = [
  { value: "supporter",    label: "Supporter",   icon: CheckCircle2,   color: "bg-[#1D9E75] text-white" },
  { value: "undecided",    label: "Undecided",   icon: MessageSquare,  color: "bg-amber-500 text-white" },
  { value: "not_home",     label: "Not Home",    icon: PhoneOff,       color: "bg-slate-400 text-white" },
  { value: "no_answer",    label: "No Answer",   icon: Clock,          color: "bg-slate-500 text-white" },
  { value: "refused",      label: "Refused",     icon: XCircle,        color: "bg-orange-500 text-white" },
  { value: "opposition",   label: "Opposition",  icon: XCircle,        color: "bg-[#E24B4A] text-white" },
  { value: "inaccessible", label: "No Access",   icon: AlertTriangle,  color: "bg-slate-600 text-white" },
  { value: "bad_data",     label: "Bad Data",    icon: AlertTriangle,  color: "bg-purple-500 text-white" },
] as const;

type Outcome = typeof OUTCOMES[number]["value"];

const QUEUE_KEY = "pollcity_field_queue";

// ── GPS hook ──────────────────────────────────────────────────────────────────

type GpsState = "off" | "acquiring" | "high" | "medium" | "low" | "denied";

function useGps(enabled: boolean) {
  const [state, setState] = useState<GpsState>("off");
  const [pos, setPos] = useState<{ lat: number; lng: number } | null>(null);
  const watchId = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled || typeof navigator === "undefined" || !navigator.geolocation) {
      setState("off");
      return;
    }
    setState("acquiring");
    watchId.current = navigator.geolocation.watchPosition(
      (p) => {
        setPos({ lat: p.coords.latitude, lng: p.coords.longitude });
        const acc = p.coords.accuracy;
        setState(acc <= 20 ? "high" : acc <= 100 ? "medium" : "low");
      },
      () => setState("denied"),
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 15000 },
    );
    return () => {
      if (watchId.current != null) navigator.geolocation.clearWatch(watchId.current);
    };
  }, [enabled]);

  return { state, pos };
}

// ── Offline queue helpers ─────────────────────────────────────────────────────

function loadQueue(): QueuedAttempt[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    return raw ? (JSON.parse(raw) as QueuedAttempt[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(q: QueuedAttempt[]) {
  try { localStorage.setItem(QUEUE_KEY, JSON.stringify(q)); } catch { /* noop */ }
}

// ── Main component ────────────────────────────────────────────────────────────

export default function MobileFieldClient({ campaignId, campaignName, activeShifts, doorsToday = 0 }: Props) {
  const [selectedShift, setSelectedShift] = useState<string>(activeShifts[0]?.id ?? "");
  const [address, setAddress] = useState("");
  const [selectedOutcome, setSelectedOutcome] = useState<Outcome | null>(null);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [sessionDoors, setSessionDoors] = useState(0);
  const [showInstructions, setShowInstructions] = useState(false);
  const [batteryMode, setBatteryMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedAttempt[]>([]);
  const [syncing, setSyncing] = useState(false);
  const { state: gpsState, pos: gpsPos } = useGps(!batteryMode);

  // Init online state + offline queue from localStorage
  useEffect(() => {
    setIsOnline(navigator.onLine);
    setQueue(loadQueue());
    const up = () => setIsOnline(true);
    const down = () => setIsOnline(false);
    window.addEventListener("online", up);
    window.addEventListener("offline", down);
    return () => { window.removeEventListener("online", up); window.removeEventListener("offline", down); };
  }, []);

  // Auto-flush queue when coming back online
  useEffect(() => {
    if (isOnline && queue.length > 0) flushQueue();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOnline]);

  const flushQueue = useCallback(async () => {
    if (syncing) return;
    const pending = loadQueue();
    if (pending.length === 0) return;
    setSyncing(true);
    const failed: QueuedAttempt[] = [];
    for (const item of pending) {
      try {
        const res = await fetch("/api/field/attempts", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...item, source: "manual", isOfflineSynced: true }),
        });
        if (!res.ok) failed.push(item);
      } catch {
        failed.push(item);
      }
    }
    saveQueue(failed);
    setQueue(failed);
    setSyncing(false);
    const synced = pending.length - failed.length;
    if (synced > 0) toast.success(`${synced} offline door${synced !== 1 ? "s" : ""} synced`);
    if (failed.length > 0) toast.error(`${failed.length} door${failed.length !== 1 ? "s" : ""} failed to sync`);
  }, [syncing]);

  const shift = activeShifts.find((s) => s.id === selectedShift);

  async function handleSubmit() {
    if (!selectedShift) { toast.error("Select a shift"); return; }
    if (!selectedOutcome) { toast.error("Tap an outcome"); return; }

    const notesParts = [address.trim(), notes.trim()].filter(Boolean);
    const attempt: QueuedAttempt = {
      id: crypto.randomUUID(),
      campaignId,
      shiftId: selectedShift,
      outcome: selectedOutcome,
      ...(notesParts.length > 0 ? { outcomeNotes: notesParts.join(" | ") } : {}),
      ...(gpsPos && !batteryMode ? { latitude: gpsPos.lat, longitude: gpsPos.lng } : {}),
      queuedAt: new Date().toISOString(),
    };

    if (!isOnline) {
      const updated = [...loadQueue(), attempt];
      saveQueue(updated);
      setQueue(updated);
      setSessionDoors((n) => n + 1);
      setAddress("");
      setSelectedOutcome(null);
      setNotes("");
      toast("Saved offline — will sync when connected", { icon: "📵" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/field/attempts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...attempt, source: "manual" }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error ?? "Failed to record");
        return;
      }
      setSessionDoors((n) => n + 1);
      setAddress("");
      setSelectedOutcome(null);
      setNotes("");
      toast.success("Door recorded");
    } catch {
      // Network failed — save to offline queue instead of losing the record
      const updated = [...loadQueue(), attempt];
      saveQueue(updated);
      setQueue(updated);
      setSessionDoors((n) => n + 1);
      setAddress("");
      setSelectedOutcome(null);
      setNotes("");
      toast("Saved offline — will sync when connected", { icon: "📵" });
    } finally {
      setSubmitting(false);
    }
  }

  const spring = batteryMode ? {} : { type: "spring" as const, stiffness: 300, damping: 30 };

  const GpsIcon = gpsState === "denied" || gpsState === "off" ? NavigationOff : Navigation;
  const gpsColor =
    gpsState === "high"     ? "text-[#1D9E75]" :
    gpsState === "medium"   ? "text-amber-500" :
    gpsState === "low"      ? "text-orange-500" :
    gpsState === "acquiring" ? "text-blue-400 animate-pulse" :
    "text-slate-500";
  const gpsLabel =
    gpsState === "high"     ? "GPS: Good" :
    gpsState === "medium"   ? "GPS: Fair" :
    gpsState === "low"      ? "GPS: Weak" :
    gpsState === "acquiring" ? "GPS: Locating…" :
    gpsState === "denied"   ? "GPS: Denied" :
    "GPS: Off";

  return (
    <div className="min-h-screen bg-background p-3 space-y-4 max-w-sm mx-auto pb-8">
      <PageHeader
        title="Field Entry"
        description={campaignName}
      />

      {/* Status bar — online/offline, GPS, battery mode */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className={cn("inline-flex items-center gap-1 text-xs font-medium", isOnline ? "text-[#1D9E75]" : "text-[#E24B4A]")}>
          {isOnline ? <Wifi className="h-3.5 w-3.5" /> : <WifiOff className="h-3.5 w-3.5" />}
          {isOnline ? "Online" : "Offline"}
        </span>
        {!batteryMode && (
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium", gpsColor)}>
            <GpsIcon className="h-3.5 w-3.5" />
            {gpsLabel}
          </span>
        )}
        <button
          onClick={() => setBatteryMode((v) => !v)}
          className={cn(
            "ml-auto inline-flex items-center gap-1 text-xs font-medium rounded-full px-2 py-0.5 border transition-colors",
            batteryMode
              ? "bg-amber-500/10 border-amber-500/40 text-amber-400"
              : "bg-background border-slate-700 text-slate-400 hover:text-slate-200"
          )}
        >
          {batteryMode ? <Zap className="h-3 w-3" /> : <Battery className="h-3 w-3" />}
          {batteryMode ? "Battery Mode" : "Normal Mode"}
        </button>
      </div>

      {/* Offline queue banner */}
      {queue.length > 0 && (
        <div className="flex items-center justify-between rounded-md bg-amber-500/10 border border-amber-500/30 px-3 py-2 text-xs">
          <span className="text-amber-400 font-medium">
            {queue.length} door{queue.length !== 1 ? "s" : ""} queued offline
          </span>
          {isOnline && (
            <button
              onClick={flushQueue}
              disabled={syncing}
              className="text-amber-400 underline disabled:opacity-50"
            >
              {syncing ? "Syncing…" : "Sync now"}
            </button>
          )}
        </div>
      )}

      {/* Today's stats */}
      <div className="grid grid-cols-2 gap-2 text-center">
        <Card>
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-[#1D9E75]">{doorsToday + sessionDoors}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">Doors Today</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-3">
            <p className="text-2xl font-bold text-white">{sessionDoors}</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wide mt-0.5">This Session</p>
          </CardContent>
        </Card>
      </div>

      {activeShifts.length === 0 ? (
        <EmptyState
          icon={<Radio className="h-8 w-8" />}
          title="No active shifts today"
          description="No open or in-progress shifts scheduled for today."
        />
      ) : (
        <>
          {/* Shift selector */}
          <Card>
            <CardContent className="p-3 space-y-3">
              <FormField label="Your Shift">
                <Select
                  value={selectedShift}
                  onChange={(e) => setSelectedShift(e.target.value)}
                >
                  {activeShifts.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.startTime}
                      {s.ward ? ` · Ward ${s.ward}` : ""}
                    </option>
                  ))}
                </Select>
              </FormField>

              {shift && (
                <div>
                  <button
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    onClick={() => setShowInstructions((v) => !v)}
                  >
                    {showInstructions ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
                    Shift details
                  </button>
                  <AnimatePresence>
                    {showInstructions && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={spring}
                        className="overflow-hidden"
                      >
                        <div className="mt-2 text-xs space-y-1 text-muted-foreground border-t pt-2">
                          {shift.meetingPoint && <p><MapPin className="inline h-3 w-3 mr-1" />{shift.meetingPoint}</p>}
                          {shift.meetingAddress && <p>{shift.meetingAddress}</p>}
                          {shift.turf && <p>Turf: {shift.turf.name}</p>}
                          {shift.route && <p>Route: {shift.route.name}</p>}
                          {shift.notes && <p>{shift.notes}</p>}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Door entry form */}
          <Card>
            <CardContent className="p-3 space-y-4">
              <FormField label="Address (optional)">
                <Input
                  placeholder="123 Main Street"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  inputMode="text"
                  autoComplete="street-address"
                />
              </FormField>

              {/* Big outcome buttons — designed for thumbs */}
              <div>
                <p className="text-xs font-medium mb-2 text-muted-foreground">Result</p>
                <div className="grid grid-cols-2 gap-2">
                  {OUTCOMES.map((o) => {
                    const Icon = o.icon;
                    const isSelected = selectedOutcome === o.value;
                    return (
                      <button
                        key={o.value}
                        onClick={() => setSelectedOutcome(o.value as Outcome)}
                        className={cn(
                          "flex items-center gap-2 rounded-lg p-3 text-sm font-medium transition-all border-2",
                          isSelected
                            ? `${o.color} border-transparent ${batteryMode ? "" : "scale-95"}`
                            : "border-border bg-background hover:border-muted-foreground/50"
                        )}
                      >
                        <Icon className="h-5 w-5 flex-shrink-0" />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <FormField label="Notes (optional)">
                <Textarea
                  placeholder="Issues raised, follow-up needed…"
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </FormField>

              <Button
                className="w-full h-12 text-base"
                onClick={handleSubmit}
                disabled={submitting || !selectedOutcome}
              >
                {submitting
                  ? <Spinner className="h-5 w-5 mr-2" />
                  : isOnline
                    ? <CheckCircle2 className="h-5 w-5 mr-2" />
                    : <WifiOff className="h-5 w-5 mr-2" />
                }
                {isOnline ? "Record Door" : "Save Offline"}
              </Button>

              {/* GPS hint */}
              {!batteryMode && gpsPos && (
                <p className="text-center text-[10px] text-muted-foreground">
                  <Navigation className="inline h-3 w-3 mr-0.5" />
                  Location attached to next record
                </p>
              )}
            </CardContent>
          </Card>

          {/* Paper fallback download */}
          <Card>
            <CardContent className="p-3">
              <p className="text-xs text-muted-foreground mb-2">
                No signal? Download a paper sheet to fill in offline.
              </p>
              <a
                href={`/api/field/paper-export?campaignId=${campaignId}${selectedShift ? `&shiftId=${selectedShift}` : ""}`}
                download
                className="block w-full"
              >
                <Button variant="outline" className="w-full">
                  <Download className="h-4 w-4 mr-2" />
                  Download Paper Sheet
                </Button>
              </a>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
