"use client";
import { useState, useRef, useEffect } from "react";

type Member = { id: string; name: string | null; email: string | null };

interface TeamMemberAutocompleteProps {
  teamMembers: Member[];
  value: string | null;
  onChange: (id: string | null) => void;
  placeholder?: string;
  className?: string;
}

export function TeamMemberAutocomplete({
  teamMembers,
  value,
  onChange,
  placeholder = "Search team members…",
  className,
}: TeamMemberAutocompleteProps) {
  const selected = teamMembers.find(m => m.id === value) ?? null;
  const [query, setQuery] = useState(selected ? (selected.name ?? selected.email ?? "") : "");
  const [open, setOpen] = useState(false);
  const [cursor, setCursor] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync display text when value changes externally
  useEffect(() => {
    if (!value) { setQuery(""); return; }
    const m = teamMembers.find(m => m.id === value);
    if (m) setQuery(m.name ?? m.email ?? "");
  }, [value, teamMembers]);

  const filtered = query.trim().length === 0
    ? teamMembers
    : teamMembers.filter(m => {
        const q = query.toLowerCase();
        return (m.name ?? "").toLowerCase().includes(q) || (m.email ?? "").toLowerCase().includes(q);
      });

  function select(m: Member | null) {
    onChange(m?.id ?? null);
    setQuery(m ? (m.name ?? m.email ?? "") : "");
    setOpen(false);
    setCursor(-1);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (!open) { if (e.key === "ArrowDown" || e.key === "Enter") { setOpen(true); setCursor(0); } return; }
    if (e.key === "ArrowDown") { e.preventDefault(); setCursor(c => Math.min(c + 1, filtered.length)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)); }
    else if (e.key === "Enter") {
      e.preventDefault();
      if (cursor === 0) select(null);
      else if (filtered[cursor - 1]) select(filtered[cursor - 1]);
    } else if (e.key === "Escape") { setOpen(false); setCursor(-1); }
  }

  return (
    <div className={`relative ${className ?? ""}`}>
      <input
        ref={inputRef}
        type="text"
        value={query}
        placeholder={placeholder}
        onChange={e => { setQuery(e.target.value); setOpen(true); setCursor(-1); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        onKeyDown={handleKeyDown}
        className="w-full text-sm px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      {open && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-52 overflow-y-auto">
          <div
            className={`px-3 py-2 text-sm cursor-pointer text-gray-400 italic hover:bg-gray-50 ${cursor === 0 ? "bg-blue-50" : ""}`}
            onMouseDown={e => { e.preventDefault(); select(null); }}
          >
            Unassigned
          </div>
          {filtered.map((m, i) => (
            <div
              key={m.id}
              className={`px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${cursor === i + 1 ? "bg-blue-50" : ""}`}
              onMouseDown={e => { e.preventDefault(); select(m); }}
            >
              <span className="font-medium text-gray-800">{m.name ?? m.email}</span>
              {m.name && m.email && <span className="ml-2 text-xs text-gray-400">{m.email}</span>}
            </div>
          ))}
          {filtered.length === 0 && (
            <div className="px-3 py-2 text-sm text-gray-400 italic">No team members found</div>
          )}
        </div>
      )}
    </div>
  );
}
