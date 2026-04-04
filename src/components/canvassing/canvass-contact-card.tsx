"use client";
import { useState } from "react";
import { Phone, Navigation, ChevronDown, ChevronUp, Check, Home } from "lucide-react";
import { SupportLevelBadge } from "@/components/ui";
import { fullName, cn } from "@/lib/utils";
import { SupportLevel, InteractionType } from "@/types";
import { toast } from "sonner";

// Left border + background by support level — matches original Poll City color language
const SUPPORT_BORDER: Record<SupportLevel, string> = {
  strong_support: "border-l-emerald-500",
  leaning_support: "border-l-green-400",
  undecided: "border-l-amber-400",
  leaning_opposition: "border-l-orange-400",
  strong_opposition: "border-l-red-500",
  unknown: "border-l-gray-300",
};

const SUPPORT_BG: Record<SupportLevel, string> = {
  strong_support: "bg-emerald-50/60",
  leaning_support: "bg-green-50/60",
  undecided: "bg-amber-50/60",
  leaning_opposition: "bg-orange-50/60",
  strong_opposition: "bg-red-50/60",
  unknown: "bg-gray-50",
};

const QUICK_SUPPORT = [
  { value: "strong_support",   label: "✅ Strong",    bg: "bg-emerald-100 text-emerald-700 border-emerald-300" },
  { value: "leaning_support",  label: "👍 Leaning",   bg: "bg-green-100 text-green-700 border-green-300" },
  { value: "undecided",        label: "🤷 Undecided", bg: "bg-amber-100 text-amber-700 border-amber-300" },
  { value: "leaning_opposition",label: "👎 Leaning No",bg:"bg-orange-100 text-orange-700 border-orange-300" },
  { value: "strong_opposition",label: "❌ No",        bg: "bg-red-100 text-red-700 border-red-300" },
];

const GOTV_OPTIONS = [
  { value: "voted",     label: "✅ Voted",    bg: "bg-emerald-100 text-emerald-700" },
  { value: "will_vote", label: "🕐 Will Vote", bg: "bg-blue-100 text-blue-700" },
  { value: "not_home",  label: "🏠 Not Home",  bg: "bg-gray-100 text-gray-600" },
  { value: "refused",   label: "🚫 Refused",   bg: "bg-red-100 text-red-700" },
];

export interface CanvassContact {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  email: string | null;
  address1: string | null;
  streetNumber: string | null;
  city: string | null;
  supportLevel: SupportLevel;
  gotvStatus: string;
  notHome: boolean;
  followUpNeeded: boolean;
  signRequested: boolean;
  volunteerInterest: boolean;
  issues: string[];
  notes: string | null;
  totalVotersAtAddress?: number | null;
  _count?: { interactions: number };
}

interface Props {
  contact: CanvassContact;
  onUpdate: (contactId: string, updates: Partial<CanvassContact>) => void;
}

export default function CanvassContactCard({ contact, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localSupport, setLocalSupport] = useState(contact.supportLevel);
  const [localGotv, setLocalGotv] = useState(contact.gotvStatus);
  const [localNotHome, setLocalNotHome] = useState(contact.notHome);
  const [notes, setNotes] = useState("");
  const [justLogged, setJustLogged] = useState(false);

  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent((contact.address1 ?? "") + " " + (contact.city ?? ""))}`;

  async function patch(updates: Record<string, unknown>) {
    await fetch(`/api/contacts/${contact.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(updates),
    });
    onUpdate(contact.id, updates as Partial<CanvassContact>);
  }

  async function markNotHome() {
    const next = !localNotHome;
    setLocalNotHome(next);
    await patch({ notHome: next, gotvStatus: next ? "not_home" : "not_checked" });
    // Also log an interaction
    await fetch("/api/interactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contactId: contact.id, type: InteractionType.door_knock, notes: "Not home" }),
    });
    toast(next ? "🏠 Marked Not Home" : "Cleared Not Home");
  }

  async function logInteraction(type: string) {
    setSaving(true);
    try {
      await fetch("/api/interactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactId: contact.id,
          type,
          notes: notes || undefined,
          supportLevel: localSupport !== contact.supportLevel ? localSupport : undefined,
          followUpNeeded: contact.followUpNeeded,
        }),
      });
      if (localSupport !== contact.supportLevel) await patch({ supportLevel: localSupport });
      toast.success("✓ Logged");
      setJustLogged(true);
      setNotes("");
      setTimeout(() => setJustLogged(false), 2500);
      setExpanded(false);
    } catch { toast.error("Failed"); }
    finally { setSaving(false); }
  }

  async function setGotv(value: string) {
    setLocalGotv(value);
    await patch({ gotvStatus: value });
    toast.success("GOTV updated");
  }

  return (
    <div className={cn(
      "bg-white rounded-xl border border-l-[5px] overflow-hidden shadow-sm transition-all",
      localNotHome ? "border-l-gray-400 opacity-75" : SUPPORT_BORDER[localSupport],
    )}>
      {/* ── Card summary row ── */}
      <div
        className={cn("px-4 py-3 cursor-pointer", localNotHome ? "bg-gray-50" : expanded ? SUPPORT_BG[localSupport] : "hover:bg-gray-50/80")}
        onClick={() => !localNotHome && setExpanded(!expanded)}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <p className={cn("font-bold text-gray-900", localNotHome && "text-gray-400 line-through")}>
                {fullName(contact.firstName, contact.lastName)}
              </p>
              {justLogged && (
                <span className="text-xs bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full flex items-center gap-1">
                  <Check className="w-3 h-3" />Logged
                </span>
              )}
              {localNotHome && (
                <span className="text-xs bg-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-medium">Not Home</span>
              )}
            </div>
            {contact.address1 && (
              <p className="text-xs text-gray-500 mt-0.5 truncate">
                {contact.address1}{contact.city && `, ${contact.city}`}
                {contact.totalVotersAtAddress && contact.totalVotersAtAddress > 1 && (
                  <span className="text-gray-400"> · {contact.totalVotersAtAddress} voters</span>
                )}
              </p>
            )}
            {!localNotHome && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                <SupportLevelBadge level={localSupport} />
                {contact.followUpNeeded && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full border border-amber-200">Follow-up</span>}
                {contact.signRequested && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 rounded-full border border-orange-200">Sign</span>}
                {contact._count && contact._count.interactions > 0 && (
                  <span className="text-xs text-gray-400">{contact._count.interactions}×</span>
                )}
              </div>
            )}
          </div>

          {/* Always-visible action buttons */}
          <div className="flex items-center gap-1.5 flex-shrink-0 mt-0.5">
            {contact.phone && (
              <a href={`tel:${contact.phone}`} onClick={e => e.stopPropagation()}
                className="w-9 h-9 bg-blue-50 rounded-full flex items-center justify-center hover:bg-blue-100 transition-colors">
                <Phone className="w-4 h-4 text-blue-600" />
              </a>
            )}
            <a href={mapsUrl} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()}
              className="w-9 h-9 bg-green-50 rounded-full flex items-center justify-center hover:bg-green-100 transition-colors">
              <Navigation className="w-4 h-4 text-green-600" />
            </a>
            {!localNotHome && (
              expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />
            )}
          </div>
        </div>

        {/* ── NOT HOME — primary one-tap action (always shown, not buried) ── */}
        <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
          <button
            onClick={markNotHome}
            className={cn(
              "flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border-2 transition-all active:scale-95 flex-1",
              localNotHome
                ? "bg-gray-200 text-gray-600 border-gray-300"
                : "bg-white text-gray-600 border-gray-200 hover:border-gray-400 hover:bg-gray-50"
            )}
          >
            <Home className="w-3.5 h-3.5" />
            {localNotHome ? "✓ Not Home" : "Not Home"}
          </button>
          {!localNotHome && !expanded && (
            <button
              onClick={() => setExpanded(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold bg-blue-600 text-white border-2 border-blue-600 transition-all active:scale-95 flex-1"
            >
              🚪 Log Visit
            </button>
          )}
        </div>
      </div>

      {/* ── Expanded interaction entry ── */}
      {expanded && !localNotHome && (
        <div className="px-4 py-4 border-t border-gray-100 space-y-4 bg-white">

          {/* Previous notes */}
          {contact.notes && (
            <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 italic border border-gray-100">
              "{contact.notes}"
            </p>
          )}

          {/* Issues */}
          {contact.issues.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {contact.issues.map(i => (
                <span key={i} className="text-xs bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">{i}</span>
              ))}
            </div>
          )}

          {/* Support level quick-set */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Support</p>
            <div className="flex flex-wrap gap-1.5">
              {QUICK_SUPPORT.map(({ value, label, bg }) => (
                <button key={value} onClick={() => setLocalSupport(value as SupportLevel)}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-full border font-medium transition-all active:scale-95",
                    localSupport === value ? bg + " ring-2 ring-offset-1 ring-blue-400" : "bg-white text-gray-500 border-gray-200"
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* GOTV */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">GOTV</p>
            <div className="flex flex-wrap gap-1.5">
              {GOTV_OPTIONS.map(({ value, label, bg }) => (
                <button key={value} onClick={() => setGotv(value)}
                  className={cn(
                    "text-xs px-2.5 py-1.5 rounded-full font-medium transition-all active:scale-95",
                    localGotv === value ? bg + " ring-2 ring-offset-1 ring-blue-400" : "bg-gray-100 text-gray-600 hover:bg-gray-200"
                  )}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          {/* Quick flags */}
          <div className="flex flex-wrap gap-2">
            {[
              { label: "Follow-up", field: "followUpNeeded" as const, active: contact.followUpNeeded, color: "amber" },
              { label: "Sign", field: "signRequested" as const, active: contact.signRequested, color: "orange" },
              { label: "Volunteer", field: "volunteerInterest" as const, active: contact.volunteerInterest, color: "blue" },
            ].map(({ label, field, active, color }) => (
              <button key={field}
                onClick={async () => { await patch({ [field]: !active }); toast.success(`${label} ${!active ? "set" : "cleared"}`); }}
                className={cn(
                  "text-xs px-3 py-1.5 rounded-full border font-medium transition-all active:scale-95",
                  active
                    ? `bg-${color}-100 text-${color}-700 border-${color}-300`
                    : "bg-white text-gray-500 border-gray-200 hover:border-gray-300"
                )}>
                {active ? "✓ " : ""}{label}
              </button>
            ))}
          </div>

          {/* Notes */}
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="Notes from this visit…"
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
            rows={2}
          />

          {/* Log buttons — 2×2 grid like original */}
          <div className="grid grid-cols-2 gap-2">
            <button onClick={() => logInteraction("door_knock")} disabled={saving}
              className="py-3 bg-blue-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50">
              🚪 Door Knock
            </button>
            <button onClick={() => logInteraction("phone_call")} disabled={saving}
              className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all disabled:opacity-50">
              📞 Phone Call
            </button>
            <button onClick={() => logInteraction("note")} disabled={saving}
              className="py-3 bg-gray-100 text-gray-700 rounded-xl font-medium text-sm active:scale-95 transition-all disabled:opacity-50">
              📝 Note
            </button>
            <button onClick={() => logInteraction("follow_up")} disabled={saving}
              className="py-3 bg-amber-100 text-amber-800 rounded-xl font-medium text-sm active:scale-95 transition-all disabled:opacity-50">
              🔁 Follow Up
            </button>
          </div>

          {/* Collapse */}
          <button onClick={() => setExpanded(false)} className="w-full text-xs text-gray-400 py-1 hover:text-gray-600 transition-colors">
            ↑ Collapse
          </button>
        </div>
      )}
    </div>
  );
}
