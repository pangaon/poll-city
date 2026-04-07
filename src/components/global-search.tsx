"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Search, X, User, MapPin, Vote, Users as UsersIcon, BookOpen, Clock, ArrowRight } from "lucide-react";
import { useDebounce } from "@/lib/hooks/useDebounce";
import { HELP_ARTICLES } from "@/app/(app)/help/help-data";

interface ResultItem {
  id: string;
  type: "contact" | "volunteer" | "official" | "poll" | "turf" | "help";
  title: string;
  subtitle?: string;
  href: string;
}

const TYPE_META: Record<ResultItem["type"], { label: string; icon: typeof User; colour: string }> = {
  contact: { label: "Contact", icon: User, colour: "text-blue-600" },
  volunteer: { label: "Volunteer", icon: UsersIcon, colour: "text-emerald-600" },
  official: { label: "Official", icon: User, colour: "text-purple-600" },
  poll: { label: "Poll", icon: Vote, colour: "text-amber-600" },
  turf: { label: "Turf", icon: MapPin, colour: "text-orange-600" },
  help: { label: "Help Article", icon: BookOpen, colour: "text-gray-600" },
};

const RECENT_KEY = "poll-city-recent-searches";

interface GlobalSearchProps {
  open: boolean;
  onClose: () => void;
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIdx, setSelectedIdx] = useState(0);
  const [recent, setRecent] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const debouncedQuery = useDebounce(query, 200);

  // Load recent searches
  useEffect(() => {
    try {
      const raw = localStorage.getItem(RECENT_KEY);
      if (raw) setRecent(JSON.parse(raw));
    } catch { /* ignore */ }
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setSelectedIdx(0);
      setTimeout(() => inputRef.current?.focus(), 10);
    }
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
      return () => {
        document.body.style.overflow = "";
      };
    }
  }, [open]);

  // Search help articles locally (instant)
  const helpResults = useMemo<ResultItem[]>(() => {
    if (!debouncedQuery.trim()) return [];
    const q = debouncedQuery.toLowerCase().trim();
    return HELP_ARTICLES
      .filter(
        (a) =>
          a.title.toLowerCase().includes(q) ||
          a.excerpt.toLowerCase().includes(q) ||
          a.keywords.some((k) => k.includes(q))
      )
      .slice(0, 5)
      .map<ResultItem>((a) => ({
        id: `help-${a.id}`,
        type: "help",
        title: a.title,
        subtitle: a.excerpt,
        href: `/help?article=${a.slug}`,
      }));
  }, [debouncedQuery]);

  // Fetch server results
  const fetchResults = useCallback(async (q: string) => {
    if (!q.trim() || q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`);
      if (res.ok) {
        const data = await res.json();
        setResults(data.results ?? []);
      } else {
        setResults([]);
      }
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResults(debouncedQuery);
  }, [debouncedQuery, fetchResults]);

  const combinedResults = useMemo(() => [...results, ...helpResults], [results, helpResults]);

  // Group results by type
  const grouped = useMemo(() => {
    const map = new Map<string, ResultItem[]>();
    for (const r of combinedResults) {
      const existing = map.get(r.type) ?? [];
      existing.push(r);
      map.set(r.type, existing);
    }
    return Array.from(map.entries());
  }, [combinedResults]);

  function selectResult(item: ResultItem) {
    // Save to recent
    const newRecent = [query, ...recent.filter((r) => r !== query)].filter(Boolean).slice(0, 5);
    setRecent(newRecent);
    try {
      localStorage.setItem(RECENT_KEY, JSON.stringify(newRecent));
    } catch { /* ignore */ }
    router.push(item.href);
    onClose();
  }

  // Keyboard navigation
  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIdx((i) => Math.min(combinedResults.length - 1, i + 1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIdx((i) => Math.max(0, i - 1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      const item = combinedResults[selectedIdx];
      if (item) selectResult(item);
      return;
    }
  }

  if (!open) return null;

  let runningIdx = -1;

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-12 md:pt-20 px-4" role="dialog" aria-modal="true">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} aria-hidden />

      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[70vh] flex flex-col animate-fade-in">
        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-gray-100">
          <Search className="w-5 h-5 text-gray-400 flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIdx(0);
            }}
            onKeyDown={onKeyDown}
            placeholder="Search contacts, volunteers, officials, polls, help..."
            className="flex-1 text-base bg-transparent outline-none placeholder-gray-400"
            autoComplete="off"
          />
          <button
            onClick={onClose}
            aria-label="Close search"
            className="p-1 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Results */}
        <div ref={resultsRef} className="flex-1 overflow-y-auto">
          {!query.trim() && recent.length > 0 && (
            <div className="p-3">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2 flex items-center gap-1.5 px-2">
                <Clock className="w-3 h-3" /> Recent searches
              </p>
              {recent.map((r) => (
                <button
                  key={r}
                  onClick={() => setQuery(r)}
                  className="w-full text-left px-3 py-2 rounded-lg hover:bg-gray-50 text-sm text-gray-700 flex items-center justify-between"
                >
                  <span>{r}</span>
                  <ArrowRight className="w-3.5 h-3.5 text-gray-300" />
                </button>
              ))}
            </div>
          )}

          {!query.trim() && recent.length === 0 && (
            <div className="p-8 text-center">
              <Search className="w-10 h-10 text-gray-200 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Start typing to search across Poll City.</p>
              <p className="text-xs text-gray-400 mt-1">Try "supporters", "Toronto", "gotv"</p>
            </div>
          )}

          {query.trim() && loading && (
            <div className="p-6 text-center text-sm text-gray-500">Searching...</div>
          )}

          {query.trim() && !loading && combinedResults.length === 0 && (
            <div className="p-8 text-center">
              <p className="text-sm text-gray-500">No results for "{query}"</p>
              <p className="text-xs text-gray-400 mt-1">Try different keywords.</p>
            </div>
          )}

          {grouped.map(([type, items]) => {
            const meta = TYPE_META[type as ResultItem["type"]];
            return (
              <div key={type} className="py-2">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide px-4 mb-1 flex items-center gap-1.5">
                  <meta.icon className={`w-3 h-3 ${meta.colour}`} />
                  {meta.label}
                  <span className="text-gray-400">({items.length})</span>
                </p>
                {items.map((item) => {
                  runningIdx++;
                  const isSelected = runningIdx === selectedIdx;
                  return (
                    <button
                      key={item.id}
                      onClick={() => selectResult(item)}
                      onMouseEnter={() => setSelectedIdx(runningIdx)}
                      className={`w-full text-left px-4 py-2.5 flex items-start gap-3 transition-colors ${
                        isSelected ? "bg-blue-50" : "hover:bg-gray-50"
                      }`}
                    >
                      <meta.icon className={`w-4 h-4 ${meta.colour} flex-shrink-0 mt-0.5`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
                        {item.subtitle && (
                          <p className="text-xs text-gray-500 truncate">{item.subtitle}</p>
                        )}
                      </div>
                      {isSelected && <ArrowRight className="w-3.5 h-3.5 text-blue-600 flex-shrink-0 mt-1" />}
                    </button>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 bg-gray-50 rounded-b-2xl">
          <div className="flex items-center gap-3">
            <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">up/down</kbd> navigate</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">enter</kbd> open</span>
            <span><kbd className="px-1.5 py-0.5 bg-white border border-gray-300 rounded text-[10px] font-mono">esc</kbd> close</span>
          </div>
          <span className="text-gray-400">Poll City Search</span>
        </div>
      </div>
    </div>
  );
}
