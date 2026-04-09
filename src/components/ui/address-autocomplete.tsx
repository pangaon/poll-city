"use client";

/**
 * AddressAutocomplete
 *
 * Reusable address input with Canadian geocoding suggestions.
 * Uses Nominatim (OpenStreetMap) — no new npm dependency.
 * Debounced at 400ms, limited to CA results.
 *
 * Usage:
 *   <AddressAutocomplete
 *     value={address}
 *     onChange={setAddress}
 *     onSelect={(result) => {
 *       setCity(result.city ?? "");
 *       setProvince(result.province ?? "");
 *       setPostalCode(result.postalCode ?? "");
 *     }}
 *   />
 */

import { useState, useEffect, useRef, useCallback } from "react";
import { MapPin, Loader2, Search } from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AddressResult {
  displayName: string;
  /** Short label for display (street + number) */
  label: string;
  houseNumber: string | null;
  street: string | null;
  city: string | null;
  province: string | null;
  postalCode: string | null;
  lat: number;
  lng: number;
}

interface NominatimResult {
  place_id: number;
  display_name: string;
  lat: string;
  lon: string;
  address?: {
    house_number?: string;
    road?: string;
    pedestrian?: string;
    suburb?: string;
    city?: string;
    town?: string;
    village?: string;
    municipality?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country_code?: string;
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseResult(r: NominatimResult): AddressResult {
  const a = r.address ?? {};
  const street = a.road ?? a.pedestrian ?? null;
  const city = a.city ?? a.town ?? a.village ?? a.municipality ?? a.county ?? null;
  const hn = a.house_number ?? null;
  const label = hn && street ? `${hn} ${street}` : street ?? r.display_name.split(",")[0] ?? r.display_name;
  return {
    displayName: r.display_name,
    label,
    houseNumber: hn,
    street,
    city,
    province: a.state ?? null,
    postalCode: a.postcode ?? null,
    lat: parseFloat(r.lat),
    lng: parseFloat(r.lon),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onSelect?: (result: AddressResult) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  /** Minimum characters before searching (default 4) */
  minChars?: number;
}

export function AddressAutocomplete({
  value,
  onChange,
  onSelect,
  placeholder = "Start typing an address…",
  className,
  disabled,
  minChars = 4,
}: AddressAutocompleteProps) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<NominatimResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Sync controlled value changes from outside
  useEffect(() => {
    if (value !== query) setQuery(value);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const search = useCallback(
    async (q: string) => {
      if (q.length < minChars) {
        setResults([]);
        setOpen(false);
        return;
      }

      // Abort any in-flight request
      abortRef.current?.abort();
      abortRef.current = new AbortController();

      setLoading(true);
      try {
        const params = new URLSearchParams({
          q,
          countrycodes: "ca",
          format: "json",
          addressdetails: "1",
          limit: "6",
        });
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?${params.toString()}`,
          {
            headers: {
              "Accept-Language": "en",
              // Nominatim requires a valid User-Agent identifying the application
              "User-Agent": "PollCity/1.0 contact:support@poll.city",
            },
            signal: abortRef.current.signal,
          },
        );
        if (!res.ok) return;
        const data = (await res.json()) as NominatimResult[];
        setResults(data);
        setOpen(data.length > 0);
      } catch (err) {
        // Ignore AbortError; silently swallow geocoding failures
        if (err instanceof Error && err.name === "AbortError") return;
      } finally {
        setLoading(false);
      }
    },
    [minChars],
  );

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    onChange(q);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => void search(q), 400);
  }

  function handleSelect(r: NominatimResult) {
    const parsed = parseResult(r);
    setQuery(parsed.displayName);
    onChange(parsed.displayName);
    setOpen(false);
    setResults([]);
    onSelect?.(parsed);
  }

  function handleClear() {
    setQuery("");
    onChange("");
    setResults([]);
    setOpen(false);
  }

  // Close on outside click
  useEffect(() => {
    function handle(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative w-full", className)}>
      {/* Input */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={handleChange}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder={placeholder}
          disabled={disabled}
          className="w-full pl-9 pr-9 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:opacity-60 bg-white placeholder:text-gray-400"
          autoComplete="off"
          spellCheck={false}
        />
        {loading ? (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 animate-spin" />
        ) : query ? (
          <button
            type="button"
            onClick={handleClear}
            className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 hover:text-gray-600"
            aria-label="Clear address"
          >
            ×
          </button>
        ) : null}
      </div>

      {/* Dropdown */}
      {open && results.length > 0 && (
        <ul className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg overflow-hidden max-h-64 overflow-y-auto">
          {results.map((r) => {
            const parsed = parseResult(r);
            return (
              <li key={r.place_id} className="border-b border-gray-50 last:border-0">
                <button
                  type="button"
                  className="w-full text-left px-3 py-2.5 hover:bg-blue-50 flex items-start gap-2.5 transition-colors"
                  onClick={() => handleSelect(r)}
                >
                  <MapPin className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-tight truncate">
                      {parsed.label}
                    </p>
                    <p className="text-xs text-gray-500 truncate mt-0.5">
                      {[parsed.city, parsed.province, parsed.postalCode]
                        .filter(Boolean)
                        .join(", ")}
                    </p>
                  </div>
                </button>
              </li>
            );
          })}
          <li className="px-3 py-1.5 bg-gray-50">
            <p className="text-[10px] text-gray-400 text-right">
              © OpenStreetMap contributors
            </p>
          </li>
        </ul>
      )}
    </div>
  );
}
