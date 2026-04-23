"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle2, Trash2, AlertTriangle, HelpCircle,
  Wrench, Camera, Move, User, FileText, RefreshCw, Loader2,
} from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type SignEventAction =
  | "install" | "remove" | "move" | "damage" | "missing"
  | "repair" | "audit" | "photo_added" | "notes_updated" | "reassigned";

interface SignEvent {
  id: string;
  action: SignEventAction;
  lat: number | null;
  lng: number | null;
  address: string | null;
  photoUrl: string | null;
  notes: string | null;
  previousStatus: string | null;
  createdAt: string;
  user: { id: string; name: string } | null;
}

interface Props {
  signId: string;
}

// ── Config ─────────────────────────────────────────────────────────────────────

const ACTION_META: Record<SignEventAction, { label: string; icon: React.ReactNode; color: string }> = {
  install:       { label: "Installed",     icon: <CheckCircle2 className="w-4 h-4" />, color: "text-green-600 bg-green-100" },
  remove:        { label: "Removed",       icon: <Trash2 className="w-4 h-4" />,       color: "text-gray-500 bg-gray-100" },
  move:          { label: "Moved",         icon: <Move className="w-4 h-4" />,          color: "text-blue-600 bg-blue-100" },
  damage:        { label: "Damaged",       icon: <AlertTriangle className="w-4 h-4" />, color: "text-amber-600 bg-amber-100" },
  missing:       { label: "Missing",       icon: <HelpCircle className="w-4 h-4" />,    color: "text-red-600 bg-red-100" },
  repair:        { label: "Repaired",      icon: <Wrench className="w-4 h-4" />,        color: "text-blue-600 bg-blue-100" },
  audit:         { label: "Audited",       icon: <Camera className="w-4 h-4" />,        color: "text-purple-600 bg-purple-100" },
  photo_added:   { label: "Photo Added",   icon: <Camera className="w-4 h-4" />,        color: "text-slate-600 bg-slate-100" },
  notes_updated: { label: "Notes Updated", icon: <FileText className="w-4 h-4" />,      color: "text-slate-600 bg-slate-100" },
  reassigned:    { label: "Reassigned",    icon: <User className="w-4 h-4" />,          color: "text-indigo-600 bg-indigo-100" },
};

function relTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

// ── Main ──────────────────────────────────────────────────────────────────────

export function SignEventTimeline({ signId }: Props) {
  const [events, setEvents] = useState<SignEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/signs/${signId}/events`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to load events");
      setEvents(data.events ?? []);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [signId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (loading) {
    return (
      <div className="flex items-center justify-center py-6 text-gray-400">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        <span className="text-sm">Loading history…</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="py-4 text-center">
        <p className="text-sm text-red-500">{error}</p>
        <button
          onClick={load}
          className="mt-2 text-xs text-[#1D9E75] hover:underline flex items-center gap-1 mx-auto"
        >
          <RefreshCw className="w-3 h-3" /> Retry
        </button>
      </div>
    );
  }

  if (events.length === 0) {
    return (
      <div className="py-6 text-center text-sm text-gray-400">
        No field actions yet. Use &ldquo;Log Action&rdquo; to record installs, removals, or damage.
      </div>
    );
  }

  return (
    <div className="relative pl-6">
      <div className="absolute left-[11px] top-3 bottom-3 w-px bg-gray-200" />

      <div className="space-y-4">
        {events.map((event, i) => {
          const meta = ACTION_META[event.action] ?? { label: event.action, icon: <FileText className="w-4 h-4" />, color: "text-gray-600 bg-gray-100" };
          return (
            <motion.div
              key={event.id}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.04 }}
              className="relative flex gap-3"
            >
              <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center ${meta.color} ring-2 ring-white`}>
                {meta.icon}
              </div>

              <div className="flex-1 min-w-0 pb-1">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="text-sm font-semibold text-gray-800">{meta.label}</span>
                    {event.user && (
                      <span className="ml-2 text-xs text-gray-400">by {event.user.name}</span>
                    )}
                  </div>
                  <span className="text-xs text-gray-400 shrink-0">{relTime(event.createdAt)}</span>
                </div>

                {event.notes && (
                  <p className="mt-0.5 text-xs text-gray-500 leading-snug">{event.notes}</p>
                )}

                {event.address && (
                  <p className="mt-0.5 text-xs text-gray-400">{event.address}</p>
                )}

                {event.photoUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <a href={event.photoUrl} target="_blank" rel="noreferrer" className="mt-1 block">
                    <img
                      src={event.photoUrl}
                      alt="Sign photo"
                      className="h-20 w-auto rounded-lg border border-gray-200 object-cover"
                    />
                  </a>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}
