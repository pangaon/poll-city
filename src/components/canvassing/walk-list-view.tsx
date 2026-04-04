"use client";
import { useState, useEffect, useCallback } from "react";
import { Search, Filter, Users } from "lucide-react";
import CanvassContactCard, { CanvassContact } from "@/components/canvassing/canvass-contact-card";
import { SupportLevel } from "@/types";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Household {
  key: string;
  address: string;
  contacts: CanvassContact[];
}

interface Props { campaignId: string; }
type OddEven = "all" | "odd" | "even";
type ViewMode = "household" | "people";

// Stat tile definition
const STAT_TILES = [
  { key: "total",      label: "Total",      bgClass: "bg-blue-700",    filter: null },
  { key: "supporters", label: "Support",    bgClass: "bg-emerald-600", filter: "support" },
  { key: "undecided",  label: "Undecided",  bgClass: "bg-amber-500",   filter: "undecided" },
  { key: "opposition", label: "No",         bgClass: "bg-red-600",     filter: "opposition" },
  { key: "notHome",    label: "Not Home",   bgClass: "bg-gray-500",    filter: "notHome" },
  { key: "followUp",   label: "Follow-up",  bgClass: "bg-purple-600",  filter: "followUp" },
];

export default function WalkListView({ campaignId }: Props) {
  const [contacts, setContacts] = useState<CanvassContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<string | null>(null);
  const [oddEven, setOddEven] = useState<OddEven>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("household");
  const [showFilters, setShowFilters] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ campaignId, pageSize: "200" });
      if (search) p.set("search", search);
      const res = await fetch(`/api/contacts?${p}`);
      const data = await res.json();
      setContacts(data.data ?? []);
    } catch { toast.error("Failed to load contacts"); }
    finally { setLoading(false); }
  }, [campaignId, search]);

  useEffect(() => { load(); }, [load]);

  function handleUpdate(id: string, updates: Partial<CanvassContact>) {
    setContacts(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  }

  // Computed stats
  const stats = {
    total: contacts.length,
    supporters: contacts.filter(c => ["strong_support","leaning_support"].includes(c.supportLevel)).length,
    undecided: contacts.filter(c => c.supportLevel === "undecided").length,
    opposition: contacts.filter(c => ["leaning_opposition","strong_opposition"].includes(c.supportLevel)).length,
    notHome: contacts.filter(c => c.notHome).length,
    followUp: contacts.filter(c => c.followUpNeeded).length,
  };

  // Apply active filter
  let filtered = contacts;
  if (activeFilter === "support") filtered = contacts.filter(c => ["strong_support","leaning_support"].includes(c.supportLevel));
  else if (activeFilter === "undecided") filtered = contacts.filter(c => c.supportLevel === "undecided");
  else if (activeFilter === "opposition") filtered = contacts.filter(c => ["leaning_opposition","strong_opposition"].includes(c.supportLevel));
  else if (activeFilter === "notHome") filtered = contacts.filter(c => c.notHome);
  else if (activeFilter === "followUp") filtered = contacts.filter(c => c.followUpNeeded);

  // Odd/even
  if (oddEven !== "all") {
    filtered = filtered.filter(c => {
      const num = parseInt(c.streetNumber ?? c.address1?.match(/^\d+/)?.[0] ?? "0");
      return isNaN(num) ? true : oddEven === "odd" ? num % 2 !== 0 : num % 2 === 0;
    });
  }

  // Group by household
  const households: Household[] = viewMode === "household"
    ? Object.values(
        filtered.reduce<Record<string, Household>>((acc, c) => {
          const key = c.address1 ?? c.id;
          if (!acc[key]) acc[key] = { key, address: c.address1 ?? "Unknown", contacts: [] };
          acc[key].contacts.push(c);
          return acc;
        }, {})
      ).sort((a, b) => {
        const nA = parseInt(a.address.match(/^\d+/)?.[0] ?? "99999");
        const nB = parseInt(b.address.match(/^\d+/)?.[0] ?? "99999");
        return nA - nB;
      })
    : filtered.map(c => ({ key: c.id, address: c.address1 ?? "", contacts: [c] }));

  return (
    <div className="min-h-screen bg-gray-100">
      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-20 bg-blue-800 text-white">
        <div className="px-4 pt-12 pb-2">
          <h1 className="font-bold text-lg tracking-tight">Walk List</h1>
          <p className="text-blue-300 text-xs">{filtered.length} of {contacts.length} contacts</p>
        </div>

        {/* Stat tiles — horizontally scrollable, tappable */}
        <div className="flex gap-2 px-4 pb-3 overflow-x-auto" style={{ scrollbarWidth: "none" }}>
          {STAT_TILES.map(({ key, label, bgClass, filter }) => {
            const value = stats[key as keyof typeof stats];
            const isActive = activeFilter === filter;
            return (
              <button
                key={key}
                onClick={() => setActiveFilter(isActive ? null : filter)}
                className={cn(
                  "flex-shrink-0 rounded-xl px-3 py-2.5 text-center min-w-[68px] transition-all",
                  bgClass,
                  isActive ? "ring-2 ring-white ring-offset-2 ring-offset-blue-800 scale-105" : "opacity-90"
                )}
              >
                <p className="text-2xl font-black leading-none">{value}</p>
                <p className="text-xs text-white/80 mt-0.5 font-medium">{label}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Controls ── */}
      <div className="bg-white border-b border-gray-200 px-4 py-3 space-y-2.5">
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search name or address…"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-gray-50"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn("px-3 py-2 rounded-xl border-2 text-sm font-semibold transition-colors",
              showFilters ? "bg-blue-600 text-white border-blue-600" : "bg-white text-gray-600 border-gray-200")}
          >
            <Filter className="w-4 h-4" />
          </button>
        </div>

        {showFilters && (
          <div className="space-y-2 pt-1">
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 w-20">View</span>
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                {(["household","people"] as ViewMode[]).map(v => (
                  <button key={v} onClick={() => setViewMode(v)}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-semibold transition-colors",
                      viewMode === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                    {v === "household" ? "🏠 House" : "👤 People"}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-medium text-gray-500 w-20">Side</span>
              <div className="flex bg-gray-100 rounded-lg p-0.5 gap-0.5">
                {(["all","odd","even"] as OddEven[]).map(v => (
                  <button key={v} onClick={() => setOddEven(v)}
                    className={cn("px-3 py-1.5 rounded-md text-xs font-semibold capitalize transition-colors",
                      oddEven === v ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700")}>
                    {v.charAt(0).toUpperCase() + v.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── List ── */}
      <div className="px-3 py-3 pb-28 space-y-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-white rounded-xl border-l-4 border-l-gray-200 animate-pulse" />
          ))
        ) : households.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">No contacts{search && ` matching "${search}"`}</p>
            {activeFilter && <button onClick={() => setActiveFilter(null)} className="text-xs text-blue-500 mt-2 underline">Clear filter</button>}
          </div>
        ) : viewMode === "household" ? (
          households.map(hh => (
            <div key={hh.key}>
              {/* Multi-person household header */}
              {hh.contacts.length > 1 && (
                <div className="flex items-center gap-2 px-2 mb-1.5">
                  <div className="flex -space-x-1.5">
                    {hh.contacts.slice(0, 4).map((c, i) => (
                      <div key={c.id} style={{ zIndex: 10 - i }}
                        className={cn("w-5 h-5 rounded-full border-2 border-white flex items-center justify-center",
                          ["bg-blue-400","bg-emerald-400","bg-purple-400","bg-amber-400"][i])}>
                        <span className="text-white font-bold" style={{ fontSize: "8px" }}>{c.firstName[0]}</span>
                      </div>
                    ))}
                    {hh.contacts.length > 4 && (
                      <div className="w-5 h-5 rounded-full bg-gray-300 border-2 border-white flex items-center justify-center">
                        <span className="text-gray-600 font-bold" style={{ fontSize: "7px" }}>+{hh.contacts.length - 4}</span>
                      </div>
                    )}
                  </div>
                  <span className="text-xs font-semibold text-gray-600">{hh.address}</span>
                  <span className="text-xs text-gray-400">{hh.contacts.length} voters</span>
                </div>
              )}
              <div className="space-y-2">
                {hh.contacts.map(c => (
                  <CanvassContactCard key={c.id} contact={c} onUpdate={handleUpdate} />
                ))}
              </div>
            </div>
          ))
        ) : (
          filtered.map(c => (
            <CanvassContactCard key={c.id} contact={c} onUpdate={handleUpdate} />
          ))
        )}
      </div>
    </div>
  );
}
