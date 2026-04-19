"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, MapPin, CheckCircle, ChevronRight,
  Users, Bell, BellOff, X, Locate,
  Landmark, Building2, Flag,
} from "lucide-react";
import Link from "next/link";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/* ── Constants ───────────────────────────────────────────────────────────── */
const spring = { type: "spring" as const, stiffness: 300, damping: 30 };

const LEVEL_TABS = [
  { key: "all",        label: "All",        icon: Landmark    },
  { key: "federal",    label: "Federal",    icon: Flag        },
  { key: "provincial", label: "Provincial", icon: Building2   },
  { key: "municipal",  label: "Municipal",  icon: MapPin      },
] as const;
type LevelKey = typeof LEVEL_TABS[number]["key"];

const LEVEL_BADGE: Record<string, string> = {
  federal:    "border-purple-500/40 text-purple-400 bg-purple-500/10",
  provincial: "border-blue-500/40 text-blue-400 bg-blue-500/10",
  municipal:  "border-[#00D4C8]/40 text-[#00D4C8] bg-[#00D4C8]/10",
};

const LEVEL_LABEL: Record<string, string> = {
  federal: "FED", provincial: "PROV", municipal: "LOCAL",
};

/* ── Types ───────────────────────────────────────────────────────────────── */
interface Official {
  id: string;
  name: string;
  title: string;
  level: string;
  district: string;
  province: string | null;
  party: string | null;
  partyName: string | null;
  photoUrl: string | null;
  subscriptionStatus: string | null;
  isClaimed: boolean;
  _count: { follows: number; questions: number };
}

/* ── Helpers ─────────────────────────────────────────────────────────────── */
function initials(name: string) {
  return name.split(" ").map(n => n[0]).join("").slice(0, 2).toUpperCase();
}

function useDebounce<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

/* ── Shimmer skeleton ────────────────────────────────────────────────────── */
function Shimmer({ className }: { className?: string }) {
  return (
    <div className={cn(
      "animate-pulse rounded-2xl bg-gray-200 dark:bg-white/[0.04]",
      className
    )} />
  );
}

/* ── Official card ───────────────────────────────────────────────────────── */
function OfficialCard({
  official,
  isFollowing,
  onToggleFollow,
}: {
  official: Official;
  isFollowing: boolean;
  onToggleFollow: (id: string, currently: boolean) => void;
}) {
  const badge = LEVEL_BADGE[official.level] ?? "border-gray-400/30 text-gray-400 bg-gray-400/10";
  const label = LEVEL_LABEL[official.level] ?? official.level.toUpperCase();

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={spring}
      className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] overflow-hidden"
    >
      {/* Main row */}
      <Link
        href={`/social/politicians/${official.id}`}
        className="flex items-center gap-3 px-4 pt-4 pb-3 group"
      >
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full flex items-center justify-center text-white font-black text-sm flex-shrink-0 bg-[#0A2342] dark:bg-white/10 relative">
          {official.photoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={official.photoUrl} alt={official.name} className="w-full h-full rounded-full object-cover" />
          ) : (
            <span>{initials(official.name)}</span>
          )}
          {official.isClaimed && (
            <div className="absolute -bottom-0.5 -right-0.5 w-4 h-4 bg-[#00D4C8] rounded-full flex items-center justify-center">
              <CheckCircle className="w-2.5 h-2.5 text-[#080D14]" />
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="font-black text-gray-900 dark:text-white text-sm group-hover:text-[#00D4C8] transition-colors truncate">
              {official.name}
            </span>
            {official.subscriptionStatus === "verified" && (
              <CheckCircle className="w-3.5 h-3.5 text-[#00D4C8] flex-shrink-0" />
            )}
          </div>
          <p className="text-[11px] text-gray-500 dark:text-white/40 truncate mt-0.5">
            {official.title}
          </p>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={cn(
              "text-[10px] font-black tracking-widest px-2 py-0.5 rounded-full border",
              badge
            )}>
              {label}
            </span>
            {official.district && (
              <span className="text-[11px] text-gray-400 dark:text-white/30 truncate max-w-[120px]">
                {official.district}
              </span>
            )}
            <span className="text-[11px] text-gray-400 dark:text-white/25 flex items-center gap-0.5 ml-auto">
              <Users className="w-3 h-3" />
              {official._count.follows.toLocaleString()}
            </span>
          </div>
        </div>

        <ChevronRight className="w-4 h-4 text-gray-300 dark:text-white/20 group-hover:text-[#00D4C8] transition-colors flex-shrink-0" />
      </Link>

      {/* Action bar */}
      <div className="flex gap-2 px-4 pb-4">
        <button
          onClick={() => onToggleFollow(official.id, isFollowing)}
          className={cn(
            "flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black tracking-wider transition-all active:scale-[0.97] border",
            isFollowing
              ? "bg-[#00D4C8]/10 border-[#00D4C8]/30 text-[#00D4C8]"
              : "bg-white dark:bg-white/5 border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:border-[#00D4C8]/40 hover:text-[#00D4C8]"
          )}
        >
          {isFollowing ? (
            <><BellOff className="w-3.5 h-3.5" /> FOLLOWING</>
          ) : (
            <><Bell className="w-3.5 h-3.5" /> FOLLOW</>
          )}
        </button>
        <Link
          href={`/social/politicians/${official.id}`}
          className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black tracking-wider border border-gray-200 dark:border-white/10 text-gray-600 dark:text-white/50 hover:border-[#00D4C8]/40 hover:text-[#00D4C8] transition-all active:scale-[0.97]"
        >
          VIEW PROFILE
        </Link>
      </div>
    </motion.div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function SocialOfficials() {
  const { data: session } = useSession();

  const [level, setLevel]               = useState<LevelKey>("all");
  const [search, setSearch]             = useState("");
  const [postalCode, setPostalCode]     = useState("");
  const [postalInput, setPostalInput]   = useState("");
  const [showPostalBar, setShowPostalBar] = useState(false);

  const [officials, setOfficials]       = useState<Official[]>([]);
  const [localReps, setLocalReps]       = useState<Official[]>([]);
  const [loading, setLoading]           = useState(true);
  const [loadingLocal, setLoadingLocal] = useState(false);
  const [hasMore, setHasMore]           = useState(false);
  const [nextCursor, setNextCursor]     = useState<string | null>(null);
  const [loadingMore, setLoadingMore]   = useState(false);

  const [followed, setFollowed]         = useState<Set<string>>(new Set());

  const debouncedSearch = useDebounce(search, 350);
  const bottomRef = useRef<HTMLDivElement>(null);

  /* ── Load officials ──────────────────────────────────────────────────── */
  const loadOfficials = useCallback(async (cursor?: string) => {
    if (!cursor) setLoading(true);
    else setLoadingMore(true);

    try {
      const params = new URLSearchParams();
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (level !== "all")  params.set("level", level);
      if (cursor)           params.set("cursor", cursor);
      params.set("pageSize", "20");

      const res  = await fetch(`/api/officials/directory?${params}`);
      const data = await res.json();
      const list: Official[] = (data.officials ?? []).map((o: Official & { _count?: { follows: number; questions: number } }) => ({
        ...o,
        _count: o._count ?? { follows: 0, questions: 0 },
      }));

      if (cursor) {
        setOfficials(prev => [...prev, ...list]);
      } else {
        setOfficials(list);
      }

      setHasMore(data.hasMore ?? false);
      setNextCursor(data.nextCursor ?? null);
    } catch {
      if (!cursor) setOfficials([]);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, [debouncedSearch, level]);

  useEffect(() => { loadOfficials(); }, [loadOfficials]);

  /* ── Infinite scroll ─────────────────────────────────────────────────── */
  useEffect(() => {
    if (!bottomRef.current) return;
    const observer = new IntersectionObserver(
      entries => {
        if (entries[0].isIntersecting && hasMore && nextCursor && !loadingMore) {
          loadOfficials(nextCursor);
        }
      },
      { threshold: 0.5 }
    );
    observer.observe(bottomRef.current);
    return () => observer.disconnect();
  }, [hasMore, nextCursor, loadingMore, loadOfficials]);

  /* ── Local reps by postal code ───────────────────────────────────────── */
  async function lookupLocalReps(code: string) {
    const normalized = code.replace(/\s+/g, "").toUpperCase();
    if (normalized.length < 3) return;
    setLoadingLocal(true);
    try {
      const res  = await fetch(`/api/officials?postalCode=${encodeURIComponent(normalized)}`);
      const data = await res.json();
      setLocalReps((data.data ?? []).map((o: Official) => ({
        ...o,
        _count: (o as Official & { _count?: unknown })._count ?? { follows: 0, questions: 0 },
      })));
      setPostalCode(normalized);
      setShowPostalBar(false);
    } catch {
      toast.error("Could not find representatives for that postal code.");
    } finally {
      setLoadingLocal(false);
    }
  }

  /* ── Follow / unfollow ───────────────────────────────────────────────── */
  async function toggleFollow(officialId: string, currently: boolean) {
    if (!session?.user) {
      toast.error("Sign in to follow representatives.");
      return;
    }
    const method = currently ? "DELETE" : "POST";
    setFollowed(prev => {
      const next = new Set(prev);
      if (currently) next.delete(officialId);
      else next.add(officialId);
      return next;
    });
    try {
      const res = await fetch(`/api/social/officials/${officialId}/follow`, { method });
      if (!res.ok) throw new Error();
      toast.success(currently ? "Unfollowed." : "Following! You will see their posts in your feed.");
    } catch {
      setFollowed(prev => {
        const next = new Set(prev);
        if (currently) next.add(officialId);
        else next.delete(officialId);
        return next;
      });
      toast.error("Something went wrong. Try again.");
    }
  }

  /* ── Render ──────────────────────────────────────────────────────────── */
  return (
    <div className="min-h-screen bg-[#F0F4F8] dark:bg-[#080D14]">

      {/* ── Sticky sub-header ── */}
      <div className="sticky top-14 z-20 bg-[#F0F4F8]/95 dark:bg-[#080D14]/95 backdrop-blur-md border-b border-gray-200 dark:border-white/[0.06]">
        <div className="max-w-2xl mx-auto px-4 py-2 space-y-2">

          {/* Search row */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 dark:text-white/30" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Search by name, district, or title…"
                className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:outline-none focus:border-[#00D4C8]/50 focus:ring-1 focus:ring-[#00D4C8]/30 transition-all"
              />
              {search && (
                <button onClick={() => setSearch("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-white/30 hover:text-gray-600 dark:hover:text-white/60">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowPostalBar(v => !v)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2.5 rounded-xl border text-xs font-black tracking-wider transition-all flex-shrink-0",
                postalCode
                  ? "border-[#00D4C8]/40 text-[#00D4C8] bg-[#00D4C8]/10"
                  : "border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 bg-white dark:bg-white/[0.04] hover:border-[#00D4C8]/40 hover:text-[#00D4C8]"
              )}
              title="Find your local representatives"
            >
              <Locate className="w-3.5 h-3.5" />
              {postalCode ? postalCode.slice(0, 3) : "LOCAL"}
            </button>
          </div>

          {/* Postal code bar (collapsible) */}
          <AnimatePresence>
            {showPostalBar && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="overflow-hidden"
              >
                <div className="flex items-center gap-2 pb-1">
                  <input
                    value={postalInput}
                    onChange={e => setPostalInput(e.target.value.toUpperCase())}
                    onKeyDown={e => { if (e.key === "Enter") lookupLocalReps(postalInput); }}
                    placeholder="Enter postal code (e.g. M5V)"
                    maxLength={7}
                    className="flex-1 px-3 py-2 rounded-xl border border-gray-200 dark:border-white/[0.08] bg-white dark:bg-white/[0.04] text-sm text-gray-900 dark:text-white placeholder:text-gray-400 dark:placeholder:text-white/25 focus:outline-none focus:border-[#00D4C8]/50 uppercase tracking-widest"
                  />
                  <button
                    onClick={() => lookupLocalReps(postalInput)}
                    disabled={postalInput.length < 3}
                    className="px-4 py-2 rounded-xl bg-[#00D4C8] text-[#080D14] text-xs font-black tracking-wider disabled:opacity-40 transition-all active:scale-95"
                  >
                    FIND
                  </button>
                  {postalCode && (
                    <button
                      onClick={() => { setPostalCode(""); setLocalReps([]); setShowPostalBar(false); }}
                      className="px-3 py-2 rounded-xl border border-gray-200 dark:border-white/10 text-gray-500 dark:text-white/40 text-xs hover:border-red-300 hover:text-red-400 transition-all"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Level filter tabs */}
          <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
            {LEVEL_TABS.map(tab => {
              const Icon = tab.icon;
              const active = level === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setLevel(tab.key)}
                  className={cn(
                    "flex-shrink-0 flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-[11px] font-black tracking-wider transition-all",
                    active
                      ? "bg-white dark:bg-white text-[#080D14] shadow-sm"
                      : "text-gray-500 dark:text-white/40 hover:text-gray-800 dark:hover:text-white/70"
                  )}
                >
                  <Icon className="w-3 h-3" />
                  {tab.label.toUpperCase()}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ── Content ── */}
      <div className="max-w-2xl mx-auto px-4 py-4 space-y-4">

        {/* Your Local Reps section */}
        <AnimatePresence>
          {localReps.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={spring}
            >
              <div className="flex items-center justify-between mb-2">
                <p className="text-[11px] font-black tracking-widest text-[#00D4C8] uppercase flex items-center gap-1.5">
                  <Locate className="w-3 h-3" />
                  YOUR LOCAL REPS — {postalCode.slice(0, 3)}
                </p>
              </div>
              <div className="space-y-3">
                {loadingLocal
                  ? Array.from({ length: 3 }).map((_, i) => <Shimmer key={i} className="h-28" />)
                  : localReps.map(o => (
                      <OfficialCard
                        key={o.id}
                        official={o}
                        isFollowing={followed.has(o.id)}
                        onToggleFollow={toggleFollow}
                      />
                    ))
                }
              </div>

              {/* Divider */}
              <div className="flex items-center gap-3 mt-5 mb-1">
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.06]" />
                <span className="text-[10px] font-black tracking-widest text-gray-400 dark:text-white/25">ALL OFFICIALS</span>
                <div className="flex-1 h-px bg-gray-200 dark:bg-white/[0.06]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Postal code prompt (no postal set, not searching) */}
        {!postalCode && !search && !loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="rounded-2xl border border-[#00D4C8]/20 bg-[#00D4C8]/5 dark:bg-[#00D4C8]/[0.06] p-4 flex items-start gap-3"
          >
            <Locate className="w-5 h-5 text-[#00D4C8] flex-shrink-0 mt-0.5" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-gray-900 dark:text-white">Find your representatives</p>
              <p className="text-xs text-gray-500 dark:text-white/50 mt-0.5">Enter your postal code to see the officials who represent you.</p>
              <button
                onClick={() => setShowPostalBar(true)}
                className="inline-flex items-center gap-1 mt-2 text-xs font-bold text-[#00D4C8] hover:underline"
              >
                Enter postal code <ChevronRight className="w-3 h-3" />
              </button>
            </div>
          </motion.div>
        )}

        {/* Loading skeletons */}
        {loading && Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] p-4 space-y-3">
            <div className="flex items-center gap-3">
              <Shimmer className="w-12 h-12 !rounded-full" />
              <div className="flex-1 space-y-2">
                <Shimmer className="h-3.5 w-32 !rounded-md" />
                <Shimmer className="h-2.5 w-24 !rounded-md" />
                <div className="flex gap-2">
                  <Shimmer className="h-5 w-12 !rounded-full" />
                  <Shimmer className="h-5 w-20 !rounded-full" />
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Shimmer className="h-9 flex-1 !rounded-xl" />
              <Shimmer className="h-9 flex-1 !rounded-xl" />
            </div>
          </div>
        ))}

        {/* Empty state */}
        {!loading && officials.length === 0 && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] p-10 text-center">
            <Users className="w-10 h-10 mx-auto mb-4 text-gray-200 dark:text-white/10" />
            {debouncedSearch ? (
              <>
                <p className="font-bold text-gray-900 dark:text-white">No results for &ldquo;{debouncedSearch}&rdquo;</p>
                <p className="text-sm text-gray-400 dark:text-white/40 mt-1">Try a different name, district, or title.</p>
                <button onClick={() => setSearch("")} className="mt-4 px-5 py-2.5 rounded-full text-sm font-bold text-[#00D4C8] border border-[#00D4C8]/30 hover:bg-[#00D4C8]/10 transition-colors">
                  Clear search
                </button>
              </>
            ) : (
              <>
                <p className="font-bold text-gray-900 dark:text-white">No officials found</p>
                <p className="text-sm text-gray-400 dark:text-white/40 mt-1">
                  {level !== "all" ? `No ${level} officials match. Try a different level.` : "Representatives are being added — check back soon."}
                </p>
                {level !== "all" && (
                  <button onClick={() => setLevel("all")} className="mt-4 px-5 py-2.5 rounded-full text-sm font-bold text-[#00D4C8] border border-[#00D4C8]/30 hover:bg-[#00D4C8]/10 transition-colors">
                    Show all levels
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* Officials list */}
        {!loading && officials.map(o => (
          <OfficialCard
            key={o.id}
            official={o}
            isFollowing={followed.has(o.id)}
            onToggleFollow={toggleFollow}
          />
        ))}

        {/* Load more skeleton */}
        {loadingMore && (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <Shimmer key={i} className="h-32" />
            ))}
          </div>
        )}

        {/* Bottom sentinel for infinite scroll */}
        <div ref={bottomRef} className="h-1" />

        {/* End of list */}
        {!loading && !hasMore && officials.length > 0 && (
          <p className="text-center text-[11px] text-gray-400 dark:text-white/25 py-4 tracking-widest">
            ALL {officials.length} OFFICIALS SHOWN
          </p>
        )}

        {/* Election callout */}
        {!loading && (
          <div className="rounded-2xl border border-gray-200 dark:border-white/[0.06] bg-white dark:bg-[#0F1923] p-4 flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 bg-[#EF9F27]">
              <Landmark className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-gray-900 dark:text-white text-sm">2026 Ontario Municipal Elections</p>
              <p className="text-xs text-gray-400 dark:text-white/40">October 2026 · Follow candidates running in your ward</p>
            </div>
            <button
              onClick={() => setLevel("municipal")}
              className="text-xs font-bold text-[#00D4C8] flex-shrink-0 flex items-center gap-0.5 hover:underline"
            >
              Local <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
