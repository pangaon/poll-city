"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronLeft, ChevronRight, CheckCircle, AlertTriangle, Send,
  RefreshCw, MapPin, Loader2, AlertOctagon, Flag, X, Clock,
  WifiOff, Wifi,
} from "lucide-react";
import { toast } from "sonner";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface Candidate {
  id: string;
  name: string;
  party: string | null;
  ballotOrder: number;
}

interface CaptureEvent {
  id: string;
  name: string;
  eventType: "advance_vote" | "election_day" | "custom";
  office: string;
  ward: string | null;
  municipality: string;
  requireDoubleEntry: boolean;
  allowPartialSubmit: boolean;
  candidates: Candidate[];
  locationCount: number;
}

interface CaptureLocation {
  id: string;
  name: string;
  ward: string | null;
  pollNumber: string | null;
  address: string | null;
  status: string;
  submissions?: Array<{
    id: string;
    status: string;
    totalVotes: number | null;
    createdAt: string;
    results: Array<{ candidate: { id: string; name: string }; votes: number }>;
  }>;
}

interface QueuedSubmission {
  id: string;
  eventId: string;
  locationId: string;
  locationName: string;
  results: Record<string, number>;
  notes: string;
  percentReporting: number;
  queuedAt: string;
  retryCount: number;
}

type Step = "event" | "location" | "entry" | "review" | "done" | "issue";

interface Props {
  campaignId: string;
  userId: string;
  initialEventId: string | null;
  initialEvents: CaptureEvent[];
  isManager: boolean;
}

const QUEUE_KEY = "capture_queue";

/* ─── Vote input component — large tap targets, keyboard optimized ──────── */

function VoteInput({
  candidate,
  value,
  onChange,
  autoFocus,
}: {
  candidate: Candidate;
  value: string;
  onChange: (v: string) => void;
  autoFocus?: boolean;
}) {
  const handleChange = (v: string) => {
    // Allow empty string, or positive integers only
    if (v === "" || /^\d+$/.test(v)) onChange(v);
  };

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-slate-900 text-base leading-tight">{candidate.name}</p>
        {candidate.party && (
          <p className="text-sm text-slate-500 mt-0.5">{candidate.party}</p>
        )}
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <button
          type="button"
          onClick={() => {
            const cur = parseInt(value || "0", 10);
            if (cur > 0) onChange(String(cur - 1));
          }}
          className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 active:bg-slate-200 select-none"
        >
          −
        </button>
        <input
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus={autoFocus}
          className="w-24 h-10 text-center text-xl font-bold rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:outline-none"
          value={value}
          onChange={(e) => handleChange(e.target.value)}
          placeholder="0"
        />
        <button
          type="button"
          onClick={() => onChange(String(parseInt(value || "0", 10) + 1))}
          className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 active:bg-slate-200 select-none"
        >
          +
        </button>
      </div>
    </div>
  );
}

/* ─── Offline queue indicator ────────────────────────────────────────────── */

function QueueBadge({ queue, onFlush }: { queue: QueuedSubmission[]; onFlush: () => void }) {
  if (queue.length === 0) return null;
  return (
    <motion.div
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="fixed top-16 left-0 right-0 z-40 mx-4"
    >
      <div
        className="rounded-xl px-4 py-2.5 flex items-center gap-2 shadow-lg"
        style={{ background: AMBER }}
      >
        <WifiOff className="w-4 h-4 text-white shrink-0" />
        <p className="text-sm font-semibold text-white flex-1">
          {queue.length} submission{queue.length !== 1 ? "s" : ""} queued offline
        </p>
        <button onClick={onFlush} className="text-xs text-white/90 underline font-medium">
          Retry now
        </button>
      </div>
    </motion.div>
  );
}

/* ─── Main component ─────────────────────────────────────────────────────── */

export default function CaptureClient({ campaignId, userId, initialEventId, initialEvents, isManager }: Props) {
  const [step, setStep] = useState<Step>(initialEventId ? "location" : "event");
  const [selectedEvent, setSelectedEvent] = useState<CaptureEvent | null>(
    initialEventId ? initialEvents.find((e) => e.id === initialEventId) ?? null : null
  );
  const [locations, setLocations] = useState<CaptureLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [locationsError, setLocationsError] = useState<string | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<CaptureLocation | null>(null);
  const [votes, setVotes] = useState<Record<string, string>>({});
  const [notes, setNotes] = useState("");
  const [percentReporting, setPercentReporting] = useState("100");
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<{ verified: boolean; mismatch: boolean; message: string } | null>(null);
  const [issueDescription, setIssueDescription] = useState("");
  const [issueSeverity, setIssueSeverity] = useState<"low" | "medium" | "high" | "critical">("medium");
  const [issueType, setIssueType] = useState("other");
  const [submitIssue, setSubmitIssue] = useState(false);
  const [online, setOnline] = useState(true);
  const [queue, setQueue] = useState<QueuedSubmission[]>([]);
  const flushing = useRef(false);

  // Network monitoring
  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    setOnline(navigator.onLine);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  // Load queue from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(QUEUE_KEY);
      if (stored) setQueue(JSON.parse(stored));
    } catch {
      // ignore
    }
  }, []);

  // Persist queue
  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
    } catch {
      // ignore
    }
  }, [queue]);

  // Auto-flush queue when back online
  useEffect(() => {
    if (online && queue.length > 0) {
      flushQueue();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [online]);

  const loadLocations = useCallback(async (eventId: string) => {
    setLocationsLoading(true);
    setLocationsError(null);
    try {
      const res = await fetch(`/api/capture/events/${eventId}/my-locations`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to load locations");
      setLocations(json.data ?? []);
    } catch (e: unknown) {
      setLocationsError(e instanceof Error ? e.message : "Failed to load locations");
      // Try to restore from sessionStorage cache
      try {
        const cached = sessionStorage.getItem(`locations_${eventId}`);
        if (cached) {
          setLocations(JSON.parse(cached));
          setLocationsError("Using cached locations — check connection");
        }
      } catch {
        // no cache
      }
    } finally {
      setLocationsLoading(false);
    }
  }, []);

  const selectEvent = (event: CaptureEvent) => {
    setSelectedEvent(event);
    setStep("location");
    // Init votes
    const initVotes: Record<string, string> = {};
    event.candidates.forEach((c) => { initVotes[c.id] = ""; });
    setVotes(initVotes);
    loadLocations(event.id);
  };

  const selectLocation = (loc: CaptureLocation) => {
    setSelectedLocation(loc);
    setStep("entry");
    // If location already has a completed submission, warn
    if (loc.submissions && loc.submissions.some((s) => s.status === "approved")) {
      toast.info("This location already has an approved submission. You can still submit a correction.");
    }
  };

  const flushQueue = useCallback(async () => {
    if (flushing.current || queue.length === 0) return;
    flushing.current = true;
    const failed: QueuedSubmission[] = [];

    for (const item of queue) {
      try {
        const res = await fetch(`/api/capture/events/${item.eventId}/submit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            locationId: item.locationId,
            results: Object.entries(item.results).map(([candidateId, votes]) => ({
              candidateId,
              votes: Number(votes) || 0,
            })),
            notes: item.notes,
            percentReporting: item.percentReporting,
            isDraft: false,
          }),
        });
        if (!res.ok) {
          const j = await res.json();
          throw new Error(j.error ?? "Submit failed");
        }
        toast.success(`Queued submission for ${item.locationName} sent`);
      } catch {
        failed.push({ ...item, retryCount: item.retryCount + 1 });
      }
    }

    setQueue(failed);
    flushing.current = false;
  }, [queue]);

  const submit = async (isDraft = false) => {
    if (!selectedEvent || !selectedLocation) return;

    const results = selectedEvent.candidates.map((c) => ({
      candidateId: c.id,
      votes: parseInt(votes[c.id] || "0", 10),
    }));

    // Validate: at least one non-zero value unless partial allowed
    const hasAnyVotes = results.some((r) => r.votes > 0);
    if (!hasAnyVotes && !selectedEvent.allowPartialSubmit && !isDraft) {
      toast.error("Enter at least one vote count before submitting");
      return;
    }

    // If offline, queue for later
    if (!online && !isDraft) {
      const qItem: QueuedSubmission = {
        id: `q_${Date.now()}`,
        eventId: selectedEvent.id,
        locationId: selectedLocation.id,
        locationName: selectedLocation.name,
        results: Object.fromEntries(Object.entries(votes).map(([k, v]) => [k, parseInt(v, 10) || 0])),
        notes,
        percentReporting: parseFloat(percentReporting) || 100,
        queuedAt: new Date().toISOString(),
        retryCount: 0,
      };
      setQueue((prev) => [...prev, qItem]);
      toast.success("Saved to offline queue — will submit when connection returns");
      setStep("done");
      setSubmitResult({ verified: false, mismatch: false, message: "Queued for offline submission" });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/capture/events/${selectedEvent.id}/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedLocation.id,
          results,
          notes: notes || undefined,
          percentReporting: parseFloat(percentReporting) || 100,
          captureMode: "manual",
          isDraft,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Submit failed");

      setSubmitResult({
        verified: json.verified,
        mismatch: json.mismatch,
        message: json.message,
      });
      setStep("done");
      toast.success(isDraft ? "Draft saved" : "Submitted successfully");
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : "Submit failed";
      // On network failure, offer to queue
      if (!navigator.onLine) {
        const qItem: QueuedSubmission = {
          id: `q_${Date.now()}`,
          eventId: selectedEvent.id,
          locationId: selectedLocation.id,
          locationName: selectedLocation.name,
          results: Object.fromEntries(Object.entries(votes).map(([k, v]) => [k, parseInt(v, 10) || 0])),
          notes,
          percentReporting: parseFloat(percentReporting) || 100,
          queuedAt: new Date().toISOString(),
          retryCount: 0,
        };
        setQueue((prev) => [...prev, qItem]);
        toast.success("Saved to offline queue");
        setStep("done");
        setSubmitResult({ verified: false, mismatch: false, message: "Saved offline" });
      } else {
        toast.error(msg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const reportIssue = async () => {
    if (!selectedEvent || !issueDescription.trim()) return;
    setSubmitIssue(true);
    try {
      const res = await fetch(`/api/capture/events/${selectedEvent.id}/issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          locationId: selectedLocation?.id,
          issueType,
          severity: issueSeverity,
          description: issueDescription.trim(),
        }),
      });
      if (!res.ok) throw new Error("Failed to submit issue");
      toast.success("Issue reported to HQ");
      setStep(selectedLocation ? "entry" : "location");
      setIssueDescription("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to report issue");
    } finally {
      setSubmitIssue(false);
    }
  };

  const resetForNextLocation = () => {
    setSelectedLocation(null);
    setVotes({});
    setNotes("");
    setPercentReporting("100");
    setSubmitResult(null);
    setStep("location");
    // Refresh locations to get updated statuses
    if (selectedEvent) loadLocations(selectedEvent.id);
  };

  // ── Step: Select Event ───────────────────────────────────────────────────
  if (step === "event") {
    return (
      <div className="min-h-screen bg-slate-50 p-4">
        <QueueBadge queue={queue} onFlush={flushQueue} />
        <div className="max-w-md mx-auto pt-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-1">Quick Capture</h1>
          <p className="text-slate-500 mb-6">Select the event you are reporting for</p>

          {initialEvents.length === 0 && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <AlertTriangle className="w-10 h-10 text-amber-400 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No active capture events</p>
              <p className="text-sm text-slate-400 mt-1">Your campaign manager hasn&apos;t activated an event yet.</p>
              {isManager && (
                <a
                  href="/eday/capture/setup"
                  className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-blue-600 hover:text-blue-700"
                >
                  Go to Setup →
                </a>
              )}
            </div>
          )}

          <div className="space-y-3">
            {initialEvents.map((event) => (
              <motion.button
                key={event.id}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectEvent(event)}
                className="w-full text-left bg-white rounded-2xl border border-slate-200 p-4 hover:border-slate-300 transition-colors active:bg-slate-50"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-slate-900">{event.name}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{event.office} · {event.municipality}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="capitalize">{event.eventType.replace("_", " ")}</span>
                      <span>{event.locationCount} location{event.locationCount !== 1 ? "s" : ""}</span>
                      <span>{event.candidates.length} candidates</span>
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-slate-400 shrink-0" />
                </div>
              </motion.button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Select Location ────────────────────────────────────────────────
  if (step === "location") {
    const completedIds = new Set(
      locations
        .flatMap((l) => l.submissions ?? [])
        .filter((s) => s.status === "approved")
        .map((s) => {
          const loc = locations.find((l) => l.submissions?.some((sub) => sub.id === s.id));
          return loc?.id;
        })
        .filter(Boolean)
    );

    return (
      <div className="min-h-screen bg-slate-50">
        <QueueBadge queue={queue} onFlush={flushQueue} />

        <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3">
          <button onClick={() => setStep("event")} className="flex items-center gap-1 text-sm text-slate-500 mb-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold text-slate-900">{selectedEvent?.name}</h1>
          <p className="text-sm text-slate-500">{selectedEvent?.office} · Select your polling location</p>
        </div>

        <div className="p-4 max-w-md mx-auto">
          {locationsLoading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="w-6 h-6 text-slate-400 animate-spin" />
              <span className="ml-2 text-slate-500">Loading locations…</span>
            </div>
          )}

          {locationsError && (
            <div className="rounded-2xl bg-amber-50 border border-amber-200 p-4 mb-4">
              <div className="flex items-center gap-2 text-amber-700">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <p className="text-sm">{locationsError}</p>
              </div>
              <button
                onClick={() => selectedEvent && loadLocations(selectedEvent.id)}
                className="mt-2 text-xs text-amber-700 underline"
              >
                Retry
              </button>
            </div>
          )}

          {!locationsLoading && locations.length === 0 && !locationsError && (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <MapPin className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="font-semibold text-slate-700">No locations assigned to you</p>
              <p className="text-sm text-slate-400 mt-1">Contact your campaign manager to be assigned to a polling location.</p>
            </div>
          )}

          <div className="space-y-2">
            {locations.map((loc) => {
              const hasApproved = loc.submissions?.some((s) => s.status === "approved");
              const hasPending = loc.submissions?.some((s) => s.status === "pending_review");

              return (
                <motion.button
                  key={loc.id}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => selectLocation(loc)}
                  className="w-full text-left bg-white rounded-2xl border p-4 hover:border-slate-300 transition-colors"
                  style={{
                    borderColor: hasApproved ? "#1D9E75" : hasPending ? AMBER : undefined,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-slate-900 text-base leading-tight">{loc.name}</p>
                      <p className="text-sm text-slate-500 mt-0.5">
                        {[loc.ward, loc.pollNumber && `Poll ${loc.pollNumber}`].filter(Boolean).join(" · ")}
                      </p>
                      {loc.address && <p className="text-xs text-slate-400 mt-0.5 truncate">{loc.address}</p>}
                    </div>
                    <div className="flex items-center gap-2 ml-2 shrink-0">
                      {hasApproved && <CheckCircle className="w-5 h-5 text-emerald-500" />}
                      {hasPending && !hasApproved && <Clock className="w-5 h-5 text-amber-500" />}
                      {loc.status === "problem" && <AlertOctagon className="w-5 h-5 text-red-500" />}
                      <ChevronRight className="w-5 h-5 text-slate-400" />
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          {/* Report issue button */}
          {selectedEvent && (
            <button
              onClick={() => setStep("issue")}
              className="mt-4 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-sm text-slate-600 hover:border-red-300 hover:text-red-600 transition-colors"
            >
              <Flag className="w-4 h-4" />
              Report an issue
            </button>
          )}
        </div>
      </div>
    );
  }

  // ── Step: Enter Votes ────────────────────────────────────────────────────
  if (step === "entry") {
    const candidates = selectedEvent?.candidates ?? [];
    const totalEntered = Object.values(votes).reduce((s, v) => s + (parseInt(v || "0", 10)), 0);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <QueueBadge queue={queue} onFlush={flushQueue} />

        <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3">
          <button onClick={() => setStep("location")} className="flex items-center gap-1 text-sm text-slate-500 mb-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold text-slate-900 leading-tight">{selectedLocation?.name}</h1>
          <p className="text-sm text-slate-500">
            {selectedEvent?.office} · Enter vote counts
            {selectedEvent?.requireDoubleEntry && (
              <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-medium">Double-entry required</span>
            )}
          </p>
        </div>

        <div className="flex-1 px-4 py-4 max-w-md mx-auto w-full">
          {/* Vote inputs */}
          <div className="bg-white rounded-2xl border border-slate-200 px-4 mb-4">
            {candidates.map((candidate, idx) => (
              <VoteInput
                key={candidate.id}
                candidate={candidate}
                value={votes[candidate.id] ?? ""}
                onChange={(v) => setVotes((prev) => ({ ...prev, [candidate.id]: v }))}
                autoFocus={idx === 0}
              />
            ))}

            {candidates.length === 0 && (
              <div className="py-6 text-center text-slate-400 text-sm">
                No candidates configured for this event.
              </div>
            )}
          </div>

          {/* Summary */}
          <div className="bg-slate-50 rounded-xl px-4 py-3 flex items-center justify-between mb-4">
            <span className="text-sm text-slate-600 font-medium">Total votes entered</span>
            <span className="text-lg font-bold text-slate-900">{totalEntered.toLocaleString()}</span>
          </div>

          {/* Partial reporting */}
          {selectedEvent?.allowPartialSubmit && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-1">
                % of polls reporting
              </label>
              <input
                type="range"
                min={1}
                max={100}
                value={percentReporting}
                onChange={(e) => setPercentReporting(e.target.value)}
                className="w-full accent-blue-600"
              />
              <div className="flex justify-between text-xs text-slate-400 mt-0.5">
                <span>1%</span>
                <span className="font-bold text-slate-700">{percentReporting}%</span>
                <span>100%</span>
              </div>
            </div>
          )}

          {/* Notes */}
          <textarea
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none mb-4"
            rows={2}
            placeholder="Optional notes (conditions, issues, partial count reason…)"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Actions */}
          <div className="space-y-2">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={() => setStep("review")}
              disabled={submitting}
              className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
              style={{ background: NAVY }}
            >
              Review & Submit
              <ChevronRight className="w-5 h-5" />
            </motion.button>

            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => submit(true)}
                disabled={submitting}
                className="py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-1"
              >
                <Clock className="w-4 h-4" />
                Save Draft
              </button>
              <button
                onClick={() => setStep("issue")}
                className="py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600 hover:border-red-200 hover:text-red-600 flex items-center justify-center gap-1"
              >
                <Flag className="w-4 h-4" />
                Report Issue
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Step: Review ─────────────────────────────────────────────────────────
  if (step === "review") {
    const candidates = selectedEvent?.candidates ?? [];
    const totalVotes = Object.values(votes).reduce((s, v) => s + (parseInt(v || "0", 10)), 0);

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3">
          <button onClick={() => setStep("entry")} className="flex items-center gap-1 text-sm text-slate-500 mb-2">
            <ChevronLeft className="w-4 h-4" /> Edit
          </button>
          <h1 className="text-lg font-bold text-slate-900">Review Submission</h1>
          <p className="text-sm text-slate-500">Confirm before submitting</p>
        </div>

        <div className="flex-1 px-4 py-4 max-w-md mx-auto w-full">
          {/* Location summary */}
          <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <MapPin className="w-4 h-4 text-slate-400" />
              <div>
                <p className="font-bold text-slate-900">{selectedLocation?.name}</p>
                <p className="text-xs text-slate-500">{selectedEvent?.office} · {selectedEvent?.name}</p>
              </div>
            </div>

            <div className="space-y-2">
              {candidates.map((c) => (
                <div key={c.id} className="flex items-center justify-between py-1.5 border-b border-slate-50 last:border-0">
                  <div>
                    <p className="font-medium text-slate-800 text-sm">{c.name}</p>
                    {c.party && <p className="text-xs text-slate-400">{c.party}</p>}
                  </div>
                  <span className="text-xl font-bold text-slate-900 tabular-nums">
                    {parseInt(votes[c.id] || "0", 10).toLocaleString()}
                  </span>
                </div>
              ))}
            </div>

            <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between">
              <span className="text-sm font-semibold text-slate-700">Total</span>
              <span className="text-xl font-bold text-slate-900">{totalVotes.toLocaleString()}</span>
            </div>

            {parseFloat(percentReporting) < 100 && (
              <p className="mt-2 text-xs text-amber-600 font-medium">{percentReporting}% reporting</p>
            )}

            {notes && (
              <p className="mt-2 text-xs text-slate-500 bg-slate-50 rounded-lg px-2 py-1.5">{notes}</p>
            )}

            {selectedEvent?.requireDoubleEntry && (
              <div className="mt-3 flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 rounded-lg px-2 py-1.5">
                <AlertTriangle className="w-3 h-3" />
                A second staff member will need to confirm these numbers.
              </div>
            )}
          </div>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={() => submit(false)}
            disabled={submitting}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
            style={{ background: GREEN }}
          >
            {submitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Submitting…
              </>
            ) : (
              <>
                <Send className="w-5 h-5" />
                Confirm & Submit
              </>
            )}
          </motion.button>
        </div>
      </div>
    );
  }

  // ── Step: Done ───────────────────────────────────────────────────────────
  if (step === "done") {
    const isVerified = submitResult?.verified;
    const isMismatch = submitResult?.mismatch;
    const isQueued = submitResult?.message?.includes("Queued") || submitResult?.message?.includes("offline");

    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-4">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={SPRING}
          className="text-center max-w-sm w-full"
        >
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4"
            style={{
              background: isQueued ? AMBER : isMismatch ? "#FEF3C7" : isVerified ? "#D1FAE5" : "#DBEAFE",
            }}
          >
            {isQueued ? (
              <WifiOff className="w-10 h-10 text-amber-600" />
            ) : isMismatch ? (
              <AlertTriangle className="w-10 h-10 text-amber-600" />
            ) : isVerified ? (
              <CheckCircle className="w-10 h-10 text-emerald-600" />
            ) : (
              <CheckCircle className="w-10 h-10 text-blue-600" />
            )}
          </div>

          <h2 className="text-2xl font-bold text-slate-900 mb-2">
            {isQueued ? "Saved Offline" : isMismatch ? "Mismatch Flagged" : isVerified ? "Verified!" : "Submitted"}
          </h2>
          <p className="text-slate-500 text-sm mb-6">{submitResult?.message}</p>

          {isMismatch && (
            <div className="bg-amber-50 rounded-xl p-3 mb-6 text-left">
              <p className="text-xs text-amber-700">
                Your numbers differ from the first entry. A manager will review both submissions.
                Do not re-enter unless you are correcting a genuine error.
              </p>
            </div>
          )}

          <div className="space-y-3">
            <motion.button
              whileTap={{ scale: 0.97 }}
              onClick={resetForNextLocation}
              className="w-full py-4 rounded-2xl text-base font-bold text-white"
              style={{ background: NAVY }}
            >
              Next Location
            </motion.button>

            <button
              onClick={() => {
                setSelectedLocation(null);
                setSelectedEvent(null);
                setStep("event");
              }}
              className="w-full py-3 rounded-2xl border border-slate-200 text-sm font-medium text-slate-600"
            >
              Back to Events
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ── Step: Report Issue ───────────────────────────────────────────────────
  if (step === "issue") {
    return (
      <div className="min-h-screen bg-slate-50">
        <div className="bg-white border-b border-slate-200 px-4 pt-4 pb-3">
          <button onClick={() => setStep(selectedLocation ? "entry" : "location")} className="flex items-center gap-1 text-sm text-slate-500 mb-2">
            <ChevronLeft className="w-4 h-4" /> Back
          </button>
          <h1 className="text-lg font-bold text-slate-900">Report Issue</h1>
          <p className="text-sm text-slate-500">
            {selectedLocation ? `${selectedLocation.name} · ` : ""}
            {selectedEvent?.name}
          </p>
        </div>

        <div className="px-4 py-4 max-w-md mx-auto space-y-4">
          <label className="block">
            <span className="text-sm font-medium text-slate-700">Issue Type</span>
            <select
              className="mt-1 w-full border rounded-xl px-3 py-2.5 text-sm"
              value={issueType}
              onChange={(e) => setIssueType(e.target.value)}
            >
              <option value="missing_scrutineer">Missing scrutineer</option>
              <option value="access_denied">Access denied</option>
              <option value="equipment_failure">Equipment failure</option>
              <option value="intimidation">Intimidation</option>
              <option value="suspicious_activity">Suspicious activity</option>
              <option value="ballot_irregularity">Ballot irregularity</option>
              <option value="long_lineup">Long lineup</option>
              <option value="other">Other</option>
            </select>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Severity</span>
            <div className="grid grid-cols-4 gap-1 mt-1">
              {(["low", "medium", "high", "critical"] as const).map((s) => (
                <button
                  key={s}
                  onClick={() => setIssueSeverity(s)}
                  className={`py-2 rounded-lg text-xs font-medium capitalize transition-colors ${
                    issueSeverity === s
                      ? s === "critical" ? "bg-red-600 text-white" : s === "high" ? "bg-red-400 text-white" : s === "medium" ? "bg-amber-400 text-white" : "bg-slate-400 text-white"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </label>

          <label className="block">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              className="mt-1 w-full border rounded-xl px-3 py-2 text-sm resize-none"
              rows={5}
              placeholder="Describe what is happening…"
              value={issueDescription}
              onChange={(e) => setIssueDescription(e.target.value)}
            />
          </label>

          <motion.button
            whileTap={{ scale: 0.97 }}
            onClick={reportIssue}
            disabled={submitIssue || !issueDescription.trim()}
            className="w-full py-4 rounded-2xl text-base font-bold text-white flex items-center justify-center gap-2"
            style={{ background: RED }}
          >
            {submitIssue ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
            {submitIssue ? "Reporting…" : "Send to HQ"}
          </motion.button>
        </div>
      </div>
    );
  }

  return null;
}
