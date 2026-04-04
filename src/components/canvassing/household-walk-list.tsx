"use client";
/**
 * Household Walk List — offline-capable canvassing UX.
 *
 * Primary unit is the HOUSEHOLD (address), not the individual.
 * Offline: loads from IndexedDB cache, queues mutations for background sync.
 */
import { useState, useEffect, useCallback, useRef } from "react";
import { Search, Filter, Navigation, Phone, ChevronDown, ChevronUp, Users, WifiOff } from "lucide-react";

// Post canvasser GPS location to manager map (every 30s while on walk list)
function useGpsTracking(campaignId: string) {
  useEffect(() => {
    if (!("geolocation" in navigator)) return;
    let intervalId: ReturnType<typeof setInterval>;

    function postLocation(pos: GeolocationPosition) {
      fetch("/api/canvasser/location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          campaignId,
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        }),
      }).catch(() => { /* silent — offline */ });
    }

    navigator.geolocation.getCurrentPosition(postLocation, () => {}, { enableHighAccuracy: false });
    intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(postLocation, () => {}, { enableHighAccuracy: true });
    }, 30000);

    return () => clearInterval(intervalId);
  }, [campaignId]);
}
import { SupportLevelBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SupportLevel, SUPPORT_LEVEL_LABELS } from "@/types";
import { toast } from "sonner";
import OfflineIndicator, { OnlineDot } from "@/components/pwa/offline-indicator";
import {
  cacheWalkList,
  getCachedWalkList,
  queueViaServiceWorker,
  getSyncQueueCount,
} from "@/lib/db/indexeddb";

interface Person {
  id: string;
  firstName: string;
  lastName: string;
  phone: string | null;
  supportLevel: SupportLevel;
  gotvStatus: string;
  followUpNeeded: boolean;
  signRequested: boolean;
  volunteerInterest: boolean;
  issues: string[];
  notes: string | null;
  isDeceased: boolean;
  _count?: { interactions: number };
}

interface Household {
  key: string;
  lastName: string;
  address: string;
  city: string;
  streetNumber: string;
  notHome: boolean;
  people: Person[];
}

interface Props { campaignId: string; }

type OddEven = "all" | "odd" | "even";

const SUPPORT_QUICK = [
  { v: "strong_support",    l: "✅ Strong",    c: "bg-emerald-100 text-emerald-700" },
  { v: "leaning_support",   l: "👍 Leaning",   c: "bg-green-100 text-green-700" },
  { v: "undecided",         l: "🤷 Undecided", c: "bg-amber-100 text-amber-700" },
  { v: "leaning_opposition",l: "👎 No",        c: "bg-orange-100 text-orange-700" },
  { v: "strong_opposition", l: "❌ Strong No",  c: "bg-red-100 text-red-700" },
];

function groupContacts(contacts: (Person & {
  address1: string | null;
  streetNumber: string | null;
  city: string | null;
  notHome: boolean;
  householdId: string | null;
})[], oddEven: OddEven, activeFilter: string | null): Household[] {
  const grouped: Record<string, Household> = {};
  for (const c of contacts) {
    const key = c.address1 ?? c.id;
    const num = c.streetNumber ?? c.address1?.match(/^\d+/)?.[0] ?? "";
    if (!grouped[key]) {
      grouped[key] = {
        key,
        lastName: c.lastName,
        address: c.address1 ?? "Unknown address",
        city: c.city ?? "",
        streetNumber: num,
        notHome: c.notHome,
        people: [],
      };
    }
    grouped[key].people.push(c);
    if (c.lastName < grouped[key].lastName) grouped[key].lastName = c.lastName;
  }

  let hh = Object.values(grouped);

  if (oddEven !== "all") {
    hh = hh.filter(h => {
      const n = parseInt(h.streetNumber);
      return isNaN(n) ? true : oddEven === "odd" ? n % 2 !== 0 : n % 2 === 0;
    });
  }

  if (activeFilter === "support") hh = hh.filter(h => h.people.some(p => ["strong_support","leaning_support"].includes(p.supportLevel)));
  else if (activeFilter === "undecided") hh = hh.filter(h => h.people.some(p => p.supportLevel === "undecided"));
  else if (activeFilter === "opposition") hh = hh.filter(h => h.people.some(p => ["leaning_opposition","strong_opposition"].includes(p.supportLevel)));
  else if (activeFilter === "notHome") hh = hh.filter(h => h.notHome);
  else if (activeFilter === "followUp") hh = hh.filter(h => h.people.some(p => p.followUpNeeded));

  hh.sort((a, b) => parseInt(a.streetNumber || "99999") - parseInt(b.streetNumber || "99999"));
  return hh;
}

export default function HouseholdWalkList({ campaignId }: Props) {
  useGpsTracking(campaignId);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [fromCache, setFromCache] = useState(false);
  const [search, setSearch] = useState("");
  const [oddEven, setOddEven] = useState<OddEven>("all");
  const [showFilters, setShowFilters] = useState(false);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [pendingSync, setPendingSync] = useState(0);
  const rawContactsRef = useRef<Parameters<typeof groupContacts>[0]>([]);

  const load = useCallback(async () => {
    setLoading(true);
    setFromCache(false);
    try {
      const p = new URLSearchParams({ campaignId, pageSize: "200" });
      if (search) p.set("search", search);
      const res = await fetch(`/api/contacts?${p}`);
      const data = await res.json();

      if (data._offline) {
        throw new Error("offline");
      }

      const contacts = data.data ?? [];
      rawContactsRef.current = contacts;

      // Cache to IndexedDB for offline use
      try {
        await cacheWalkList(campaignId, contacts);
      } catch {
        // IDB not available — not critical
      }

      setHouseholds(groupContacts(contacts, oddEven, activeFilter));
    } catch {
      // Try IndexedDB cache
      try {
        const cached = await getCachedWalkList(campaignId);
        if (cached?.data) {
          const contacts = cached.data as Parameters<typeof groupContacts>[0];
          rawContactsRef.current = contacts;
          setHouseholds(groupContacts(contacts, oddEven, activeFilter));
          setFromCache(true);
          const mins = Math.round((Date.now() - cached.savedAt) / 60000);
          toast(`📦 Showing cached walk list (saved ${mins}m ago)`);
        } else {
          setHouseholds([]);
          toast.error("Offline and no cached data available");
        }
      } catch {
        setHouseholds([]);
      }
    } finally {
      setLoading(false);
    }
  }, [campaignId, search, oddEven, activeFilter]);

  useEffect(() => { load(); }, [load]);

  // Refresh pending sync count
  useEffect(() => {
    getSyncQueueCount().then(setPendingSync).catch(() => setPendingSync(0));
    if ("serviceWorker" in navigator) {
      const handler = (e: MessageEvent) => {
        const { type, count, remaining } = e.data || {};
        if (type === "SYNC_COUNT") setPendingSync(count ?? 0);
        if (type === "SYNC_COMPLETE") setPendingSync(remaining ?? 0);
        if (type === "QUEUED") setPendingSync((c) => c + 1);
      };
      navigator.serviceWorker.addEventListener("message", handler);
      return () => navigator.serviceWorker.removeEventListener("message", handler);
    }
  }, []);

  // Re-filter when oddEven/activeFilter change without re-fetching
  useEffect(() => {
    if (rawContactsRef.current.length > 0) {
      setHouseholds(groupContacts(rawContactsRef.current, oddEven, activeFilter));
    }
  }, [oddEven, activeFilter]);

  const stats = {
    total: households.length,
    support: households.filter(h => h.people.some(p => ["strong_support","leaning_support"].includes(p.supportLevel))).length,
    undecided: households.filter(h => h.people.some(p => p.supportLevel === "undecided")).length,
    opposition: households.filter(h => h.people.some(p => ["leaning_opposition","strong_opposition"].includes(p.supportLevel))).length,
    notHome: households.filter(h => h.notHome).length,
    followUp: households.filter(h => h.people.some(p => p.followUpNeeded)).length,
  };

  async function toggleNotHome(hh: Household) {
    const next = !hh.notHome;
    const isOnline = navigator.onLine;

    // Optimistic update
    setHouseholds(prev => prev.map(h =>
      h.key === hh.key ? { ...h, notHome: next } : h
    ));

    for (const p of hh.people) {
      try {
        if (isOnline) {
          const res = await fetch(`/api/contacts/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ notHome: next }),
          });
          if (!res.ok) throw new Error("Server error");
        } else {
          throw new Error("offline");
        }
      } catch {
        // Queue for background sync
        await queueViaServiceWorker({
          url: `/api/contacts/${p.id}`,
          method: "PATCH",
          body: { notHome: next },
          label: `${next ? "Not Home" : "Home"}: ${p.firstName} ${p.lastName}`,
        });
      }
    }

    toast(next ? "🏠 Marked Not Home" : "✓ Cleared Not Home");
    if (!isOnline) toast("📶 Will sync when back online");
  }

  function toggleExpand(key: string) {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const STAT_TILES = [
    { k: "total",      l: "Total",     bg: "bg-blue-700" },
    { k: "support",    l: "Support",   bg: "bg-emerald-600" },
    { k: "undecided",  l: "Undecided", bg: "bg-amber-500" },
    { k: "opposition", l: "No",        bg: "bg-red-600" },
    { k: "notHome",    l: "Not Home",  bg: "bg-gray-500" },
    { k: "followUp",   l: "Follow-up", bg: "bg-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-blue-800 text-white">
        <div className="px-4 pt-12 pb-2">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <h1 className="font-bold text-lg tracking-tight">Walk List</h1>
                <OnlineDot />
                {pendingSync > 0 && (
                  <span className="bg-amber-400 text-gray-900 text-[10px] font-bold px-1.5 py-0.5 rounded-full">
                    {pendingSync} pending
                  </span>
                )}
              </div>
              <p className="text-blue-300 text-xs">
                {households.length} addresses
                {fromCache && <span className="ml-1 text-amber-300">· cached</span>}
              </p>
            </div>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {STAT_TILES.map(({ k, l, bg }) => (
            <button key={k} onClick={() => setActiveFilter(activeFilter === k ? null : k)}
              className={cn("flex-shrink-0 rounded-xl px-3 py-2.5 text-center min-w-[64px] transition-all", bg,
                activeFilter === k ? "ring-2 ring-white ring-offset-2 ring-offset-blue-800 scale-105" : "opacity-90")}>
              <p className="text-2xl font-black leading-none">{stats[k as keyof typeof stats]}</p>
              <p className="text-xs text-white/80 mt-0.5 font-medium">{l}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Offline indicator banner */}
      <OfflineIndicator onSyncComplete={load} />

      {/* Offline placeholder banner when loading from cache */}
      {fromCache && (
        <div className="bg-amber-50 border-b border-amber-200 px-4 py-2 flex items-center gap-2 text-xs text-amber-800">
          <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Showing cached walk list. Changes will sync when back online.</span>
        </div>
      )}

      {/* Search + controls */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search name or address…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50" />
          </div>
          <button onClick={() => setShowFilters(!showFilters)}
            className={cn("px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-colors",
              showFilters ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}>
            <Filter className="w-4 h-4" />
          </button>
        </div>
        {showFilters && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 w-20">Street side</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(["all","odd","even"] as OddEven[]).map(v => (
                <button key={v} onClick={() => setOddEven(v)}
                  className={cn("px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors",
                    oddEven === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500")}>
                  {v.charAt(0).toUpperCase() + v.slice(1)}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Household list */}
      <div className="px-3 py-3 pb-28 space-y-1">
        {loading ? (
          Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-16 bg-white rounded-xl animate-pulse" />
          ))
        ) : households.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm">No addresses found</p>
          </div>
        ) : households.map(hh => (
          <HouseholdRow
            key={hh.key}
            household={hh}
            isExpanded={expanded.has(hh.key)}
            onToggle={() => toggleExpand(hh.key)}
            onToggleNotHome={() => toggleNotHome(hh)}
            onPersonUpdate={load}
          />
        ))}
      </div>
    </div>
  );
}

// ── Household row ─────────────────────────────────────────────────────────────

function HouseholdRow({ household: hh, isExpanded, onToggle, onToggleNotHome, onPersonUpdate }: {
  household: Household;
  isExpanded: boolean;
  onToggle: () => void;
  onToggleNotHome: () => void;
  onPersonUpdate: () => void;
}) {
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(hh.address + " " + hh.city)}`;

  return (
    <div className={cn("bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transition-opacity", hh.notHome && "opacity-60")}>
      <div className="px-4 py-3" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 cursor-pointer">
            <p className={cn("font-bold text-blue-800 text-base leading-tight", hh.notHome && "line-through text-gray-500")}>
              {hh.lastName}
            </p>
            <p className={cn("font-bold text-gray-800 text-sm mt-0.5", hh.notHome && "text-gray-400")}>
              {hh.address.toUpperCase()}
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{hh.city}</p>
          </div>

          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              {hh.people.slice(0, 5).map((_, i) => (
                <div key={i} className={cn("w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center",
                  hh.notHome ? "bg-gray-200" : "bg-blue-100")}>
                  <svg viewBox="0 0 24 24" className={cn("w-3 h-3", hh.notHome ? "text-gray-400" : "text-blue-700")} fill="currentColor">
                    <path d="M12 12c2.7 0 4.8-2.1 4.8-4.8S14.7 2.4 12 2.4 7.2 4.5 7.2 7.2 9.3 12 12 12zm0 2.4c-3.2 0-9.6 1.6-9.6 4.8v2.4h19.2v-2.4c0-3.2-6.4-4.8-9.6-4.8z" />
                  </svg>
                </div>
              ))}
              {hh.people.length > 5 && <span className="text-xs text-gray-400">+{hh.people.length - 5}</span>}
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>

        <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
          <button onClick={onToggleNotHome}
            className={cn("flex-1 py-2 rounded-xl font-bold text-sm active:scale-95 transition-all",
              hh.notHome ? "bg-emerald-500 text-white" : "bg-red-500 text-white")}>
            {hh.notHome ? "✓ Home" : "Not Home"}
          </button>
          <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
            className="flex items-center justify-center gap-1.5 px-4 py-2 bg-blue-600 text-white rounded-xl font-bold text-sm active:scale-95 transition-all">
            <Navigation className="w-3.5 h-3.5" />
            Directions
          </a>
        </div>
      </div>

      {isExpanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {hh.people.map(person => (
            <PersonRow key={person.id} person={person} onUpdate={onPersonUpdate} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Person row ────────────────────────────────────────────────────────────────

function PersonRow({ person: p, onUpdate }: { person: Person; onUpdate: () => void }) {
  const [support, setSupport] = useState(p.supportLevel);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  if (p.isDeceased) return (
    <div className="px-4 py-2.5 flex items-center gap-2">
      <span className="text-sm text-gray-400 line-through">{p.firstName} {p.lastName}</span>
      <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">Deceased</span>
    </div>
  );

  async function log(type: string) {
    setSaving(true);
    const isOnline = navigator.onLine;

    try {
      const interactionBody = {
        contactId: p.id,
        type,
        notes: notes || undefined,
        supportLevel: support !== p.supportLevel ? support : undefined,
      };
      const contactBody = support !== p.supportLevel ? { supportLevel: support } : null;

      if (isOnline) {
        const [intRes] = await Promise.all([
          fetch("/api/interactions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(interactionBody),
          }),
          contactBody
            ? fetch(`/api/contacts/${p.id}`, {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(contactBody),
              })
            : Promise.resolve(null),
        ]);
        if (!intRes.ok) throw new Error("Server error");
        toast.success("✓ Logged");
      } else {
        throw new Error("offline");
      }
    } catch {
      // Queue for background sync
      await queueViaServiceWorker({
        url: "/api/interactions",
        method: "POST",
        body: {
          contactId: p.id,
          type,
          notes: notes || undefined,
          supportLevel: support !== p.supportLevel ? support : undefined,
        },
        label: `${type === "door_knock" ? "🚪 Door" : type === "phone_call" ? "📞 Call" : "📝 Note"}: ${p.firstName} ${p.lastName}`,
      });

      if (support !== p.supportLevel) {
        await queueViaServiceWorker({
          url: `/api/contacts/${p.id}`,
          method: "PATCH",
          body: { supportLevel: support },
          label: `Support level update: ${p.firstName} ${p.lastName}`,
        });
      }

      toast.success("✓ Logged (will sync when online)");
    }

    setJustLogged(true);
    setNotes("");
    setShowForm(false);
    setSaving(false);
    setTimeout(() => setJustLogged(false), 2000);
    if (isOnline) onUpdate();
  }

  const isOnline = typeof navigator !== "undefined" ? navigator.onLine : true;

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">{p.firstName} {p.lastName}</p>
              {justLogged && <span className="text-xs text-emerald-600 font-medium">✓</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <SupportLevelBadge level={support} />
              {p.followUpNeeded && <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">Follow-up</span>}
              {p.signRequested && <span className="text-xs bg-orange-100 text-orange-700 px-1.5 rounded-full">Sign</span>}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {p.phone && (
            <a href={`tel:${p.phone}`} className="w-8 h-8 bg-blue-50 rounded-full flex items-center justify-center">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
            </a>
          )}
          <button onClick={() => setShowForm(!showForm)}
            className={cn("w-8 h-8 rounded-full flex items-center justify-center text-sm transition-colors",
              showForm ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-600")}>
            {showForm ? "↑" : "✏️"}
          </button>
        </div>
      </div>

      {showForm && (
        <div className="mt-3 space-y-2.5">
          {!isOnline && (
            <p className="text-[10px] text-amber-700 bg-amber-50 rounded-lg px-2 py-1">
              📶 Offline — this will be saved locally and synced when back online
            </p>
          )}
          {p.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 italic">"{p.notes}"</p>}
          <div className="flex flex-wrap gap-1.5">
            {SUPPORT_QUICK.map(({ v, l, c }) => (
              <button key={v} onClick={() => setSupport(v as SupportLevel)}
                className={cn("text-xs px-2.5 py-1 rounded-full font-medium transition-all active:scale-95",
                  support === v ? c + " ring-2 ring-offset-1 ring-blue-400" : "bg-gray-100 text-gray-600")}>
                {l}
              </button>
            ))}
          </div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Notes…" rows={2}
            className="w-full text-xs border border-gray-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50" />
          <div className="grid grid-cols-2 gap-1.5">
            <button onClick={() => log("door_knock")} disabled={saving}
              className="py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs active:scale-95 disabled:opacity-50">🚪 Door</button>
            <button onClick={() => log("phone_call")} disabled={saving}
              className="py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-xs active:scale-95 disabled:opacity-50">📞 Call</button>
            <button onClick={() => log("note")} disabled={saving}
              className="py-2.5 bg-gray-100 text-gray-700 rounded-xl font-medium text-xs active:scale-95">📝 Note</button>
            <button onClick={() => log("follow_up")} disabled={saving}
              className="py-2.5 bg-amber-100 text-amber-800 rounded-xl font-medium text-xs active:scale-95">🔁 Follow up</button>
          </div>
        </div>
      )}
    </div>
  );
}
