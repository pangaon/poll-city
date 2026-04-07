"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, Filter, Navigation, Phone, ChevronDown, ChevronUp,
  Users, WifiOff, FileText, MoreHorizontal, X,
  Undo2, ToggleLeft, Type, List, ListChecks, Hash, Calendar,
} from "lucide-react";
import { SupportLevelBadge } from "@/components/ui";
import { cn } from "@/lib/utils";
import { SupportLevel } from "@/types";
import { toast } from "sonner";
import OfflineIndicator, { OnlineDot } from "@/components/pwa/offline-indicator";
import {
  cacheWalkList,
  getCachedWalkList,
  queueViaServiceWorker,
  getSyncQueueCount,
} from "@/lib/db/indexeddb";
import dynamic from "next/dynamic";

const CampaignMap = dynamic(() => import("@/components/maps/campaign-map"), { ssr: false });

/* ─── Brand colours ─────────────────────────────────────────────────────────── */
const NAVY = "#0A2342";
const GREEN = "#1D9E75";
const AMBER = "#EF9F27";
const RED = "#E24B4A";

/* ─── GPS tracking ──────────────────────────────────────────────────────────── */
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
      }).catch(() => {});
    }
    navigator.geolocation.getCurrentPosition(postLocation, () => {}, { enableHighAccuracy: false });
    intervalId = setInterval(() => {
      navigator.geolocation.getCurrentPosition(postLocation, () => {}, { enableHighAccuracy: true });
    }, 30000);
    return () => clearInterval(intervalId);
  }, [campaignId]);
}

/* ─── Types ─────────────────────────────────────────────────────────────────── */

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
  householdId: string | null;
  lastName: string;
  address: string;
  city: string;
  streetNumber: string;
  notHome: boolean;
  visited: boolean;
  people: Person[];
}

type OddEven = "all" | "odd" | "even";

/* ─── Result buttons config ─────────────────────────────────────────────────── */
const RESULT_BUTTONS = [
  { id: "not_home",   label: "Not Home",   bg: "bg-gray-500",    text: "text-white" },
  { id: "supporter",  label: "Supporter",  bg: "bg-[#1D9E75]",  text: "text-white" },
  { id: "undecided",  label: "Undecided",  bg: "bg-[#EF9F27]",  text: "text-white" },
  { id: "against",    label: "Against",    bg: "bg-[#E24B4A]",  text: "text-white" },
  { id: "refused",    label: "Refused",    bg: "bg-gray-800",    text: "text-white" },
] as const;

type ResultId = typeof RESULT_BUTTONS[number]["id"];

/* ─── Campaign field types ─────────────────────────────────────────────────── */

interface CampaignFieldDef {
  id: string;
  key: string;
  label: string;
  fieldType: string; // "boolean" | "text" | "textarea" | "number" | "date" | "select" | "multiselect"
  category: string;
  options: string[];
  isVisible: boolean;
  showOnCard: boolean;
  showOnList: boolean;
  sortOrder: number;
}

/** Map built-in __keys to the Contact model boolean field they toggle */
const BUILTIN_FIELD_MAP: Record<string, string> = {
  __sign_requested: "signRequested",
  __volunteer_interest: "volunteerInterest",
  __follow_up: "followUpNeeded",
};

/** Icon per field type for the "More Options" panel */
function fieldIcon(fieldType: string) {
  switch (fieldType) {
    case "boolean": return ToggleLeft;
    case "text": case "textarea": return Type;
    case "select": return List;
    case "multiselect": return ListChecks;
    case "number": return Hash;
    case "date": return Calendar;
    default: return Type;
  }
}

/** Fallback fields if the campaign has no CampaignField records */
const FALLBACK_FIELDS: CampaignFieldDef[] = [
  { id: "fb_sign", key: "__sign_requested", label: "Sign Request", fieldType: "boolean", category: "canvassing", options: [], isVisible: true, showOnCard: true, showOnList: false, sortOrder: 0 },
  { id: "fb_vol", key: "__volunteer_interest", label: "Wants to Volunteer", fieldType: "boolean", category: "canvassing", options: [], isVisible: true, showOnCard: true, showOnList: false, sortOrder: 1 },
  { id: "fb_fu", key: "__follow_up", label: "Follow-up Needed", fieldType: "boolean", category: "canvassing", options: [], isVisible: true, showOnCard: true, showOnList: false, sortOrder: 2 },
];

/* ─── Grouping utility ──────────────────────────────────────────────────────── */

function groupContacts(
  contacts: (Person & {
    address1: string | null;
    streetNumber: string | null;
    city: string | null;
    notHome: boolean;
    householdId: string | null;
    household: { id: string; visited: boolean; visitedAt: string | null } | null;
  })[],
  oddEven: OddEven,
  activeFilter: string | null,
): Household[] {
  const grouped: Record<string, Household> = {};
  for (const c of contacts) {
    const key = c.address1 ?? c.id;
    const num = c.streetNumber ?? c.address1?.match(/^\d+/)?.[0] ?? "";
    if (!grouped[key]) {
      grouped[key] = {
        key,
        householdId: c.householdId ?? c.household?.id ?? null,
        lastName: c.lastName,
        address: c.address1 ?? "Unknown address",
        city: c.city ?? "",
        streetNumber: num,
        notHome: c.notHome,
        visited: Boolean(c.household?.visited),
        people: [],
      };
    }
    grouped[key].people.push(c);
    if (c.lastName < grouped[key].lastName) grouped[key].lastName = c.lastName;
    if (c.household?.visited) grouped[key].visited = true;
  }

  let hh = Object.values(grouped);

  if (oddEven !== "all") {
    hh = hh.filter((h) => {
      const n = parseInt(h.streetNumber);
      return isNaN(n) ? true : oddEven === "odd" ? n % 2 !== 0 : n % 2 === 0;
    });
  }

  if (activeFilter === "support") hh = hh.filter((h) => h.people.some((p) => ["strong_support", "leaning_support"].includes(p.supportLevel)));
  else if (activeFilter === "undecided") hh = hh.filter((h) => h.people.some((p) => p.supportLevel === "undecided"));
  else if (activeFilter === "opposition") hh = hh.filter((h) => h.people.some((p) => ["leaning_opposition", "strong_opposition"].includes(p.supportLevel)));
  else if (activeFilter === "notHome") hh = hh.filter((h) => h.notHome);
  else if (activeFilter === "visited") hh = hh.filter((h) => h.visited);
  else if (activeFilter === "followUp") hh = hh.filter((h) => h.people.some((p) => p.followUpNeeded));

  hh.sort((a, b) => parseInt(a.streetNumber || "99999") - parseInt(b.streetNumber || "99999"));
  return hh;
}

/* ─── Undo Timer Hook ───────────────────────────────────────────────────────── */

interface UndoEntry {
  id: string;
  householdKey: string;
  label: string;
  undoFn: () => void;
  timeLeft: number;
}

function useUndoQueue() {
  const [queue, setQueue] = useState<UndoEntry[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setInterval>>>(new Map());

  const addUndo = useCallback((entry: Omit<UndoEntry, "timeLeft">) => {
    setQueue((prev) => [...prev.filter((e) => e.id !== entry.id), { ...entry, timeLeft: 10 }]);
    const interval = setInterval(() => {
      setQueue((prev) => {
        const updated = prev.map((e) =>
          e.id === entry.id ? { ...e, timeLeft: e.timeLeft - 1 } : e
        );
        const item = updated.find((e) => e.id === entry.id);
        if (item && item.timeLeft <= 0) {
          clearInterval(timers.current.get(entry.id));
          timers.current.delete(entry.id);
          return updated.filter((e) => e.id !== entry.id);
        }
        return updated;
      });
    }, 1000);
    if (timers.current.has(entry.id)) clearInterval(timers.current.get(entry.id));
    timers.current.set(entry.id, interval);
  }, []);

  const doUndo = useCallback((id: string) => {
    setQueue((prev) => {
      const entry = prev.find((e) => e.id === id);
      if (entry) {
        entry.undoFn();
        if (timers.current.has(id)) {
          clearInterval(timers.current.get(id));
          timers.current.delete(id);
        }
      }
      return prev.filter((e) => e.id !== id);
    });
  }, []);

  return { queue, addUndo, doUndo };
}

/* ─── Shimmer Skeleton ──────────────────────────────────────────────────────── */

function ShimmerSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl bg-gray-200", className)}>
      <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Main Component
   ═══════════════════════════════════════════════════════════════════════════════ */

export default function WalkShell({ campaignId }: { campaignId: string }) {
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
  const [showMap, setShowMap] = useState(false);
  const rawContactsRef = useRef<Parameters<typeof groupContacts>[0]>([]);
  const { queue: undoQueue, addUndo, doUndo } = useUndoQueue();
  const [campaignFields, setCampaignFields] = useState<CampaignFieldDef[]>([]);

  /* Fetch campaign-configured fields once */
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`/api/campaign-fields?campaignId=${campaignId}`);
        if (!res.ok) return;
        const json = await res.json();
        const all: CampaignFieldDef[] = json.data ?? [];
        const canvassingFields = all.filter(
          (f) => f.isVisible && f.showOnCard && f.category === "canvassing",
        );
        setCampaignFields(canvassingFields.length > 0 ? canvassingFields : FALLBACK_FIELDS);
      } catch {
        setCampaignFields(FALLBACK_FIELDS);
      }
    })();
  }, [campaignId]);

  const load = useCallback(async () => {
    setLoading(true);
    setFromCache(false);
    try {
      const p = new URLSearchParams({ campaignId, pageSize: "200" });
      if (search) p.set("search", search);
      const res = await fetch(`/api/contacts?${p}`);
      const data = await res.json();
      if (data._offline) throw new Error("offline");
      const contacts = data.data ?? [];
      rawContactsRef.current = contacts;
      try { await cacheWalkList(campaignId, contacts); } catch {}
      setHouseholds(groupContacts(contacts, oddEven, activeFilter));
    } catch {
      try {
        const cached = await getCachedWalkList(campaignId);
        if (cached?.data) {
          const contacts = cached.data as Parameters<typeof groupContacts>[0];
          rawContactsRef.current = contacts;
          setHouseholds(groupContacts(contacts, oddEven, activeFilter));
          setFromCache(true);
          const mins = Math.round((Date.now() - cached.savedAt) / 60000);
          toast(`Showing cached walk list (saved ${mins}m ago)`);
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

  useEffect(() => {
    if (rawContactsRef.current.length > 0) {
      setHouseholds(groupContacts(rawContactsRef.current, oddEven, activeFilter));
    }
  }, [oddEven, activeFilter]);

  const stats = {
    total: households.length,
    support: households.filter((h) => h.people.some((p) => ["strong_support", "leaning_support"].includes(p.supportLevel))).length,
    undecided: households.filter((h) => h.people.some((p) => p.supportLevel === "undecided")).length,
    opposition: households.filter((h) => h.people.some((p) => ["leaning_opposition", "strong_opposition"].includes(p.supportLevel))).length,
    notHome: households.filter((h) => h.notHome).length,
    visited: households.filter((h) => h.visited).length,
    followUp: households.filter((h) => h.people.some((p) => p.followUpNeeded)).length,
  };

  /* ── Result handler (one-tap, no confirm) ── */
  async function handleResult(hh: Household, result: ResultId) {
    const isOnline = navigator.onLine;
    const prevState = { notHome: hh.notHome, visited: hh.visited, people: hh.people.map((p) => ({ ...p })) };

    // Optimistic update
    if (result === "not_home") {
      setHouseholds((prev) => prev.map((h) => h.key === hh.key ? { ...h, notHome: true } : h));
    } else {
      const supportMap: Record<string, SupportLevel> = {
        supporter: "strong_support",
        undecided: "undecided",
        against: "strong_opposition",
        refused: "strong_opposition",
      };
      const newLevel = supportMap[result];
      if (newLevel) {
        setHouseholds((prev) =>
          prev.map((h) =>
            h.key === hh.key
              ? { ...h, visited: true, people: h.people.map((p) => ({ ...p, supportLevel: newLevel })) }
              : h,
          ),
        );
      }
    }

    // Add undo entry
    addUndo({
      id: `${hh.key}-${Date.now()}`,
      householdKey: hh.key,
      label: `${hh.address} - ${RESULT_BUTTONS.find((b) => b.id === result)?.label}`,
      undoFn: () => {
        setHouseholds((prev) =>
          prev.map((h) =>
            h.key === hh.key
              ? { ...h, notHome: prevState.notHome, visited: prevState.visited, people: prevState.people }
              : h,
          ),
        );
        toast("Undone");
      },
    });

    // Persist
    for (const p of hh.people) {
      const interactionBody: Record<string, unknown> = {
        contactId: p.id,
        type: "door_knock",
        notes: result === "refused" ? "Refused to engage" : result === "not_home" ? "Not home" : undefined,
      };
      const contactBody: Record<string, unknown> = {};
      if (result === "not_home") {
        contactBody.notHome = true;
      } else {
        const supportMap: Record<string, string> = {
          supporter: "strong_support",
          undecided: "undecided",
          against: "strong_opposition",
          refused: "strong_opposition",
        };
        contactBody.supportLevel = supportMap[result];
        interactionBody.supportLevel = supportMap[result];
      }

      try {
        if (isOnline) {
          await Promise.all([
            fetch("/api/interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(interactionBody) }),
            Object.keys(contactBody).length > 0
              ? fetch(`/api/contacts/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contactBody) })
              : Promise.resolve(null),
          ]);
        } else {
          throw new Error("offline");
        }
      } catch {
        await queueViaServiceWorker({ url: "/api/interactions", method: "POST", body: interactionBody, label: `Door: ${p.firstName} ${p.lastName}` });
        if (Object.keys(contactBody).length > 0) {
          await queueViaServiceWorker({ url: `/api/contacts/${p.id}`, method: "PATCH", body: contactBody, label: `Update: ${p.firstName} ${p.lastName}` });
        }
      }
    }
  }

  /* ── More options handler (dynamic campaign fields) ── */
  async function handleMoreOption(hh: Household, fieldKey: string, value: unknown = true) {
    const isOnline = navigator.onLine;
    const field = campaignFields.find((f) => f.key === fieldKey);
    const label = field?.label ?? fieldKey;

    for (const p of hh.people) {
      // Built-in field — toggle a Contact boolean
      const builtinProp = BUILTIN_FIELD_MAP[fieldKey];
      if (builtinProp) {
        const body = { [builtinProp]: value };
        try {
          if (isOnline) {
            await fetch(`/api/contacts/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
          } else {
            throw new Error("offline");
          }
        } catch {
          await queueViaServiceWorker({ url: `/api/contacts/${p.id}`, method: "PATCH", body, label: `${label}: ${p.firstName}` });
        }
        continue;
      }

      // Custom field — save via customFields payload on the contact PATCH
      const customBody = { customFields: { [fieldKey]: value } };
      try {
        if (isOnline) {
          await fetch(`/api/contacts/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(customBody) });
        } else {
          throw new Error("offline");
        }
      } catch {
        await queueViaServiceWorker({ url: `/api/contacts/${p.id}`, method: "PATCH", body: customBody, label: `${label}: ${p.firstName}` });
      }
    }
    toast.success(`${label} recorded`);
  }

  function toggleExpand(key: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  }

  const STAT_TILES = [
    { k: "total", l: "Total", bg: `bg-[${NAVY}]`, cls: "bg-[#0A2342]" },
    { k: "support", l: "Support", bg: `bg-[${GREEN}]`, cls: "bg-[#1D9E75]" },
    { k: "undecided", l: "Undecided", bg: `bg-[${AMBER}]`, cls: "bg-[#EF9F27]" },
    { k: "opposition", l: "No", bg: `bg-[${RED}]`, cls: "bg-[#E24B4A]" },
    { k: "notHome", l: "Not Home", bg: "bg-gray-500", cls: "bg-gray-500" },
    { k: "visited", l: "Visited", bg: "bg-teal-600", cls: "bg-teal-600" },
    { k: "followUp", l: "Follow-up", bg: "bg-purple-600", cls: "bg-purple-600" },
  ];

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 text-white" style={{ backgroundColor: NAVY }}>
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
                {fromCache && <span className="ml-1 text-amber-300">-- cached</span>}
              </p>
            </div>
            <button
              onClick={() => setShowMap(!showMap)}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-white/10 hover:bg-white/20 transition-colors"
            >
              {showMap ? "Hide Map" : "Show Map"}
            </button>
          </div>
        </div>

        {/* Stat tiles */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {STAT_TILES.map(({ k, l, cls }) => (
            <button
              key={k}
              onClick={() => setActiveFilter(activeFilter === k ? null : k)}
              className={cn(
                "flex-shrink-0 rounded-xl px-3 py-2.5 text-center min-w-[64px] transition-all",
                cls,
                activeFilter === k ? "ring-2 ring-white ring-offset-2 ring-offset-[#0A2342] scale-105" : "opacity-90",
              )}
            >
              <p className="text-2xl font-black leading-none">{stats[k as keyof typeof stats]}</p>
              <p className="text-xs text-white/80 mt-0.5 font-medium">{l}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Map panel */}
      <AnimatePresence>
        {showMap && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="overflow-hidden"
          >
            <div className="mx-4 mt-4 rounded-2xl border border-slate-200 bg-white p-3">
              <p className="px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">Walk route map</p>
              <CampaignMap mode="walk" height={280} showControls />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Undo bar */}
      <AnimatePresence>
        {undoQueue.length > 0 && (
          <motion.div
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 30 }}
            className="fixed bottom-20 left-4 right-4 z-50 space-y-2"
          >
            {undoQueue.map((entry) => (
              <div key={entry.id} className="flex items-center gap-3 bg-gray-900 text-white rounded-2xl px-4 py-3 shadow-2xl">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{entry.label}</p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="relative w-8 h-8">
                    <svg className="w-8 h-8 -rotate-90" viewBox="0 0 32 32">
                      <circle cx="16" cy="16" r="14" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                      <circle
                        cx="16" cy="16" r="14"
                        fill="none" stroke="white" strokeWidth="2"
                        strokeDasharray={`${(entry.timeLeft / 10) * 88} 88`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{entry.timeLeft}</span>
                  </div>
                  <button
                    onClick={() => doUndo(entry.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white text-gray-900 rounded-xl text-sm font-bold min-h-[44px] active:scale-95 transition-transform"
                  >
                    <Undo2 className="w-4 h-4" /> Undo
                  </button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Offline banner */}
      <OfflineIndicator onSyncComplete={load} />
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
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search name or address..."
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50 min-h-[44px]"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-colors min-h-[44px] min-w-[44px]",
              showFilters ? "text-white border-[#0A2342]" : "bg-white text-gray-600 border-gray-200",
            )}
            style={showFilters ? { backgroundColor: NAVY } : undefined}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>
        {showFilters && (
          <div className="flex items-center gap-3">
            <span className="text-xs font-medium text-gray-500 w-20">Street side</span>
            <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
              {(["all", "odd", "even"] as OddEven[]).map((v) => (
                <button
                  key={v}
                  onClick={() => setOddEven(v)}
                  className={cn(
                    "px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors min-h-[44px]",
                    oddEven === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500",
                  )}
                >
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
          Array.from({ length: 8 }).map((_, i) => <ShimmerSkeleton key={i} className="h-16 mb-1" />)
        ) : households.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No addresses found</p>
            {activeFilter && (
              <button onClick={() => setActiveFilter(null)} className="text-xs text-blue-500 mt-2 underline">
                Clear filter
              </button>
            )}
          </div>
        ) : (
          households.map((hh, idx) => (
            <motion.div
              key={hh.key}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(idx * 0.02, 0.3), type: "spring", stiffness: 400, damping: 30 }}
            >
              <HouseholdRow
                household={hh}
                isExpanded={expanded.has(hh.key)}
                onToggle={() => toggleExpand(hh.key)}
                onResult={(result) => handleResult(hh, result)}
                onMoreOption={(fieldKey, value) => handleMoreOption(hh, fieldKey, value)}
                onPersonUpdate={load}
                campaignFields={campaignFields}
              />
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Household Row
   ═══════════════════════════════════════════════════════════════════════════════ */

function HouseholdRow({
  household: hh,
  isExpanded,
  onToggle,
  onResult,
  onMoreOption,
  onPersonUpdate,
  campaignFields,
}: {
  household: Household;
  isExpanded: boolean;
  onToggle: () => void;
  onResult: (result: ResultId) => void;
  onMoreOption: (fieldKey: string, value?: unknown) => void;
  onPersonUpdate: () => void;
  campaignFields: CampaignFieldDef[];
}) {
  const [showScript, setShowScript] = useState(false);
  const [showMore, setShowMore] = useState(false);
  const [fieldInputs, setFieldInputs] = useState<Record<string, unknown>>({});
  const mapsUrl = `https://maps.google.com/?q=${encodeURIComponent(hh.address + " " + hh.city)}`;

  return (
    <div className={cn("bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100 transition-opacity", hh.notHome && "opacity-60")}>
      {/* Header */}
      <div className="px-4 py-3" onClick={onToggle}>
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0 cursor-pointer">
            <p className={cn("font-bold text-[#0A2342] text-base leading-tight", hh.notHome && "line-through text-gray-500")}>
              {hh.lastName}
            </p>
            <p className={cn("font-bold text-gray-800 text-sm mt-0.5", hh.notHome && "text-gray-400")}>
              {hh.address.toUpperCase()}
            </p>
            <p className="text-xs text-gray-400 uppercase tracking-wide mt-0.5">{hh.city}</p>
          </div>
          <div className="flex-shrink-0 flex flex-col items-end gap-2">
            <div className="flex items-center gap-1">
              {hh.people.slice(0, 5).map((p, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-5 h-5 rounded-full border border-gray-300 flex items-center justify-center",
                    hh.notHome ? "bg-gray-200" : "bg-blue-100",
                  )}
                >
                  <span className={cn("text-[9px] font-bold", hh.notHome ? "text-gray-400" : "text-[#0A2342]")}>
                    {p.firstName[0]}
                  </span>
                </div>
              ))}
              {hh.people.length > 5 && <span className="text-xs text-gray-400">+{hh.people.length - 5}</span>}
            </div>
            {isExpanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </div>
        </div>
      </div>

      {/* ── Result Buttons: 56px+ height, color-coded, one-tap ── */}
      <div className="px-3 pb-3 grid grid-cols-5 gap-1.5" onClick={(e) => e.stopPropagation()}>
        {RESULT_BUTTONS.map((btn) => (
          <motion.button
            key={btn.id}
            whileTap={{ scale: 0.92 }}
            transition={{ type: "spring", stiffness: 500, damping: 20 }}
            onClick={() => onResult(btn.id)}
            className={cn(
              "rounded-xl font-bold text-xs min-h-[56px] flex items-center justify-center px-1 transition-colors",
              btn.bg, btn.text,
            )}
          >
            {btn.label}
          </motion.button>
        ))}
      </div>

      {/* ── Quick actions row ── */}
      <div className="px-3 pb-3 flex gap-2" onClick={(e) => e.stopPropagation()}>
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-xs active:scale-95 transition-all min-h-[44px] flex-1"
        >
          <Navigation className="w-3.5 h-3.5" /> Directions
        </a>
        <button
          onClick={() => setShowScript(!showScript)}
          className={cn(
            "flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl font-bold text-xs min-h-[44px] flex-1 transition-all active:scale-95",
            showScript ? "bg-[#0A2342] text-white" : "bg-gray-100 text-gray-700",
          )}
        >
          <FileText className="w-3.5 h-3.5" /> Script
        </button>
        <button
          onClick={() => setShowMore(!showMore)}
          className={cn(
            "flex items-center justify-center px-3 py-2.5 rounded-xl min-h-[44px] min-w-[44px] transition-all active:scale-95",
            showMore ? "bg-[#0A2342] text-white" : "bg-gray-100 text-gray-700",
          )}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>

      {/* ── Script panel ── */}
      <AnimatePresence>
        {showScript && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="px-4 py-3 bg-blue-50 border-t border-blue-100">
              <p className="text-xs font-bold text-[#0A2342] uppercase tracking-wide mb-2">Door Script</p>
              <p className="text-sm text-gray-800 leading-relaxed">
                "Hi, my name is <span className="font-bold">[Your Name]</span> and I am here on behalf of <span className="font-bold">[Candidate]</span>.
                We are talking to voters in the neighbourhood about the upcoming election. Do you have a moment?"
              </p>
              <p className="text-xs text-gray-500 mt-2 italic">
                Listen first. Ask what issues matter most. Then connect to platform.
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── More options panel (dynamic campaign fields) ── */}
      <AnimatePresence>
        {showMore && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 border-t border-gray-100 pt-3 space-y-2">
              {/* Boolean fields — render as tap-to-toggle buttons in a grid */}
              {campaignFields.filter((f) => f.fieldType === "boolean").length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {campaignFields
                    .filter((f) => f.fieldType === "boolean")
                    .map((field) => {
                      const Icon = fieldIcon(field.fieldType);
                      return (
                        <motion.button
                          key={field.key}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { onMoreOption(field.key, true); setShowMore(false); }}
                          className="flex items-center gap-2 px-3 py-3 bg-gray-50 hover:bg-gray-100 rounded-xl text-sm font-medium text-gray-700 min-h-[56px] transition-colors"
                        >
                          <Icon className="w-4 h-4 text-gray-500 flex-shrink-0" />
                          {field.label}
                        </motion.button>
                      );
                    })}
                </div>
              )}

              {/* Text / textarea fields */}
              {campaignFields
                .filter((f) => f.fieldType === "text" || f.fieldType === "textarea")
                .map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{field.label}</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={String(fieldInputs[field.key] ?? "")}
                        onChange={(e) => setFieldInputs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.label}
                        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[56px]"
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const val = fieldInputs[field.key];
                          if (val) { onMoreOption(field.key, val); setFieldInputs((prev) => ({ ...prev, [field.key]: "" })); setShowMore(false); }
                        }}
                        className="px-4 py-2.5 bg-[#0A2342] text-white rounded-xl text-sm font-bold min-h-[56px] min-w-[56px]"
                      >
                        Save
                      </motion.button>
                    </div>
                  </div>
                ))}

              {/* Select fields — single select dropdown */}
              {campaignFields
                .filter((f) => f.fieldType === "select")
                .map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{field.label}</label>
                    <select
                      value={String(fieldInputs[field.key] ?? "")}
                      onChange={(e) => {
                        const val = e.target.value;
                        if (val) { onMoreOption(field.key, val); setShowMore(false); }
                      }}
                      className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[56px]"
                    >
                      <option value="">Select {field.label}...</option>
                      {field.options.map((opt) => (
                        <option key={opt} value={opt}>{opt}</option>
                      ))}
                    </select>
                  </div>
                ))}

              {/* Multiselect fields — tap to toggle each option */}
              {campaignFields
                .filter((f) => f.fieldType === "multiselect")
                .map((field) => {
                  const selected = (fieldInputs[field.key] as string[] | undefined) ?? [];
                  return (
                    <div key={field.key} className="space-y-1.5">
                      <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{field.label}</label>
                      <div className="flex flex-wrap gap-1.5">
                        {field.options.map((opt) => {
                          const isOn = selected.includes(opt);
                          return (
                            <button
                              key={opt}
                              onClick={() => {
                                const next = isOn ? selected.filter((s) => s !== opt) : [...selected, opt];
                                setFieldInputs((prev) => ({ ...prev, [field.key]: next }));
                              }}
                              className={cn(
                                "px-3 py-2 rounded-xl text-xs font-medium min-h-[44px] transition-colors",
                                isOn ? "bg-[#0A2342] text-white" : "bg-gray-100 text-gray-700",
                              )}
                            >
                              {opt}
                            </button>
                          );
                        })}
                      </div>
                      {selected.length > 0 && (
                        <motion.button
                          whileTap={{ scale: 0.95 }}
                          onClick={() => { onMoreOption(field.key, selected); setFieldInputs((prev) => ({ ...prev, [field.key]: [] })); setShowMore(false); }}
                          className="w-full py-2.5 bg-[#1D9E75] text-white rounded-xl text-sm font-bold min-h-[56px]"
                        >
                          Save {field.label}
                        </motion.button>
                      )}
                    </div>
                  );
                })}

              {/* Number fields */}
              {campaignFields
                .filter((f) => f.fieldType === "number")
                .map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{field.label}</label>
                    <div className="flex gap-2">
                      <input
                        type="number"
                        value={String(fieldInputs[field.key] ?? "")}
                        onChange={(e) => setFieldInputs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        placeholder={field.label}
                        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[56px]"
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const val = fieldInputs[field.key];
                          if (val !== undefined && val !== "") { onMoreOption(field.key, Number(val)); setFieldInputs((prev) => ({ ...prev, [field.key]: "" })); setShowMore(false); }
                        }}
                        className="px-4 py-2.5 bg-[#0A2342] text-white rounded-xl text-sm font-bold min-h-[56px] min-w-[56px]"
                      >
                        Save
                      </motion.button>
                    </div>
                  </div>
                ))}

              {/* Date fields */}
              {campaignFields
                .filter((f) => f.fieldType === "date")
                .map((field) => (
                  <div key={field.key} className="space-y-1">
                    <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{field.label}</label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        value={String(fieldInputs[field.key] ?? "")}
                        onChange={(e) => setFieldInputs((prev) => ({ ...prev, [field.key]: e.target.value }))}
                        className="flex-1 text-sm border border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[56px]"
                      />
                      <motion.button
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          const val = fieldInputs[field.key];
                          if (val) { onMoreOption(field.key, val); setFieldInputs((prev) => ({ ...prev, [field.key]: "" })); setShowMore(false); }
                        }}
                        className="px-4 py-2.5 bg-[#0A2342] text-white rounded-xl text-sm font-bold min-h-[56px] min-w-[56px]"
                      >
                        Save
                      </motion.button>
                    </div>
                  </div>
                ))}

              {campaignFields.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-4">No additional fields configured for this campaign.</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Expanded person details ── */}
      {isExpanded && (
        <div className="border-t border-gray-100 divide-y divide-gray-50">
          {hh.people.map((person) => (
            <PersonRow key={person.id} person={person} onUpdate={onPersonUpdate} campaignFields={campaignFields} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════════════════════════
   Person Row
   ═══════════════════════════════════════════════════════════════════════════════ */

function PersonRow({ person: p, onUpdate, campaignFields }: { person: Person; onUpdate: () => void; campaignFields: CampaignFieldDef[] }) {
  const [support, setSupport] = useState(p.supportLevel);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [justLogged, setJustLogged] = useState(false);

  if (p.isDeceased)
    return (
      <div className="px-4 py-2.5 flex items-center gap-2">
        <span className="text-sm text-gray-400 line-through">
          {p.firstName} {p.lastName}
        </span>
        <span className="text-xs text-gray-400 bg-gray-100 px-1.5 rounded">Deceased</span>
      </div>
    );

  const SUPPORT_QUICK = [
    { v: "strong_support", l: "Strong", c: "bg-emerald-100 text-emerald-700" },
    { v: "leaning_support", l: "Leaning", c: "bg-green-100 text-green-700" },
    { v: "undecided", l: "Undecided", c: "bg-amber-100 text-amber-700" },
    { v: "leaning_opposition", l: "Leaning No", c: "bg-orange-100 text-orange-700" },
    { v: "strong_opposition", l: "Strong No", c: "bg-red-100 text-red-700" },
  ];

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
          fetch("/api/interactions", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(interactionBody) }),
          contactBody ? fetch(`/api/contacts/${p.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(contactBody) }) : Promise.resolve(null),
        ]);
        if (!intRes.ok) throw new Error("Server error");
        toast.success("Logged");
      } else {
        throw new Error("offline");
      }
    } catch {
      await queueViaServiceWorker({ url: "/api/interactions", method: "POST", body: { contactId: p.id, type, notes: notes || undefined, supportLevel: support !== p.supportLevel ? support : undefined }, label: `Door: ${p.firstName} ${p.lastName}` });
      if (support !== p.supportLevel) {
        await queueViaServiceWorker({ url: `/api/contacts/${p.id}`, method: "PATCH", body: { supportLevel: support }, label: `Support: ${p.firstName} ${p.lastName}` });
      }
      toast.success("Logged (will sync when online)");
    }
    setJustLogged(true);
    setNotes("");
    setShowForm(false);
    setSaving(false);
    setTimeout(() => setJustLogged(false), 2000);
    if (isOnline) onUpdate();
  }

  return (
    <div className="px-4 py-3">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold text-gray-900">
                {p.firstName} {p.lastName}
              </p>
              {justLogged && <span className="text-xs text-emerald-600 font-medium">Done</span>}
            </div>
            <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
              <SupportLevelBadge level={support} />
              {/* Dynamic badges from campaign fields */}
              {campaignFields.some((f) => f.key === "__follow_up") && p.followUpNeeded && (
                <span className="text-xs bg-amber-100 text-amber-700 px-1.5 rounded-full">Follow-up</span>
              )}
              {campaignFields.some((f) => f.key === "__sign_requested") && p.signRequested && (
                <span className="text-xs bg-orange-100 text-orange-700 px-1.5 rounded-full">Sign</span>
              )}
              {campaignFields.some((f) => f.key === "__volunteer_interest") && p.volunteerInterest && (
                <span className="text-xs bg-blue-100 text-blue-700 px-1.5 rounded-full">Vol</span>
              )}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          {p.phone && (
            <a href={`tel:${p.phone}`} className="w-10 h-10 bg-blue-50 rounded-full flex items-center justify-center min-h-[44px] min-w-[44px]">
              <Phone className="w-3.5 h-3.5 text-blue-600" />
            </a>
          )}
          <button
            onClick={() => setShowForm(!showForm)}
            className={cn(
              "w-10 h-10 rounded-full flex items-center justify-center text-sm transition-colors min-h-[44px] min-w-[44px]",
              showForm ? "bg-[#0A2342] text-white" : "bg-gray-100 text-gray-600",
            )}
          >
            {showForm ? <X className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 25 }}
            className="overflow-hidden"
          >
            <div className="mt-3 space-y-2.5">
              {p.notes && <p className="text-xs text-gray-500 bg-gray-50 rounded-lg px-2.5 py-1.5 italic">"{p.notes}"</p>}
              <div className="flex flex-wrap gap-1.5">
                {SUPPORT_QUICK.map(({ v, l, c }) => (
                  <button
                    key={v}
                    onClick={() => setSupport(v as SupportLevel)}
                    className={cn(
                      "text-xs px-2.5 py-1.5 rounded-full font-medium transition-all active:scale-95 min-h-[44px]",
                      support === v ? c + " ring-2 ring-offset-1 ring-blue-400" : "bg-gray-100 text-gray-600",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Notes..."
                rows={2}
                className="w-full text-xs border border-gray-200 rounded-xl px-2.5 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none bg-gray-50"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <button onClick={() => log("door_knock")} disabled={saving} className="py-3 bg-blue-600 text-white rounded-xl font-bold text-xs active:scale-95 disabled:opacity-50 min-h-[44px]">
                  Door Knock
                </button>
                <button onClick={() => log("phone_call")} disabled={saving} className="py-3 bg-emerald-600 text-white rounded-xl font-bold text-xs active:scale-95 disabled:opacity-50 min-h-[44px]">
                  Phone Call
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
