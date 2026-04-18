"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Settings, MapPin, Users, ChevronRight, CheckCircle,
  AlertTriangle, Trash2, Edit2, Upload, Download, Lock, Unlock,
  Play, Archive, UserPlus, X,
} from "lucide-react";
import { toast } from "sonner";

const SPRING = { type: "spring", stiffness: 300, damping: 30 } as const;
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";

/* ─── Types ─────────────────────────────────────────────────────────────── */

interface CaptureEvent {
  id: string;
  name: string;
  eventType: "advance_vote" | "election_day" | "custom";
  status: "setup" | "active" | "locked" | "archived";
  office: string;
  ward: string | null;
  municipality: string;
  province: string;
  requireDoubleEntry: boolean;
  allowPartialSubmit: boolean;
  lockAfterApproval: boolean;
  anomalyThreshold: number | null;
  _count: { locations: number; candidates: number; submissions: number };
  createdAt: string;
}

interface CaptureLocation {
  id: string;
  name: string;
  ward: string | null;
  pollNumber: string | null;
  address: string | null;
  status: string;
  expectedTurnout: number | null;
  _count?: { submissions: number };
}

interface CaptureCandidate {
  id: string;
  name: string;
  party: string | null;
  ballotOrder: number;
  isWithdrawn: boolean;
  isWriteIn: boolean;
}

interface Props {
  campaignId: string;
  initialEvents: CaptureEvent[];
  campaign: {
    candidateName: string;
    jurisdiction: string;
    electionDate: string | null;
    advanceVoteStart: string | null;
    advanceVoteEnd: string | null;
  };
}

type PanelTab = "events" | "locations" | "candidates" | "import";

/* ─── Status badge ───────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: string }) {
  const cfg: Record<string, { label: string; color: string }> = {
    setup: { label: "Setup", color: "bg-slate-100 text-slate-600" },
    active: { label: "Active", color: "bg-emerald-100 text-emerald-700" },
    locked: { label: "Locked", color: "bg-blue-100 text-blue-700" },
    archived: { label: "Archived", color: "bg-slate-100 text-slate-400" },
  };
  const c = cfg[status] ?? { label: status, color: "bg-slate-100 text-slate-600" };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${c.color}`}>
      {c.label}
    </span>
  );
}

/* ─── Create / Edit Event Modal ──────────────────────────────────────────── */

function EventModal({
  open,
  onClose,
  onSave,
  campaignId,
  campaign,
  existing,
}: {
  open: boolean;
  onClose: () => void;
  onSave: (event: CaptureEvent) => void;
  campaignId: string;
  campaign: Props["campaign"];
  existing?: CaptureEvent;
}) {
  const [form, setForm] = useState({
    name: existing?.name ?? "",
    eventType: existing?.eventType ?? "election_day" as const,
    office: existing?.office ?? "Mayor",
    ward: existing?.ward ?? "",
    municipality: existing?.municipality ?? "",
    province: existing?.province ?? "ON",
    requireDoubleEntry: existing?.requireDoubleEntry ?? true,
    allowPartialSubmit: existing?.allowPartialSubmit ?? true,
    lockAfterApproval: existing?.lockAfterApproval ?? true,
    anomalyThreshold: existing?.anomalyThreshold ?? null as number | null,
  });
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!form.name.trim() || !form.office.trim()) {
      toast.error("Name and office are required");
      return;
    }
    setSaving(true);
    try {
      const url = existing
        ? `/api/capture/events/${existing.id}`
        : "/api/capture/events";
      const res = await fetch(url, {
        method: existing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, campaignId }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to save");
      onSave(json.data);
      toast.success(existing ? "Event updated" : "Event created");
      onClose();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSaving(false);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 p-4">
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 20, opacity: 0 }}
        transition={SPRING}
        className="bg-white rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-slate-900">
              {existing ? "Edit Event" : "Create Capture Event"}
            </h2>
            <button onClick={onClose} className="p-1 rounded-lg hover:bg-slate-100">
              <X className="w-5 h-5 text-slate-500" />
            </button>
          </div>

          <div className="space-y-3">
            <label className="block">
              <span className="text-sm font-medium text-slate-700">Event Name</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Election Day — Oct 28, 2026"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Event Type</span>
              <select
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                value={form.eventType}
                onChange={(e) => setForm({ ...form, eventType: e.target.value as typeof form.eventType })}
              >
                <option value="advance_vote">Advance Vote</option>
                <option value="election_day">Election Day</option>
                <option value="custom">Custom</option>
              </select>
            </label>

            <label className="block">
              <span className="text-sm font-medium text-slate-700">Office / Race</span>
              <input
                className="mt-1 w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
                placeholder="Mayor, Ward 3 Councillor…"
                value={form.office}
                onChange={(e) => setForm({ ...form, office: e.target.value })}
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Municipality</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  value={form.municipality}
                  onChange={(e) => setForm({ ...form, municipality: e.target.value })}
                />
              </label>
              <label className="block">
                <span className="text-sm font-medium text-slate-700">Ward</span>
                <input
                  className="mt-1 w-full border rounded-lg px-3 py-2 text-sm"
                  placeholder="Ward 3"
                  value={form.ward}
                  onChange={(e) => setForm({ ...form, ward: e.target.value })}
                />
              </label>
            </div>

            <div className="rounded-xl bg-slate-50 p-3 space-y-2">
              <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide">Submission Settings</p>
              {[
                { key: "requireDoubleEntry", label: "Require double-entry verification" },
                { key: "allowPartialSubmit", label: "Allow partial reporting (<100%)" },
                { key: "lockAfterApproval", label: "Lock record after approval" },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="rounded"
                    checked={form[key as keyof typeof form] as boolean}
                    onChange={(e) => setForm({ ...form, [key]: e.target.checked })}
                  />
                  <span className="text-sm text-slate-700">{label}</span>
                </label>
              ))}
              <label className="flex items-center gap-2">
                <span className="text-sm text-slate-700">Anomaly threshold (%)</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  className="w-20 border rounded px-2 py-1 text-sm"
                  placeholder="30"
                  value={form.anomalyThreshold ?? ""}
                  onChange={(e) => setForm({ ...form, anomalyThreshold: e.target.value ? Number(e.target.value) : null })}
                />
              </label>
            </div>
          </div>

          <div className="flex gap-2 pt-2">
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl border text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={saving}
              className="flex-1 py-2 rounded-xl text-sm font-bold text-white"
              style={{ background: NAVY }}
            >
              {saving ? "Saving…" : existing ? "Save Changes" : "Create Event"}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

/* ─── Locations Panel ────────────────────────────────────────────────────── */

function LocationsPanel({ eventId, campaignId }: { eventId: string; campaignId: string }) {
  const [locations, setLocations] = useState<CaptureLocation[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addWard, setAddWard] = useState("");
  const [addPoll, setAddPoll] = useState("");
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importText, setImportText] = useState("");
  const [showImport, setShowImport] = useState(false);

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/capture/events/${eventId}/locations`);
      const json = await res.json();
      setLocations(json.data ?? []);
      setLoaded(true);
    } catch {
      toast.error("Failed to load locations");
    } finally {
      setLoading(false);
    }
  }, [eventId, loading]);

  if (!loaded && !loading) load();

  const addLocation = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/capture/events/${eventId}/locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: addName.trim(), ward: addWard || undefined, pollNumber: addPoll || undefined }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add");
      setLocations((prev) => [...prev, { ...json.data, _count: { submissions: 0 } }]);
      setAddName("");
      setAddWard("");
      setAddPoll("");
      toast.success("Location added");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add location");
    } finally {
      setAdding(false);
    }
  };

  const deleteLocation = async (id: string) => {
    try {
      const res = await fetch(`/api/capture/events/${eventId}/locations/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to delete");
      }
      setLocations((prev) => prev.filter((l) => l.id !== id));
      toast.success("Location removed");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  const runImport = async () => {
    if (!importText.trim()) return;
    setImporting(true);
    try {
      const res = await fetch(`/api/capture/events/${eventId}/import-locations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv: importText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Import failed");
      toast.success(`Imported ${json.created} locations${json.skipped > 0 ? `, ${json.skipped} skipped (duplicates)` : ""}`);
      setImportText("");
      setShowImport(false);
      load();
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Import failed");
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">{locations.length} location{locations.length !== 1 ? "s" : ""}</p>
        <button
          onClick={() => setShowImport(!showImport)}
          className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium"
        >
          <Upload className="w-3.5 h-3.5" />
          Import CSV
        </button>
      </div>

      <AnimatePresence>
        {showImport && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="rounded-xl border border-blue-200 bg-blue-50 p-3 overflow-hidden"
          >
            <p className="text-xs text-blue-700 mb-2 font-medium">
              CSV format: <code className="bg-blue-100 px-1 rounded">name,ward,poll_number,address,expected_turnout</code>
            </p>
            <textarea
              className="w-full text-xs border rounded-lg p-2 h-24 font-mono resize-none"
              placeholder={"Poll 42-A,Ward 3,42A,123 Main St,450\nPoll 43-B,Ward 3,43B,456 Oak Ave,380"}
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div className="flex gap-2 mt-2">
              <button
                onClick={runImport}
                disabled={importing || !importText.trim()}
                className="flex-1 text-xs py-1.5 rounded-lg font-medium text-white"
                style={{ background: NAVY }}
              >
                {importing ? "Importing…" : "Import"}
              </button>
              <button
                onClick={() => setShowImport(false)}
                className="px-3 text-xs py-1.5 rounded-lg border text-slate-600"
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Add location inline */}
      <div className="grid grid-cols-3 gap-2">
        <input
          className="col-span-3 sm:col-span-1 border rounded-lg px-3 py-2 text-sm"
          placeholder="Location name"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addLocation()}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Ward"
          value={addWard}
          onChange={(e) => setAddWard(e.target.value)}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Poll #"
          value={addPoll}
          onChange={(e) => setAddPoll(e.target.value)}
        />
        <button
          onClick={addLocation}
          disabled={adding || !addName.trim()}
          className="col-span-3 sm:col-span-3 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: GREEN }}
        >
          <Plus className="w-4 h-4" />
          {adding ? "Adding…" : "Add Location"}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400 text-center py-4">Loading…</p>}

      <div className="space-y-1 max-h-64 overflow-y-auto">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="flex items-center justify-between px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-800 truncate">{loc.name}</p>
              <p className="text-xs text-slate-500">
                {[loc.ward, loc.pollNumber && `Poll ${loc.pollNumber}`].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0 ml-2">
              {(loc._count?.submissions ?? 0) > 0 && (
                <span className="text-xs text-emerald-600 font-medium">{loc._count!.submissions} sub.</span>
              )}
              <button
                onClick={() => deleteLocation(loc.id)}
                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!loading && loaded && locations.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No locations yet. Add them above or import a CSV.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Candidates Panel ───────────────────────────────────────────────────── */

function CandidatesPanel({ eventId }: { eventId: string }) {
  const [candidates, setCandidates] = useState<CaptureCandidate[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(false);
  const [addName, setAddName] = useState("");
  const [addParty, setAddParty] = useState("");
  const [adding, setAdding] = useState(false);

  const load = useCallback(async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/capture/events/${eventId}/candidates`);
      const json = await res.json();
      setCandidates(json.data ?? []);
      setLoaded(true);
    } catch {
      toast.error("Failed to load candidates");
    } finally {
      setLoading(false);
    }
  }, [eventId, loading]);

  if (!loaded && !loading) load();

  const addCandidate = async () => {
    if (!addName.trim()) return;
    setAdding(true);
    try {
      const res = await fetch(`/api/capture/events/${eventId}/candidates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addName.trim(),
          party: addParty.trim() || undefined,
          ballotOrder: candidates.length,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed to add");
      setCandidates((prev) => [...prev, json.data]);
      setAddName("");
      setAddParty("");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to add candidate");
    } finally {
      setAdding(false);
    }
  };

  const toggleWithdrawn = async (id: string, isWithdrawn: boolean) => {
    try {
      await fetch(`/api/capture/events/${eventId}/candidates/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isWithdrawn: !isWithdrawn }),
      });
      setCandidates((prev) => prev.map((c) => (c.id === id ? { ...c, isWithdrawn: !c.isWithdrawn } : c)));
    } catch {
      toast.error("Failed to update candidate");
    }
  };

  const deleteCandidate = async (id: string) => {
    try {
      const res = await fetch(`/api/capture/events/${eventId}/candidates/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Cannot delete candidate with submissions");
      }
      setCandidates((prev) => prev.filter((c) => c.id !== id));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to delete");
    }
  };

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">{candidates.length} candidate{candidates.length !== 1 ? "s" : ""}</p>

      <div className="grid grid-cols-3 gap-2">
        <input
          className="col-span-2 border rounded-lg px-3 py-2 text-sm"
          placeholder="Candidate name"
          value={addName}
          onChange={(e) => setAddName(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addCandidate()}
        />
        <input
          className="border rounded-lg px-3 py-2 text-sm"
          placeholder="Party"
          value={addParty}
          onChange={(e) => setAddParty(e.target.value)}
        />
        <button
          onClick={addCandidate}
          disabled={adding || !addName.trim()}
          className="col-span-3 flex items-center justify-center gap-1 py-2 rounded-xl text-sm font-medium text-white"
          style={{ background: GREEN }}
        >
          <Plus className="w-4 h-4" />
          {adding ? "Adding…" : "Add Candidate"}
        </button>
      </div>

      {loading && <p className="text-sm text-slate-400 text-center py-4">Loading…</p>}

      <div className="space-y-1 max-h-56 overflow-y-auto">
        {candidates.map((c, idx) => (
          <div key={c.id} className={`flex items-center justify-between px-3 py-2 rounded-lg ${c.isWithdrawn ? "bg-slate-50 opacity-50" : "bg-slate-50 hover:bg-slate-100"}`}>
            <div>
              <p className="text-sm font-medium text-slate-800">{idx + 1}. {c.name}</p>
              {c.party && <p className="text-xs text-slate-500">{c.party}</p>}
              {c.isWriteIn && <span className="text-xs text-amber-600 font-medium">Write-in</span>}
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => toggleWithdrawn(c.id, c.isWithdrawn)}
                className={`text-xs px-2 py-0.5 rounded font-medium ${c.isWithdrawn ? "text-slate-400 hover:text-slate-600" : "text-amber-600 hover:text-amber-700"}`}
              >
                {c.isWithdrawn ? "Reinstate" : "Withdrawn"}
              </button>
              <button
                onClick={() => deleteCandidate(c.id)}
                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-500"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {!loading && loaded && candidates.length === 0 && (
          <p className="text-sm text-slate-400 text-center py-6">No candidates yet. Add them above.</p>
        )}
      </div>
    </div>
  );
}

/* ─── Event Detail Panel ─────────────────────────────────────────────────── */

function EventDetailPanel({
  event,
  campaignId,
  campaign,
  onEventUpdate,
  onClose,
}: {
  event: CaptureEvent;
  campaignId: string;
  campaign: Props["campaign"];
  onEventUpdate: (e: CaptureEvent) => void;
  onClose: () => void;
}) {
  const [tab, setTab] = useState<PanelTab>("locations");
  const [editOpen, setEditOpen] = useState(false);
  const [statusChanging, setStatusChanging] = useState(false);

  const statusAction = async (newStatus: CaptureEvent["status"]) => {
    setStatusChanging(true);
    try {
      const res = await fetch(`/api/capture/events/${event.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Failed");
      onEventUpdate(json.data);
      toast.success(`Event ${newStatus}`);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Failed to update status");
    } finally {
      setStatusChanging(false);
    }
  };

  const tabItems: { id: PanelTab; label: string; icon: React.ReactNode }[] = [
    { id: "locations", label: "Locations", icon: <MapPin className="w-3.5 h-3.5" /> },
    { id: "candidates", label: "Candidates", icon: <Users className="w-3.5 h-3.5" /> },
  ];

  return (
    <div className="border-l border-slate-200 h-full flex flex-col bg-white">
      <div className="p-4 border-b border-slate-100">
        <div className="flex items-start justify-between gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-sm leading-tight">{event.name}</h3>
            <div className="flex items-center gap-2 mt-1">
              <StatusBadge status={event.status} />
              <span className="text-xs text-slate-500">{event.office}</span>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setEditOpen(true)}
              className="p-1.5 rounded-lg hover:bg-slate-100"
            >
              <Edit2 className="w-4 h-4 text-slate-500" />
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-slate-100">
              <X className="w-4 h-4 text-slate-500" />
            </button>
          </div>
        </div>

        {/* Stats strip */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: "Locations", value: event._count.locations },
            { label: "Candidates", value: event._count.candidates },
            { label: "Submissions", value: event._count.submissions },
          ].map(({ label, value }) => (
            <div key={label} className="rounded-lg bg-slate-50 px-2 py-1.5 text-center">
              <p className="text-lg font-bold text-slate-900">{value}</p>
              <p className="text-xs text-slate-500">{label}</p>
            </div>
          ))}
        </div>

        {/* Status actions */}
        <div className="flex gap-1.5 mt-3">
          {event.status === "setup" && (
            <button
              onClick={() => statusAction("active")}
              disabled={statusChanging || event._count.candidates === 0}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-white"
              style={{ background: GREEN }}
            >
              <Play className="w-3 h-3" />
              Activate
            </button>
          )}
          {event.status === "active" && (
            <>
              <button
                onClick={() => statusAction("locked")}
                disabled={statusChanging}
                className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-blue-700 bg-blue-50 hover:bg-blue-100"
              >
                <Lock className="w-3 h-3" />
                Lock
              </button>
            </>
          )}
          {event.status === "locked" && (
            <button
              onClick={() => statusAction("active")}
              disabled={statusChanging}
              className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-xs font-medium text-amber-700 bg-amber-50 hover:bg-amber-100"
            >
              <Unlock className="w-3 h-3" />
              Re-open
            </button>
          )}
          <a
            href={`/eday/capture/war-room?eventId=${event.id}`}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-white"
            style={{ background: NAVY }}
          >
            War Room →
          </a>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-4 gap-1">
        {tabItems.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium border-b-2 transition-colors ${
              tab === t.id
                ? "border-slate-900 text-slate-900"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.icon}
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="flex-1 overflow-y-auto p-4">
        {tab === "locations" && <LocationsPanel eventId={event.id} campaignId={campaignId} />}
        {tab === "candidates" && <CandidatesPanel eventId={event.id} />}
      </div>

      <AnimatePresence>
        {editOpen && (
          <EventModal
            open={editOpen}
            onClose={() => setEditOpen(false)}
            onSave={(updated) => onEventUpdate({ ...updated, _count: event._count })}
            campaignId={campaignId}
            campaign={campaign}
            existing={event}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */

export default function SetupClient({ campaignId, initialEvents, campaign }: Props) {
  const [events, setEvents] = useState<CaptureEvent[]>(initialEvents);
  const [selectedEvent, setSelectedEvent] = useState<CaptureEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);

  const handleEventCreate = (event: CaptureEvent) => {
    setEvents((prev) => [{ ...event, _count: { locations: 0, candidates: 0, submissions: 0 } }, ...prev]);
    setSelectedEvent({ ...event, _count: { locations: 0, candidates: 0, submissions: 0 } });
  };

  const handleEventUpdate = (updated: CaptureEvent) => {
    setEvents((prev) => prev.map((e) => (e.id === updated.id ? { ...updated, _count: e._count } : e)));
    if (selectedEvent?.id === updated.id) {
      setSelectedEvent({ ...updated, _count: selectedEvent._count });
    }
  };

  const deleteEvent = async (id: string) => {
    try {
      const res = await fetch(`/api/capture/events/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const j = await res.json();
        throw new Error(j.error ?? "Failed to delete");
      }
      setEvents((prev) => prev.filter((e) => e.id !== id));
      if (selectedEvent?.id === id) setSelectedEvent(null);
      toast.success("Event deleted");
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : "Cannot delete event");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4 sm:px-8">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900">Quick Capture Setup</h1>
            <p className="text-sm text-slate-500 mt-0.5">Configure events, locations, and candidates for election day results capture</p>
          </div>
          <button
            onClick={() => setCreateOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold text-white"
            style={{ background: NAVY }}
          >
            <Plus className="w-4 h-4" />
            New Event
          </button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">

          {/* Event list */}
          <div className="lg:col-span-2 space-y-3">
            {events.length === 0 && (
              <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
                <Settings className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                <p className="font-semibold text-slate-700">No capture events yet</p>
                <p className="text-sm text-slate-400 mt-1">Create an event to start collecting results</p>
                <button
                  onClick={() => setCreateOpen(true)}
                  className="mt-4 px-4 py-2 rounded-xl text-sm font-bold text-white"
                  style={{ background: NAVY }}
                >
                  Create First Event
                </button>
              </div>
            )}

            {events.map((event) => (
              <motion.div
                key={event.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={SPRING}
                onClick={() => setSelectedEvent(event)}
                className={`bg-white rounded-2xl border p-4 cursor-pointer hover:border-slate-300 transition-colors ${
                  selectedEvent?.id === event.id ? "border-slate-900 ring-1 ring-slate-900" : "border-slate-200"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <StatusBadge status={event.status} />
                      <span className="text-xs text-slate-500 capitalize">{event.eventType.replace("_", " ")}</span>
                    </div>
                    <h3 className="font-semibold text-slate-900 text-sm leading-tight truncate">{event.name}</h3>
                    <p className="text-xs text-slate-500 mt-0.5">{event.office} · {event.municipality}</p>
                    <div className="flex items-center gap-3 mt-2 text-xs text-slate-400">
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" />{event._count.locations}</span>
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" />{event._count.candidates}</span>
                      <span className="flex items-center gap-1"><CheckCircle className="w-3 h-3" />{event._count.submissions}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    {event.status !== "active" && event.status !== "locked" && (
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteEvent(event.id); }}
                        className="p-1.5 rounded-lg hover:bg-red-50 text-slate-300 hover:text-red-400"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedEvent?.id === event.id ? "rotate-90" : ""}`} />
                  </div>
                </div>

                {/* Readiness warnings */}
                {event.status === "setup" && event._count.candidates === 0 && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-amber-600">
                    <AlertTriangle className="w-3 h-3" />
                    Add candidates before activating
                  </div>
                )}
              </motion.div>
            ))}
          </div>

          {/* Detail panel */}
          <div className="lg:col-span-3">
            <AnimatePresence mode="wait">
              {selectedEvent ? (
                <motion.div
                  key={selectedEvent.id}
                  initial={{ opacity: 0, x: 10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -10 }}
                  transition={SPRING}
                  className="bg-white rounded-2xl border border-slate-200 overflow-hidden h-full min-h-[500px] flex flex-col"
                >
                  <EventDetailPanel
                    event={selectedEvent}
                    campaignId={campaignId}
                    campaign={campaign}
                    onEventUpdate={handleEventUpdate}
                    onClose={() => setSelectedEvent(null)}
                  />
                </motion.div>
              ) : (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="bg-white rounded-2xl border border-slate-200 p-8 text-center h-full min-h-[300px] flex flex-col items-center justify-center"
                >
                  <Settings className="w-10 h-10 text-slate-200 mb-3" />
                  <p className="text-slate-500 font-medium">Select an event to manage its locations and candidates</p>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {createOpen && (
          <EventModal
            open={createOpen}
            onClose={() => setCreateOpen(false)}
            onSave={handleEventCreate}
            campaignId={campaignId}
            campaign={campaign}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
