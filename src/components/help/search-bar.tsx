"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type SearchResult = {
  slug: string;
  title: string;
  category: string;
  readTimeMinutes: number;
};

export function HelpSearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (!query.trim()) {
        setResults([]);
        setActiveIndex(0);
        return;
      }
      const res = await fetch(`/api/help/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults((data.data || []) as SearchResult[]);
      setActiveIndex(0);
    }, 300);
    return () => clearTimeout(timer);
  }, [query]);

  useEffect(() => {
    function onKeyDown(ev: KeyboardEvent) {
      if (ev.key === "Escape") {
        setQuery("");
        setResults([]);
        setActiveIndex(0);
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const hasResults = useMemo(() => query.trim() && results.length > 0, [query, results.length]);

  function onKeyDown(ev: React.KeyboardEvent<HTMLInputElement>) {
    if (!results.length) return;
    if (ev.key === "ArrowDown") {
      ev.preventDefault();
      setActiveIndex((v) => (v + 1) % results.length);
    }
    if (ev.key === "ArrowUp") {
      ev.preventDefault();
      setActiveIndex((v) => (v - 1 + results.length) % results.length);
    }
    if (ev.key === "Enter") {
      ev.preventDefault();
      const active = results[activeIndex];
      if (active) router.push(`/help/${active.slug}`);
    }
  }

  return (
    <div className="relative">
      <input
        ref={inputRef}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={onKeyDown}
        placeholder="Search for anything — canvassing, GOTV, volunteers..."
        className="w-full rounded-xl border border-slate-300 bg-white px-4 py-4 text-base focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {hasResults && (
        <div className="absolute z-20 mt-2 w-full rounded-xl border border-slate-200 bg-white shadow-lg overflow-hidden">
          {results.map((result, index) => (
            <button
              key={result.slug}
              type="button"
              onClick={() => router.push(`/help/${result.slug}`)}
              className={`w-full text-left px-4 py-3 border-b last:border-b-0 ${index === activeIndex ? "bg-blue-50" : "hover:bg-slate-50"}`}
            >
              <p className="text-sm font-semibold text-slate-900">{result.title}</p>
              <p className="text-xs text-slate-600 mt-1">
                <span className="inline-block mr-2 rounded-full bg-slate-100 px-2 py-0.5">{result.category}</span>
                {result.readTimeMinutes} min read
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
