"use client";

import React, { useState, useEffect, useCallback } from "react";
import { format, parseISO, differenceInDays, isPast, isToday } from "date-fns";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic2, CalendarDays, MapPin, Clock, Users, Radio, Tv2,
  X, AlertTriangle, RefreshCw, Link2, Unlink,
  FileText, Zap, Globe, AlignLeft, Phone, Mail,
  ExternalLink, Info, Loader2, ArrowLeft, Shield, Shirt, Bus,
} from "lucide-react";
import Link from "next/link";
import { EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

interface CandidateAppearance {
  id: string;
  appearanceFormat: string;
  hostOrganization: string | null;
  hostContactName: string | null;
  hostContactPhone: string | null;
  hostContactEmail: string | null;
  expectedAttendees: number | null;
  mediaPresent: boolean;
  mediaOutlets: string[];
  hasLiveStream: boolean;
  liveStreamUrl: string | null;
  speakingDurationMinutes: number | null;
  prepWindowMinutes: number;
  travelRequiresVehicle: boolean;
  travelNotes: string | null;
  talkingPoints: string[];
  briefingNotes: string | null;
  briefingDocumentUrl: string | null;
  dresscode: string | null;
  staffingNotes: string | null;
  securityNotes: string | null;
}

interface ScheduleItem {
  id: string;
  title: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  itemType: string;
  itemStatus: string;
  locationType: string;
  locationName: string | null;
  city: string | null;
  province: string | null;
  virtualUrl: string | null;
  ward: string | null;
  candidateAppearance: CandidateAppearance | null;
  assignments: Array<{
    roleOnItem: string | null;
    assignedUser: { id: string; name: string | null; avatarUrl: string | null; phone: string | null } | null;
  }>;
  conflictsSource: Array<{ id: string; conflictType: string; severity: string; entityLabel: string | null }>;
}

interface ScheduleMeta {
  total: number;
  nextDebate: { id: string; title: string; startAt: string } | null;
  nextMedia: { id: string; title: string; startAt: string } | null;
  electionDay: string | null;
  countByType: Record<string, number>;
}

interface SyncAccount {
  id: string;
  provider: string;
  externalCalendarName: string | null;
  syncDirection: string;
  syncStatus: string;
  lastSyncAt: string | null;
  lastSyncError: string | null;
  syncLogs: Array<{
    syncStartedAt: string;
    success: boolean;
    itemsPushed: number;
    itemsPulled: number;
    errorMessage: string | null;
  }>;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  candidate_appearance: "Appearance",
  debate:               "Debate",
  media_appearance:     "Media",
  fundraiser:           "Fundraiser",
  donor_meeting:        "Donor Meeting",
  town_hall:            "Town Hall",
  community_meeting:    "Community",
};

const TYPE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  debate:               { bg: "bg-red-50",    text: "text-red-800",    border: "border-red-200" },
  media_appearance:     { bg: "bg-blue-50",   text: "text-blue-800",   border: "border-blue-200" },
  candidate_appearance: { bg: "bg-emerald-50",text: "text-emerald-800",border: "border-emerald-200" },
  fundraiser:           { bg: "bg-amber-50",  text: "text-amber-800",  border: "border-amber-200" },
  donor_meeting:        { bg: "bg-violet-50", text: "text-violet-800", border: "border-violet-200" },
  town_hall:            { bg: "bg-cyan-50",   text: "text-cyan-800",   border: "border-cyan-200" },
  community_meeting:    { bg: "bg-teal-50",   text: "text-teal-800",   border: "border-teal-200" },
};

const FORMAT_LABELS: Record<string, string> = {
  speech:                 "Speech",
  panel_discussion:       "Panel",
  debate:                 "Debate",
  media_interview:        "Interview",
  media_scrum:            "Media Scrum",
  meet_and_greet:         "Meet & Greet",
  canvassing_walk:        "Canvassing Walk",
  ribbon_cutting:         "Ribbon Cutting",
  endorsement_event:      "Endorsement",
  community_consultation: "Consultation",
  town_hall_speaker:      "Town Hall",
  fundraiser_appearance:  "Fundraiser",
  door_to_door:           "Door to Door",
  phone_bank_shift:       "Phone Bank",
  other:                  "Appearance",
};

const SYNC_PROVIDERS: Record<string, { label: string; icon: string }> = {
  google_calendar: { label: "Google Calendar", icon: "G" },
  apple_calendar:  { label: "Apple Calendar",  icon: "A" },
  outlook:         { label: "Outlook",          icon: "O" },
  ical_feed:       { label: "iCal Feed",        icon: "C" },
};

const STATUS_COLORS: Record<string, string> = {
  confirmed:   "bg-emerald-100 text-emerald-800",
  scheduled:   "bg-blue-100 text-blue-800",
  tentative:   "bg-amber-100 text-amber-800",
  cancelled:   "bg-red-100 text-red-800",
  completed:   "bg-gray-100 text-gray-600",
  in_progress: "bg-purple-100 text-purple-800",
};

function daysUntil(dateStr: string): number {
  return differenceInDays(parseISO(dateStr), new Date());
}

// ─── Countdown Badge ──────────────────────────────────────────────────────────

function CountdownBadge({ startAt }: { startAt: string }) {
  const days = daysUntil(startAt);
  if (isPast(parseISO(startAt))) return <span className="text-xs text-gray-400">Past</span>;
  if (isToday(parseISO(startAt))) return <span className="text-xs font-bold text-red-600">TODAY</span>;
  if (days === 1) return <span className="text-xs font-semibold text-orange-600">Tomorrow</span>;
  if (days <= 7) return <span className="text-xs font-semibold text-amber-600">{days}d</span>;
  return <span className="text-xs text-gray-500">{days}d</span>;
}

// ─── Briefing Panel ───────────────────────────────────────────────────────────

function BriefingPanel({ item, onClose }: { item: ScheduleItem; onClose: () => void }) {
  const a = item.candidateAppearance;
  const colors = TYPE_COLORS[item.itemType] ?? TYPE_COLORS.candidate_appearance;

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-full max-w-xl z-40 bg-white shadow-2xl overflow-y-auto"
    >
      <div className={cn("px-6 py-5 border-b", colors.bg, colors.border)}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className={cn("text-xs font-semibold px-2 py-0.5 rounded capitalize", colors.bg, colors.text, "border", colors.border)}>
                {TYPE_LABELS[item.itemType] ?? item.itemType.replace(/_/g, " ")}
              </span>
              {a?.appearanceFormat && (
                <span className="text-xs text-gray-500">{FORMAT_LABELS[a.appearanceFormat] ?? a.appearanceFormat}</span>
              )}
              <span className={cn("text-xs px-2 py-0.5 rounded capitalize", STATUS_COLORS[item.itemStatus] ?? "bg-gray-100 text-gray-600")}>
                {item.itemStatus.replace(/_/g, " ")}
              </span>
            </div>
            <h2 className={cn("mt-2 text-lg font-bold leading-tight", colors.text)}>{item.title}</h2>
            <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-600">
              <span className="flex items-center gap-1">
                <Clock className="h-3.5 w-3.5" />
                {item.allDay
                  ? "All day"
                  : `${format(parseISO(item.startAt), "EEEE, MMM d · h:mm a")}${item.endAt ? ` – ${format(parseISO(item.endAt), "h:mm a")}` : ""}`}
              </span>
              {item.locationName && (
                <span className="flex items-center gap-1">
                  <MapPin className="h-3.5 w-3.5 shrink-0" />
                  {item.locationName}{item.city ? `, ${item.city}` : ""}
                </span>
              )}
              {item.virtualUrl && (
                <a href={item.virtualUrl} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:underline">
                  <Globe className="h-3.5 w-3.5" />
                  Virtual link <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 rounded-full p-1.5 hover:bg-white/60 transition-colors">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-6">
        {item.conflictsSource.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-center gap-2 text-red-700 font-semibold text-sm">
              <AlertTriangle className="h-4 w-4" />
              {item.conflictsSource.length} schedule conflict{item.conflictsSource.length > 1 ? "s" : ""}
            </div>
            {item.conflictsSource.map(c => (
              <p key={c.id} className="mt-1 text-xs text-red-600 capitalize">
                {c.conflictType.replace(/_/g, " ")} · {c.severity}
              </p>
            ))}
          </div>
        )}

        {a && (
          <div className="grid grid-cols-2 gap-3 text-sm">
            {a.speakingDurationMinutes != null && (
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Speaking</p>
                <p className="font-semibold text-gray-800">{a.speakingDurationMinutes} min</p>
              </div>
            )}
            <div className="rounded-lg bg-gray-50 px-3 py-2">
              <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Prep Window</p>
              <p className="font-semibold text-gray-800">{a.prepWindowMinutes} min before</p>
            </div>
            {a.expectedAttendees != null && (
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold">Expected</p>
                <p className="font-semibold text-gray-800">
                  {a.expectedAttendees === 0 ? "Broadcast" : `${a.expectedAttendees} people`}
                </p>
              </div>
            )}
            {a.dresscode && (
              <div className="rounded-lg bg-gray-50 px-3 py-2">
                <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold flex items-center gap-1">
                  <Shirt className="h-3 w-3" /> Dress
                </p>
                <p className="font-semibold text-gray-800">{a.dresscode}</p>
              </div>
            )}
            {a.travelRequiresVehicle && (
              <div className="col-span-2 rounded-lg bg-blue-50 px-3 py-2 flex items-center gap-2">
                <Bus className="h-4 w-4 text-blue-600 shrink-0" />
                <p className="text-sm text-blue-800">
                  Vehicle required{a.travelNotes ? ` — ${a.travelNotes}` : ""}
                </p>
              </div>
            )}
          </div>
        )}

        {a && (a.hostOrganization || a.hostContactName) && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Host</h3>
            <div className="rounded-lg border border-gray-200 px-4 py-3 space-y-1">
              {a.hostOrganization && <p className="font-semibold text-gray-800">{a.hostOrganization}</p>}
              {a.hostContactName && <p className="text-sm text-gray-600">{a.hostContactName}</p>}
              <div className="flex flex-wrap gap-3 mt-1">
                {a.hostContactPhone && (
                  <a href={`tel:${a.hostContactPhone}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Phone className="h-3 w-3" />{a.hostContactPhone}
                  </a>
                )}
                {a.hostContactEmail && (
                  <a href={`mailto:${a.hostContactEmail}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Mail className="h-3 w-3" />{a.hostContactEmail}
                  </a>
                )}
              </div>
            </div>
          </div>
        )}

        {a && (a.mediaPresent || a.hasLiveStream) && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
              <Tv2 className="h-3.5 w-3.5" /> Media
            </h3>
            <div className="rounded-lg border border-gray-200 px-4 py-3 space-y-2">
              {a.mediaPresent && a.mediaOutlets.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {a.mediaOutlets.map(outlet => (
                    <span key={outlet} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded px-2 py-0.5">
                      {outlet}
                    </span>
                  ))}
                </div>
              )}
              {a.hasLiveStream && (
                <div className="flex items-center gap-2 text-sm">
                  <Radio className="h-3.5 w-3.5 text-red-500" />
                  <span className="text-red-600 font-medium">Live stream</span>
                  {a.liveStreamUrl && (
                    <a href={a.liveStreamUrl} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:underline flex items-center gap-0.5">
                      Link <ExternalLink className="h-3 w-3" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {a && a.talkingPoints.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
              <AlignLeft className="h-3.5 w-3.5" /> Talking Points
            </h3>
            <ol className="space-y-2">
              {a.talkingPoints.map((pt, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="shrink-0 h-5 w-5 rounded-full bg-[#0A2342] text-white text-[10px] font-bold flex items-center justify-center">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-700 leading-snug">{pt}</p>
                </li>
              ))}
            </ol>
          </div>
        )}

        {a?.briefingNotes && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
              <FileText className="h-3.5 w-3.5" /> Briefing Notes
            </h3>
            <div className="rounded-lg bg-amber-50 border border-amber-200 px-4 py-3 text-sm text-amber-900 whitespace-pre-line">
              {a.briefingNotes}
            </div>
          </div>
        )}

        {a?.staffingNotes && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Staffing
            </h3>
            <p className="text-sm text-gray-700 rounded-lg border border-gray-200 px-4 py-3">{a.staffingNotes}</p>
          </div>
        )}

        {a?.securityNotes && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2 flex items-center gap-1">
              <Shield className="h-3.5 w-3.5" /> Security
            </h3>
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-900">
              {a.securityNotes}
            </div>
          </div>
        )}

        {item.assignments.length > 0 && (
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">Team</h3>
            <div className="space-y-2">
              {item.assignments.map((asn, i) => (
                <div key={i} className="flex items-center justify-between rounded-lg border border-gray-100 px-3 py-2">
                  <span className="text-sm font-medium text-gray-800">{asn.assignedUser?.name ?? "Unknown"}</span>
                  <span className="text-xs text-gray-400 capitalize">
                    {asn.roleOnItem?.replace(/_/g, " ") ?? "assigned"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {a?.briefingDocumentUrl && (
          <a href={a.briefingDocumentUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-2 text-sm text-blue-600 hover:underline">
            <FileText className="h-4 w-4" />
            Open briefing document
            <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
    </motion.div>
  );
}

// ─── Sync Panel ───────────────────────────────────────────────────────────────

function SyncPanel({ onClose }: { onClose: () => void }) {
  const [accounts, setAccounts] = useState<SyncAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [connecting, setConnecting] = useState<string | null>(null);
  const [triggering, setTriggering] = useState<string | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/campaign-calendar/sync");
      const json = await res.json();
      setAccounts(json.data ?? []);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

  async function handleConnect(provider: string) {
    setConnecting(provider);
    try {
      const res = await fetch("/api/campaign-calendar/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider }),
      });
      if (res.ok) await fetchAccounts();
    } finally {
      setConnecting(null);
    }
  }

  async function handleDisconnect(accountId: string) {
    await fetch(`/api/campaign-calendar/sync/${accountId}`, { method: "DELETE" });
    await fetchAccounts();
  }

  async function handleTrigger(accountId: string) {
    setTriggering(accountId);
    try {
      await fetch(`/api/campaign-calendar/sync/${accountId}/trigger`, { method: "POST" });
      await fetchAccounts();
    } finally {
      setTriggering(null);
    }
  }

  const connectedProviders = new Set(accounts.map(a => a.provider));

  return (
    <motion.div
      initial={{ x: "100%" }}
      animate={{ x: 0 }}
      exit={{ x: "100%" }}
      transition={{ type: "spring", stiffness: 300, damping: 30 }}
      className="fixed right-0 top-0 h-full w-full max-w-md z-40 bg-white shadow-2xl overflow-y-auto"
    >
      <div className="px-6 py-5 border-b bg-gray-50">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Calendar Sync</h2>
            <p className="text-sm text-gray-500 mt-0.5">Connect external calendars</p>
          </div>
          <button onClick={onClose} className="rounded-full p-1.5 hover:bg-gray-200 transition-colors">
            <X className="h-4 w-4 text-gray-600" />
          </button>
        </div>
      </div>

      <div className="px-6 py-5 space-y-4">
        <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3 flex items-start gap-2">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <p className="text-xs text-blue-800">
            Calendar sync is in preview. Connect your account to register it — live OAuth and
            two-way sync will be enabled in a future release.
          </p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          </div>
        ) : (
          Object.entries(SYNC_PROVIDERS).map(([key, meta]) => {
            const account = accounts.find(a => a.provider === key);
            const isConnected = connectedProviders.has(key);

            return (
              <div key={key} className="rounded-lg border border-gray-200 px-4 py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <span className="h-8 w-8 rounded-full bg-gray-100 flex items-center justify-center text-sm font-bold text-gray-600">
                      {meta.icon}
                    </span>
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{meta.label}</p>
                      {account && (
                        <p className={cn("text-xs mt-0.5 capitalize", {
                          "text-emerald-600": account.syncStatus === "active",
                          "text-amber-600":   account.syncStatus === "pending_auth" || account.syncStatus === "paused",
                          "text-red-600":     account.syncStatus === "error" || account.syncStatus === "disconnected",
                        })}>
                          {account.syncStatus.replace(/_/g, " ")}
                          {account.lastSyncAt && ` · ${format(parseISO(account.lastSyncAt), "MMM d h:mm a")}`}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {isConnected && account && (
                      <button
                        onClick={() => handleTrigger(account.id)}
                        disabled={triggering === account.id}
                        className="text-xs text-gray-500 hover:text-gray-800 flex items-center gap-1 disabled:opacity-50"
                      >
                        {triggering === account.id
                          ? <Loader2 className="h-3 w-3 animate-spin" />
                          : <RefreshCw className="h-3 w-3" />}
                        Sync
                      </button>
                    )}
                    {isConnected ? (
                      <button
                        onClick={() => handleDisconnect(account!.id)}
                        className="flex items-center gap-1 text-xs text-red-600 hover:text-red-800"
                      >
                        <Unlink className="h-3.5 w-3.5" />
                        Disconnect
                      </button>
                    ) : (
                      <button
                        onClick={() => handleConnect(key)}
                        disabled={connecting === key}
                        className="flex items-center gap-1 text-xs font-medium text-[#0A2342] hover:text-[#1D9E75] disabled:opacity-50"
                      >
                        {connecting === key
                          ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          : <Link2 className="h-3.5 w-3.5" />}
                        Connect
                      </button>
                    )}
                  </div>
                </div>
                {account?.syncLogs[0] && (
                  <div className="mt-3 pt-3 border-t border-gray-100 text-xs text-gray-500">
                    Last sync: {account.syncLogs[0].itemsPushed} pushed · {account.syncLogs[0].itemsPulled} pulled
                    {account.syncLogs[0].errorMessage && (
                      <p className="text-amber-600 mt-0.5">{account.syncLogs[0].errorMessage}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </motion.div>
  );
}

// ─── Schedule Item Card ───────────────────────────────────────────────────────

function ScheduleCard({ item, onClick }: { item: ScheduleItem; onClick: (item: ScheduleItem) => void }) {
  const colors = TYPE_COLORS[item.itemType] ?? TYPE_COLORS.candidate_appearance;
  const a = item.candidateAppearance;
  const past = isPast(parseISO(item.endAt ?? item.startAt));

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ scale: 1.005 }}
      className={cn(
        "rounded-xl border cursor-pointer transition-shadow hover:shadow-md",
        colors.bg, colors.border,
        past && "opacity-60"
      )}
      onClick={() => onClick(item)}
    >
      <div className="px-4 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap mb-1.5">
              <span className={cn("text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border", colors.bg, colors.text, colors.border)}>
                {TYPE_LABELS[item.itemType] ?? item.itemType.replace(/_/g, " ")}
              </span>
              {a?.appearanceFormat && (
                <span className="text-[10px] text-gray-500">{FORMAT_LABELS[a.appearanceFormat]}</span>
              )}
              {a?.mediaPresent && (
                <span className="flex items-center gap-0.5 text-[10px] text-blue-600">
                  <Tv2 className="h-3 w-3" /> Media
                </span>
              )}
              {a?.hasLiveStream && (
                <span className="flex items-center gap-0.5 text-[10px] text-red-600">
                  <Radio className="h-3 w-3" /> Live
                </span>
              )}
              {item.conflictsSource.some(c => c.severity === "blocking") && (
                <span className="flex items-center gap-0.5 text-[10px] text-red-700 font-bold">
                  <AlertTriangle className="h-3 w-3" /> Conflict
                </span>
              )}
            </div>

            <p className={cn("font-semibold text-sm leading-tight", colors.text)}>{item.title}</p>

            <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-gray-500">
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {item.allDay
                  ? format(parseISO(item.startAt), "EEE, MMM d")
                  : `${format(parseISO(item.startAt), "EEE, MMM d")} · ${format(parseISO(item.startAt), "h:mm a")}`}
              </span>
              {item.locationName && (
                <span className="flex items-center gap-1 truncate max-w-[180px]">
                  <MapPin className="h-3 w-3 shrink-0" />{item.locationName}
                </span>
              )}
              {a?.hostOrganization && (
                <span className="truncate max-w-[160px] text-gray-400">{a.hostOrganization}</span>
              )}
            </div>
          </div>

          <div className="shrink-0 flex flex-col items-end gap-2">
            <CountdownBadge startAt={item.startAt} />
            <span className={cn("text-[10px] px-1.5 py-0.5 rounded capitalize", STATUS_COLORS[item.itemStatus] ?? "bg-gray-100 text-gray-600")}>
              {item.itemStatus.replace(/_/g, " ")}
            </span>
            {item.assignments.length > 0 && (
              <span className="flex items-center gap-0.5 text-[10px] text-gray-400">
                <Users className="h-3 w-3" />{item.assignments.length}
              </span>
            )}
          </div>
        </div>

        {a && a.talkingPoints.length > 0 && (
          <div className="mt-3 pt-3 border-t border-current/10">
            <p className="text-[10px] uppercase tracking-wide text-gray-400 font-semibold mb-1">Talking Points</p>
            <ul className="space-y-0.5">
              {a.talkingPoints.slice(0, 2).map((pt, i) => (
                <li key={i} className="flex items-start gap-1.5 text-xs text-gray-600">
                  <span className="shrink-0 mt-0.5 h-3.5 w-3.5 rounded-full bg-current/10 flex items-center justify-center text-[9px] font-bold">
                    {i + 1}
                  </span>
                  <span className="line-clamp-1">{pt}</span>
                </li>
              ))}
              {a.talkingPoints.length > 2 && (
                <li className="text-[10px] text-gray-400 ml-5">+{a.talkingPoints.length - 2} more</li>
              )}
            </ul>
          </div>
        )}
      </div>
    </motion.div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function CandidateScheduleClient({ campaignId }: { campaignId: string | null }) {
  const [items, setItems] = useState<ScheduleItem[]>([]);
  const [meta, setMeta] = useState<ScheduleMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailItem, setDetailItem] = useState<ScheduleItem | null>(null);
  const [showSync, setShowSync] = useState(false);
  const [filter, setFilter] = useState<"all" | "upcoming" | "past">("upcoming");

  const fetchSchedule = useCallback(async () => {
    if (!campaignId) return;
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filter === "upcoming") {
        params.set("start", new Date().toISOString());
      } else if (filter === "past") {
        params.set("end", new Date().toISOString());
        params.set("start", new Date("2026-01-01").toISOString());
      }
      const res = await fetch(`/api/campaign-calendar/candidate-schedule?${params}`);
      const json = await res.json();
      setItems(json.data ?? []);
      setMeta(json.meta ?? null);
    } finally {
      setLoading(false);
    }
  }, [campaignId, filter]);

  useEffect(() => { fetchSchedule(); }, [fetchSchedule]);

  if (!campaignId) {
    return (
      <div className="flex h-96 items-center justify-center">
        <EmptyState
          title="No campaign active"
          description="Activate a campaign to view the candidate schedule. Go to Campaign Settings to set up your campaign."
          action={
            <Link
              href="/settings"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A2342] hover:bg-[#0d2e57] transition-colors"
            >
              Go to Campaign Settings
            </Link>
          }
        />
      </div>
    );
  }

  const daysToElection = meta?.electionDay ? daysUntil(meta.electionDay) : null;
  const nextDebateDays  = meta?.nextDebate  ? daysUntil(meta.nextDebate.startAt)  : null;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-[#0A2342] text-white">
        <div className="mx-auto max-w-4xl px-4 py-6">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Link href="/calendar" className="rounded-full p-1.5 hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </Link>
              <div>
                <div className="flex items-center gap-2">
                  <Mic2 className="h-5 w-5 text-[#1D9E75]" />
                  <h1 className="text-xl font-bold">Candidate Schedule</h1>
                </div>
                <p className="text-sm text-white/60 mt-0.5">Appearances · Debates · Media</p>
              </div>
            </div>
            <button
              onClick={() => setShowSync(true)}
              className="flex items-center gap-1.5 rounded-lg border border-white/20 bg-white/10 px-3 py-1.5 text-sm hover:bg-white/20 transition-colors"
            >
              <CalendarDays className="h-4 w-4" />
              Sync
            </button>
          </div>

          {/* Stats */}
          <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {daysToElection != null && daysToElection >= 0 && (
              <div className="rounded-lg bg-white/10 px-3 py-2.5 text-center">
                <p className="text-2xl font-bold text-[#EF9F27]">{daysToElection}</p>
                <p className="text-[11px] text-white/60 mt-0.5">Days to Election</p>
              </div>
            )}
            {nextDebateDays != null && nextDebateDays >= 0 && (
              <div className="rounded-lg bg-white/10 px-3 py-2.5 text-center">
                <p className="text-2xl font-bold text-[#E24B4A]">{nextDebateDays}</p>
                <p className="text-[11px] text-white/60 mt-0.5">Days to Next Debate</p>
              </div>
            )}
            {meta?.countByType.debate != null && (
              <div className="rounded-lg bg-white/10 px-3 py-2.5 text-center">
                <p className="text-2xl font-bold text-white">{meta.countByType.debate}</p>
                <p className="text-[11px] text-white/60 mt-0.5">Debates</p>
              </div>
            )}
            {meta != null && (
              <div className="rounded-lg bg-white/10 px-3 py-2.5 text-center">
                <p className="text-2xl font-bold text-white">{meta.total}</p>
                <p className="text-[11px] text-white/60 mt-0.5">Total Events</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filter bar */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="mx-auto max-w-4xl px-4">
          <div className="flex items-center gap-1 py-2">
            {(["upcoming", "all", "past"] as const).map(f => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "rounded-full px-4 py-1.5 text-sm font-medium transition-colors capitalize",
                  filter === f ? "bg-[#0A2342] text-white" : "text-gray-600 hover:bg-gray-100"
                )}
              >
                {f}
              </button>
            ))}
            <div className="ml-auto flex items-center gap-2 text-xs text-gray-400">
              <Zap className="h-3 w-3" />
              {loading ? "Loading..." : `${items.length} events`}
            </div>
          </div>
        </div>
      </div>

      {/* List */}
      <div className="mx-auto max-w-4xl px-4 py-6">
        {loading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-28 animate-pulse rounded-xl bg-gray-200" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            title="No events"
            description={filter === "upcoming" ? "No upcoming candidate events. Switch to 'All' to see past events, or sync your calendar to import existing events." : "No events in this time range. Sync your calendar or add events directly."}
            action={
              <button
                onClick={() => setShowSync(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white bg-[#0A2342] hover:bg-[#0d2e57] transition-colors"
              >
                <CalendarDays className="h-4 w-4" />
                Sync Calendar
              </button>
            }
          />
        ) : (
          <div className="space-y-3">
            {items.map(item => (
              <ScheduleCard key={item.id} item={item} onClick={setDetailItem} />
            ))}
          </div>
        )}
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {detailItem && (
          <>
            <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setDetailItem(null)} />
            <BriefingPanel item={detailItem} onClose={() => setDetailItem(null)} />
          </>
        )}
      </AnimatePresence>

      {/* Sync panel */}
      <AnimatePresence>
        {showSync && (
          <>
            <div className="fixed inset-0 z-30 bg-black/30" onClick={() => setShowSync(false)} />
            <SyncPanel onClose={() => setShowSync(false)} />
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
