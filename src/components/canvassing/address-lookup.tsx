"use client";
/**
 * Address Lookup — Instant voter profile + staff notification
 *
 * Canvasser types an address. Full voter profile appears.
 * Staff gets push notification + email instantly.
 * Works for: canvassers in the field, candidates at events, phone bankers.
 */
import { useState, useRef, useCallback, useEffect } from "react";
import { Search, MapPin, User, Phone, Mail, ChevronRight, Bell, Navigation } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { getSyncQueueCount, queueViaServiceWorker } from "@/lib/db/indexeddb";

interface LookupContact {
  id: string;
  firstName: string;
  lastName: string;
  address1: string;
  city: string;
  phone: string | null;
  email: string | null;
  supportLevel: string;
  gotvStatus: string;
  followUpNeeded: boolean;
  signRequested: boolean;
  volunteerInterest: boolean;
  notes: string | null;
  preferredLanguage: string | null;
  accessibilityNeeds: string[];
  issues: string[];
  totalVotersAtAddress?: number;
  _count: { interactions: number };
}

interface Props { campaignId: string; }

const SUPPORT_COLORS: Record<string, string> = {
  strong_support: "text-emerald-600",
  leaning_support: "text-green-600",
  undecided: "text-amber-600",
  leaning_opposition: "text-orange-600",
  strong_opposition: "text-red-600",
  unknown: "text-gray-400",
};

const SUPPORT_LABELS: Record<string, string> = {
  strong_support: "Strong Supporter",
  leaning_support: "Leaning Support",
  undecided: "Undecided",
  leaning_opposition: "Leaning No",
  strong_opposition: "Opposition",
  unknown: "Unknown",
};

export default function AddressLookup({ campaignId }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<LookupContact[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedContact, setSelectedContact] = useState<LookupContact | null>(null);
  const [notifying, setNotifying] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout>();

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setSearching(true);
    try {
      const res = await fetch(`/api/contacts?campaignId=${campaignId}&search=${encodeURIComponent(q)}&pageSize=10`);
      const data = await res.json();
      setResults(data.data ?? []);
    } finally { setSearching(false); }
  }, [campaignId]);

  function handleInput(value: string) {
    setQuery(value);
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(value), 300);
  }

  async function notifyStaff(contact: LookupContact, event: string) {
    setNotifying(true);
    try {
      await fetch("/api/notifications/staff-alert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          contactId: contact.id,
          event,
          message: `${event} at ${contact.address1}: ${contact.firstName} ${contact.lastName}`,
        }),
      });
      toast.success("✅ Staff notified");
    } finally { setNotifying(false); }
  }

  return (
    <div className="space-y-4">
      {/* Search input */}
      <div className="relative">
        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        {searching && <div className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />}
        <input
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Type address or voter name…"
          className="w-full pl-11 pr-4 py-3.5 border-2 border-gray-200 rounded-2xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm"
          autoComplete="off"
          autoCapitalize="off"
        />
      </div>

      {/* Results list */}
      {results.length > 0 && !selectedContact && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="divide-y divide-gray-50">
            {results.map(contact => (
              <button key={contact.id} onClick={() => setSelectedContact(contact)}
                className="w-full text-left px-4 py-3.5 hover:bg-gray-50 transition-colors flex items-center gap-3">
                <div className="w-9 h-9 bg-blue-100 rounded-full flex items-center justify-center flex-shrink-0">
                  <User className="w-4 h-4 text-blue-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{contact.firstName} {contact.lastName}</p>
                  <p className="text-xs text-gray-500 truncate">{contact.address1}{contact.city && `, ${contact.city}`}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className={cn("text-xs font-semibold", SUPPORT_COLORS[contact.supportLevel])}>
                    {SUPPORT_LABELS[contact.supportLevel]}
                  </p>
                  {contact.totalVotersAtAddress && contact.totalVotersAtAddress > 1 && (
                    <p className="text-xs text-gray-400">{contact.totalVotersAtAddress} voters</p>
                  )}
                </div>
                <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />
              </button>
            ))}
          </div>
        </div>
      )}

      {query.length >= 3 && results.length === 0 && !searching && (
        <div className="bg-white rounded-2xl border border-gray-200 p-6 text-center">
          <MapPin className="w-8 h-8 text-gray-300 mx-auto mb-2" />
          <p className="text-sm font-medium text-gray-600">No contacts found</p>
          <p className="text-xs text-gray-400 mt-1">They may not be in the voter file</p>
        </div>
      )}

      {/* Contact detail card */}
      {selectedContact && (
        <ContactDetailCard
          contact={selectedContact}
          onBack={() => { setSelectedContact(null); setQuery(""); setResults([]); }}
          onNotifyStaff={notifyStaff}
          notifying={notifying}
          campaignId={campaignId}
        />
      )}
    </div>
  );
}

function ContactDetailCard({ contact, onBack, onNotifyStaff, notifying, campaignId }: {
  contact: LookupContact; onBack: () => void;
  onNotifyStaff: (contact: LookupContact, event: string) => void;
  notifying: boolean; campaignId: string;
}) {
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(contact.address1 + " " + contact.city)}`;
  const [pendingQueue, setPendingQueue] = useState(0);
  const [runningAction, setRunningAction] = useState<string | null>(null);

  useEffect(() => {
    getSyncQueueCount().then(setPendingQueue).catch(() => setPendingQueue(0));
  }, []);

  async function getCoords() {
    if (typeof navigator === "undefined" || !navigator.geolocation) return {};
    return new Promise<{ latitude?: number; longitude?: number }>((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ latitude: pos.coords.latitude, longitude: pos.coords.longitude }),
        () => resolve({}),
        { maximumAge: 60_000, timeout: 2500 }
      );
    });
  }

  async function runQuickAction(action: "supporter" | "soft_support" | "undecided" | "against" | "note", applyHousehold = false) {
    const note = action === "note" ? window.prompt("Add note")?.trim() : undefined;
    if (action === "note" && !note) return;

    setRunningAction(action);
    const coords = await getCoords();
    const payload = {
      contactId: contact.id,
      action,
      note,
      applyHousehold,
      ...coords,
    };

    try {
      const res = await fetch("/api/lookup/quick-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error("lookup action failed");
      toast.success("Saved");
    } catch {
      await queueViaServiceWorker({
        url: "/api/lookup/quick-action",
        method: "POST",
        body: payload,
        label: `${action} via address lookup`,
      });
      const count = await getSyncQueueCount().catch(() => pendingQueue + 1);
      setPendingQueue(count);
      toast("Offline: queued action for sync");
    } finally {
      setRunningAction(null);
    }
  }

  const QUICK_ALERTS = [
    { label: "🪧 Sign Request", event: "sign_request" },
    { label: "🙋 Volunteer Interest", event: "volunteer_signup" },
    { label: "🔁 Follow-up Needed", event: "follow_up_needed" },
    { label: "💰 Donation Interest", event: "donation_interest" },
    { label: "⭐ Key Supporter", event: "key_supporter" },
  ];

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      {/* Header */}
      <div className={cn("px-4 py-4 border-l-4",
        contact.supportLevel === "strong_support" ? "border-l-emerald-500 bg-emerald-50" :
        contact.supportLevel === "leaning_support" ? "border-l-green-400 bg-green-50" :
        contact.supportLevel === "undecided" ? "border-l-amber-400 bg-amber-50" :
        contact.supportLevel === "strong_opposition" ? "border-l-red-500 bg-red-50" : "border-l-gray-300 bg-gray-50")}>
        <button onClick={onBack} className="text-xs text-gray-500 mb-2 hover:text-gray-700">← Back to search</button>
        <div className="flex items-start justify-between">
          <div>
            <p className="font-bold text-gray-900 text-lg">{contact.firstName} {contact.lastName}</p>
            <p className="text-sm text-gray-600">{contact.address1}{contact.city && `, ${contact.city}`}</p>
            {contact.totalVotersAtAddress && contact.totalVotersAtAddress > 1 && (
              <p className="text-xs text-gray-500 mt-0.5">{contact.totalVotersAtAddress} registered voters at this address</p>
            )}
          </div>
          <div className="text-right">
            <p className={cn("text-sm font-bold", SUPPORT_COLORS[contact.supportLevel])}>
              {SUPPORT_LABELS[contact.supportLevel]}
            </p>
            <p className="text-xs text-gray-400">{contact._count.interactions} interactions</p>
          </div>
        </div>

        {/* Contact actions */}
        <div className="flex gap-2 mt-3">
          {contact.phone && (
            <a href={`tel:${contact.phone}`}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold active:scale-95 transition-all">
              <Phone className="w-3.5 h-3.5" />{contact.phone}
            </a>
          )}
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white border border-gray-200 text-gray-700 rounded-xl text-sm font-semibold active:scale-95 transition-all">
            <Navigation className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>

      {/* Info fields */}
      <div className="px-4 py-3 space-y-2 border-b border-gray-100">
        {contact.gotvStatus && contact.gotvStatus !== "not_checked" && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">GOTV</span>
            <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full",
              contact.gotvStatus === "voted" ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-600")}>
              {contact.gotvStatus}
            </span>
          </div>
        )}
        {contact.issues.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 w-20 mt-0.5">Issues</span>
            <div className="flex flex-wrap gap-1">
              {contact.issues.map(i => <span key={i} className="text-xs bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full">{i}</span>)}
            </div>
          </div>
        )}
        {contact.notes && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 w-20 mt-0.5">Notes</span>
            <p className="text-xs text-gray-700 flex-1">{contact.notes}</p>
          </div>
        )}
        {contact.preferredLanguage && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-500 w-20">Language</span>
            <span className="text-xs font-medium text-blue-700">{contact.preferredLanguage}</span>
          </div>
        )}
        {contact.accessibilityNeeds?.length > 0 && (
          <div className="flex items-start gap-2">
            <span className="text-xs text-gray-500 w-20 mt-0.5">Access</span>
            <p className="text-xs text-gray-700 flex-1">{contact.accessibilityNeeds.join(", ")}</p>
          </div>
        )}
      </div>

      <div className="px-4 py-3 border-b border-gray-100 space-y-2">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Quick Field Actions</p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => runQuickAction("supporter")} disabled={!!runningAction} className="text-xs px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 font-medium">Mark supporter</button>
          <button onClick={() => runQuickAction("soft_support")} disabled={!!runningAction} className="text-xs px-3 py-1.5 rounded-full bg-green-100 text-green-700 font-medium">Mark soft supporter</button>
          <button onClick={() => runQuickAction("undecided")} disabled={!!runningAction} className="text-xs px-3 py-1.5 rounded-full bg-amber-100 text-amber-700 font-medium">Mark undecided</button>
          <button onClick={() => runQuickAction("against")} disabled={!!runningAction} className="text-xs px-3 py-1.5 rounded-full bg-red-100 text-red-700 font-medium">Mark against</button>
          <button onClick={() => runQuickAction("note")} disabled={!!runningAction} className="text-xs px-3 py-1.5 rounded-full bg-slate-100 text-slate-700 font-medium">Add note</button>
          {contact.totalVotersAtAddress && contact.totalVotersAtAddress > 1 && (
            <button onClick={() => runQuickAction("soft_support", true)} disabled={!!runningAction} className="text-xs px-3 py-1.5 rounded-full bg-indigo-100 text-indigo-700 font-medium">Household soft supporter</button>
          )}
        </div>
        {pendingQueue > 0 && <p className="text-xs text-amber-700">{pendingQueue} queued action(s) pending sync.</p>}
      </div>

      {/* Notify staff */}
      <div className="px-4 py-3">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2.5 flex items-center gap-1.5">
          <Bell className="w-3.5 h-3.5" />Notify Staff Instantly
        </p>
        <div className="flex flex-wrap gap-2">
          {QUICK_ALERTS.map(({ label, event }) => (
            <button key={event} onClick={() => onNotifyStaff(contact, event)} disabled={notifying}
              className="text-xs px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full font-medium hover:bg-blue-50 hover:text-blue-700 transition-colors active:scale-95 disabled:opacity-50">
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Full profile link */}
      <div className="px-4 pb-4">
        <a href={`/contacts/${contact.id}`}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-gray-50 text-gray-600 rounded-xl text-sm font-medium border border-gray-200 hover:bg-gray-100 transition-colors">
          View Full Profile <ChevronRight className="w-3.5 h-3.5" />
        </a>
      </div>
    </div>
  );
}
