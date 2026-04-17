"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, ArrowRight } from "lucide-react";
import type { ComponentType } from "react";

interface NavEntry {
  href: string;
  label: string;
  section: string;
  icon: ComponentType<{ className?: string }>;
}

interface CommandPaletteProps {
  entries: NavEntry[];
  open: boolean;
  onClose: () => void;
}

export type { NavEntry };

export default function CommandPalette({ entries, open, onClose }: CommandPaletteProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [cursor, setCursor] = useState(0);

  const results = query.trim()
    ? entries.filter(
        (e) =>
          e.label.toLowerCase().includes(query.toLowerCase()) ||
          e.section.toLowerCase().includes(query.toLowerCase()),
      )
    : entries;

  const go = useCallback(
    (href: string) => {
      router.push(href);
      onClose();
      setQuery("");
    },
    [router, onClose],
  );

  useEffect(() => {
    if (open) {
      setQuery("");
      setCursor(0);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    setCursor(0);
  }, [query]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") { onClose(); return; }
      if (e.key === "ArrowDown") { e.preventDefault(); setCursor((c) => Math.min(c + 1, results.length - 1)); }
      if (e.key === "ArrowUp")   { e.preventDefault(); setCursor((c) => Math.max(c - 1, 0)); }
      if (e.key === "Enter" && results[cursor]) go(results[cursor].href);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, cursor, results, go, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/60 z-50"
            onClick={onClose}
          />
          <motion.div
            key="palette"
            initial={{ opacity: 0, scale: 0.95, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed top-24 left-1/2 -translate-x-1/2 w-full max-w-lg z-50"
          >
            <div className="bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
              {/* Input */}
              <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-800">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search pages…"
                  className="flex-1 bg-transparent text-white text-sm placeholder-slate-500 outline-none"
                />
                {query && (
                  <button onClick={() => setQuery("")} className="text-slate-500 hover:text-white transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>

              {/* Results */}
              <div className="max-h-80 overflow-y-auto py-2">
                {results.length === 0 ? (
                  <p className="text-center text-slate-500 text-sm py-8">No results for &ldquo;{query}&rdquo;</p>
                ) : (
                  results.map((entry, i) => {
                    const Icon = entry.icon;
                    const active = i === cursor;
                    return (
                      <button
                        key={entry.href}
                        onClick={() => go(entry.href)}
                        onMouseEnter={() => setCursor(i)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${
                          active ? "bg-blue-600" : "hover:bg-slate-800"
                        }`}
                      >
                        <Icon className={`w-4 h-4 shrink-0 ${active ? "text-white" : "text-slate-400"}`} />
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm font-medium truncate ${active ? "text-white" : "text-slate-200"}`}>
                            {entry.label}
                          </p>
                          <p className={`text-[11px] truncate ${active ? "text-blue-200" : "text-slate-500"}`}>
                            {entry.section}
                          </p>
                        </div>
                        {active && <ArrowRight className="w-3.5 h-3.5 text-blue-200 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              <div className="px-4 py-2 border-t border-slate-800 flex items-center gap-4 text-[10px] text-slate-600">
                <span><kbd className="font-mono bg-slate-800 px-1 rounded">↑↓</kbd> navigate</span>
                <span><kbd className="font-mono bg-slate-800 px-1 rounded">↵</kbd> open</span>
                <span><kbd className="font-mono bg-slate-800 px-1 rounded">Esc</kbd> close</span>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
