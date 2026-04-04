"use client";
/**
 * Candidate Call List
 *
 * Auto-generated list of calls the candidate needs to make.
 * Designed for downtime — in a car, waiting at an event.
 * One tap to call. One tap to log outcome.
 * Syncs immediately to campaign CRM.
 *
 * Phone stays locked on this screen. No navigation needed.
 */
import { useState, useEffect } from "react";
import { Phone, CheckCircle, Clock, ChevronDown, ChevronUp, MessageSquare, X, RefreshCw } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface CallItem {
  id: string;
  contactId: string;
  firstName: string;
  lastName: string;
  phone: string;
  address: string;
  reason: string;       // why they need a call: "supporter_followup" | "donation_pledge" | "volunteer_interest" | "sign_request" | "custom"
  reasonNote: string;   // human-readable note from staff
  priority: "urgent" | "high" | "normal";
  staffNote: string;    // what the candidate should know
  lastContact?: string;
  supportLevel: string;
  status: "pending" | "called" | "voicemail" | "skipped";
}

interface Props { campaignId: string; }

const REASON_LABELS: Record<string, string> = {
  supporter_followup: "🤝 Supporter Follow-up",
  donation_pledge: "💰 Donation Pledge",
  volunteer_interest: "🙋 Wants to Volunteer",
  sign_request: "🪧 Requested Sign",
  undecided_voter: "🤔 Undecided — Needs Attention",
  vip_contact: "⭐ VIP / Key Contact",
  media: "📺 Media / Journalist",
  custom: "📌 Staff Note",
};

const OUTCOME_OPTIONS = [
  { value: "spoke", label: "✅ Spoke with them", color: "bg-emerald-500" },
  { value: "voicemail", label: "📩 Left voicemail", color: "bg-blue-500" },
  { value: "no_answer", label: "📵 No answer", color: "bg-gray-400" },
  { value: "callback", label: "🔁 Call back later", color: "bg-amber-500" },
  { value: "wrong_number", label: "❌ Wrong number", color: "bg-red-500" },
];

export default function CandidateCallList({ campaignId }: Props) {
  const [calls, setCalls] = useState<CallItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [logModal, setLogModal] = useState<{ callId: string; contactId: string } | null>(null);
  const [note, setNote] = useState("");
  const [logging, setLogging] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/call-list?campaignId=${campaignId}`);
      const data = await res.json();
      setCalls(data.data ?? []);
    } finally { setLoading(false); }
  }

  useEffect(() => { load(); }, [campaignId]);

  async function logOutcome(outcome: string) {
    if (!logModal) return;
    setLogging(true);
    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: logModal.contactId,
          type: "phone_call",
          notes: `Candidate call — ${outcome}${note ? `: ${note}` : ""}`,
          outcome,
        }),
      });
      await fetch(`/api/call-list/${logModal.callId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: outcome === "spoke" ? "called" : outcome === "voicemail" ? "voicemail" : "pending" }),
      });
      toast.success("Logged");
      setLogModal(null);
      setNote("");
      load();
    } finally { setLogging(false); }
  }

  const pending = calls.filter(c => c.status === "pending");
  const done = calls.filter(c => c.status !== "pending");

  if (loading) return (
    <div className="space-y-3 p-4 pt-12">
      {Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-20 bg-gray-100 rounded-2xl animate-pulse" />)}
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-blue-800 text-white px-4 pt-12 pb-4 sticky top-0 z-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="font-bold text-lg">Your Call List</h1>
            <p className="text-blue-300 text-xs">{pending.length} calls remaining · {done.length} completed</p>
          </div>
          <button onClick={load} className="text-blue-300 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
        {/* Progress bar */}
        <div className="mt-3 h-2 bg-white/20 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-500"
            style={{ width: calls.length > 0 ? `${(done.length / calls.length) * 100}%` : "0%" }} />
        </div>
      </div>

      <div className="px-4 py-4 pb-24 space-y-3">
        {pending.length === 0 && done.length === 0 && (
          <div className="text-center py-16 text-gray-400">
            <Phone className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="font-medium">No calls queued</p>
            <p className="text-sm">Your team will add calls here</p>
          </div>
        )}

        {pending.length === 0 && done.length > 0 && (
          <div className="text-center py-8 bg-emerald-50 rounded-2xl border border-emerald-200">
            <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
            <p className="font-bold text-emerald-700">All calls done! Great work 🎉</p>
          </div>
        )}

        {/* Pending calls */}
        {pending.map((call) => (
          <CallCard
            key={call.id}
            call={call}
            isActive={activeId === call.id}
            onToggle={() => setActiveId(activeId === call.id ? null : call.id)}
            onLogOutcome={() => setLogModal({ callId: call.id, contactId: call.contactId })}
          />
        ))}

        {/* Completed calls */}
        {done.length > 0 && (
          <div className="space-y-2">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide px-1">Completed</p>
            {done.map((call) => (
              <div key={call.id} className="flex items-center gap-3 px-4 py-3 bg-white rounded-xl border border-gray-100 opacity-60">
                <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-700 truncate">{call.firstName} {call.lastName}</p>
                  <p className="text-xs text-gray-400">{REASON_LABELS[call.reason] ?? call.reason}</p>
                </div>
                <span className={cn("text-xs px-2 py-0.5 rounded-full font-medium",
                  call.status === "called" ? "bg-emerald-100 text-emerald-700" :
                  call.status === "voicemail" ? "bg-blue-100 text-blue-700" : "bg-gray-100 text-gray-500")}>
                  {call.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Log outcome modal */}
      {logModal && (
        <div className="fixed inset-0 bg-black/50 flex items-end z-50" onClick={() => setLogModal(null)}>
          <div className="bg-white rounded-t-3xl w-full p-5 space-y-4" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">Log Call Outcome</h3>
              <button onClick={() => setLogModal(null)}><X className="w-5 h-5 text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-1 gap-2">
              {OUTCOME_OPTIONS.map(({ value, label, color }) => (
                <button key={value} onClick={() => !logging && logOutcome(value)} disabled={logging}
                  className={cn("py-3 px-4 rounded-xl text-white font-semibold text-sm active:scale-98 transition-all text-left disabled:opacity-50", color)}>
                  {label}
                </button>
              ))}
            </div>
            <div>
              <textarea value={note} onChange={e => setNote(e.target.value)}
                placeholder="Quick note (optional)…"
                className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50" rows={2} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function CallCard({ call, isActive, onToggle, onLogOutcome }: {
  call: CallItem; isActive: boolean; onToggle: () => void; onLogOutcome: () => void;
}) {
  const priorityStyle = call.priority === "urgent"
    ? "border-l-red-500 bg-red-50/30"
    : call.priority === "high"
    ? "border-l-amber-500"
    : "border-l-blue-400";

  return (
    <div className={cn("bg-white rounded-2xl border border-l-[5px] overflow-hidden shadow-sm", priorityStyle)}>
      <div className="px-4 py-3.5 cursor-pointer" onClick={onToggle}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="font-bold text-gray-900">{call.firstName} {call.lastName}</p>
              {call.priority === "urgent" && <span className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded-full font-bold">Urgent</span>}
            </div>
            <p className="text-xs text-gray-500 mt-0.5">{REASON_LABELS[call.reason] ?? call.reason}</p>
          </div>
          {isActive ? <ChevronUp className="w-4 h-4 text-gray-400 flex-shrink-0" /> : <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0" />}
        </div>

        {/* Always visible: call button */}
        <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
          <a href={`tel:${call.phone}`}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all">
            <Phone className="w-4 h-4" />{call.phone}
          </a>
          <button onClick={onLogOutcome}
            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm active:scale-95 transition-all">
            <MessageSquare className="w-4 h-4" />Log
          </button>
        </div>
      </div>

      {/* Expanded details */}
      {isActive && (
        <div className="border-t border-gray-100 px-4 py-3.5 bg-gray-50/50 space-y-2.5">
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Address</p>
            <p className="text-sm text-gray-700">{call.address}</p>
          </div>
          {call.staffNote && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Staff Notes</p>
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-3 py-2.5">
                <p className="text-sm text-amber-800">{call.staffNote}</p>
              </div>
            </div>
          )}
          {call.reasonNote && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Why this call</p>
              <p className="text-sm text-gray-700">{call.reasonNote}</p>
            </div>
          )}
          {call.lastContact && (
            <p className="text-xs text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />Last contact: {call.lastContact}</p>
          )}
        </div>
      )}
    </div>
  );
}
