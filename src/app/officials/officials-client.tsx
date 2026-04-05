"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  Search, Globe, Twitter, Facebook, Instagram, Linkedin,
  ShieldCheck, AlertCircle, ChevronLeft, ChevronRight,
  Mail, Filter, X, SlidersHorizontal, MapPin, LocateFixed,
} from "lucide-react";
const BRAND_COLOUR = "#1E3A8A";

/* ─── Types ─────────────────────────────────────────────────────────────── */
interface Official {
  id: string;
  name: string;
  title: string | null;
  level: string;
  district: string;
  province: string | null;
  isClaimed: boolean;
  isActive: boolean;
  partyName: string | null;
  party: string | null;
  photoUrl: string | null;
  twitter: string | null;
  facebook: string | null;
  instagram: string | null;
  linkedIn: string | null;
  website: string | null;
  email: string | null;
  phone: string | null;
  externalId: string | null;
  campaignSlug: string | null;
}

interface FilterOptions {
  provinces: string[];
  levels: string[];
  roles: string[];
}

interface GeoLookupResponse {
  representatives: Official[];
  inputType?: "postalCode" | "address" | "coordinates";
  cached?: boolean;
  error?: string | null;
  message?: string | null;
}

/* ─── Constants ──────────────────────────────────────────────────────────── */
const LEVEL_LABELS: Record<string, string> = {
  federal: "Federal MP",
  provincial: "Provincial MPP",
  municipal: "Municipal",
};

const LEVEL_BADGE: Record<string, string> = {
  federal: "bg-blue-100 text-blue-700 border-blue-200",
  provincial: "bg-emerald-100 text-emerald-700 border-emerald-200",
  municipal: "bg-orange-100 text-orange-700 border-orange-200",
};

const STATS = [
  { value: "343", label: "Federal MPs" },
  { value: "124", label: "Ontario MPPs" },
  { value: "444", label: "Municipalities" },
  { value: "2025", label: "Data Updated" },
];

function getPartyColour(partyName: string | null, fallbackParty: string | null): string {
  const party = (partyName ?? fallbackParty ?? "").toLowerCase();
  if (party.includes("liberal")) return "#D71920";
  if (party.includes("conservative")) return "#1A4782";
  if (party.includes("ndp")) return "#F58220";
  if (party.includes("green")) return "#2E7D32";
  if (party.includes("bloc")) return "#00AEEF";
  return "#334155";
}

function getRepresentativeLabel(official: Official): string {
  const title = (official.title ?? "").toLowerCase();
  if (official.level === "federal") return "MP";
  if (official.level === "provincial") return "MPP";
  if (title.includes("mayor")) return "Mayor";
  if (title.includes("councillor")) return "Councillor";
  return "Representative";
}

/* ─── Official Card ──────────────────────────────────────────────────────── */
function OfficialCard({ official }: { official: Official }) {
  const initials = official.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase();
  const profilePath = `/officials/${official.id}`;
  const claimPath = `/claim/${official.externalId ?? official.id}`;
  const party = official.partyName ?? official.party ?? null;
  const levelBadge = LEVEL_BADGE[official.level] ?? "bg-gray-100 text-gray-700 border-gray-200";
  const hasSocial = official.twitter || official.facebook || official.instagram || official.linkedIn || official.website;

  return (
    <div
      className="bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-200 flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-blue-500"
      style={{ minHeight: 300 }}
    >
      {/* Party colour hero header */}
      <div
        className="relative flex flex-col items-center pt-6 pb-4 px-4"
        style={{
          background: `linear-gradient(135deg, ${BRAND_COLOUR} 0%, ${BRAND_COLOUR}cc 100%)`,
        }}
      >
        {/* Former member badge */}
        {!official.isActive && (
          <div className="absolute top-2 left-2 bg-gray-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
            Former Member
          </div>
        )}

        {/* Photo */}
        <div className="relative mb-3">
          <div className="w-[90px] h-[90px] rounded-full border-[3px] border-white shadow-lg overflow-hidden bg-white/20 flex items-center justify-center flex-shrink-0">
            {official.photoUrl ? (
              <Image
                src={official.photoUrl}
                alt={official.name}
                width={90}
                height={90}
                className="object-cover w-full h-full rounded-full"
                unoptimized={official.photoUrl.startsWith("http")}
                loading="lazy"
              />
            ) : (
              <span className="text-2xl font-extrabold text-white">{initials}</span>
            )}
          </div>
          {/* Verified badge overlay */}
          {official.isClaimed && (
            <div className="absolute -bottom-1 -right-1 bg-emerald-500 rounded-full p-0.5 border-2 border-white">
              <ShieldCheck className="w-3.5 h-3.5 text-white" />
            </div>
          )}
        </div>

        {/* Name */}
        <h3 className="text-white font-bold text-base text-center leading-tight mb-0.5">
          {official.name}
        </h3>

        {/* Title + district */}
        <p className="text-white/80 text-xs text-center leading-tight mb-2">
          {official.title && <span>{official.title} · </span>}
          {official.district}
        </p>

        {/* Party badge */}
        {party && (
          <span className="inline-flex items-center gap-1 bg-white/20 text-white text-[10px] font-semibold px-2.5 py-0.5 rounded-full border border-white/30 backdrop-blur-sm">
            {party}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col flex-1 p-4 gap-3">
        {/* Level + province badges */}
        <div className="flex flex-wrap gap-1.5">
          <span className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border ${levelBadge}`}>
            {LEVEL_LABELS[official.level] ?? official.level}
          </span>
          {official.province && (
            <span className="inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-gray-50 text-gray-600 border-gray-200">
              {official.province}
            </span>
          )}
        </div>

        {/* Social icons */}
        {hasSocial && (
          <div className="flex items-center gap-2 flex-wrap">
            {official.twitter && (
              <a
                href={official.twitter.startsWith("http") ? official.twitter : `https://twitter.com/${official.twitter.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer"
                aria-label={`${official.name} on Twitter/X`}
                className="text-gray-400 hover:text-sky-500 transition-colors"
              >
                <Twitter className="w-4 h-4" />
              </a>
            )}
            {official.facebook && (
              <a href={official.facebook} target="_blank" rel="noopener noreferrer"
                aria-label={`${official.name} on Facebook`}
                className="text-gray-400 hover:text-blue-600 transition-colors">
                <Facebook className="w-4 h-4" />
              </a>
            )}
            {official.instagram && (
              <a href={official.instagram.startsWith("http") ? official.instagram : `https://instagram.com/${official.instagram.replace("@", "")}`}
                target="_blank" rel="noopener noreferrer"
                aria-label={`${official.name} on Instagram`}
                className="text-gray-400 hover:text-pink-500 transition-colors">
                <Instagram className="w-4 h-4" />
              </a>
            )}
            {official.linkedIn && (
              <a href={official.linkedIn} target="_blank" rel="noopener noreferrer"
                aria-label={`${official.name} on LinkedIn`}
                className="text-gray-400 hover:text-blue-700 transition-colors">
                <Linkedin className="w-4 h-4" />
              </a>
            )}
            {official.website && (
              <a href={official.website} target="_blank" rel="noopener noreferrer"
                aria-label={`${official.name} website`}
                className="text-gray-400 hover:text-gray-700 transition-colors">
                <Globe className="w-4 h-4" />
              </a>
            )}
            {official.email && (
              <a href={`mailto:${official.email}`}
                aria-label={`Email ${official.name}`}
                className="text-gray-400 hover:text-emerald-600 transition-colors">
                <Mail className="w-4 h-4" />
              </a>
            )}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex gap-2 mt-auto">
          <Link
            href={profilePath}
            className="flex-1 text-center text-xs font-semibold py-2 px-3 rounded-lg text-white transition-colors hover:opacity-90"
            style={{ backgroundColor: BRAND_COLOUR }}
            aria-label={`View profile for ${official.name}`}
          >
            View Profile
          </Link>
          {!official.isClaimed && (
            <Link
              href={claimPath}
              className="flex-1 text-center text-xs font-semibold py-2 px-3 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors"
              aria-label={`Claim profile for ${official.name}`}
            >
              Claim Profile
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Skeleton Card ──────────────────────────────────────────────────────── */
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden animate-pulse" style={{ minHeight: 300 }}>
      <div className="h-32 bg-gray-200" />
      <div className="p-4 space-y-3">
        <div className="h-3 bg-gray-200 rounded w-3/4 mx-auto" />
        <div className="h-2 bg-gray-100 rounded w-1/2 mx-auto" />
        <div className="flex gap-1.5">
          <div className="h-5 bg-gray-100 rounded-full w-20" />
          <div className="h-5 bg-gray-100 rounded-full w-10" />
        </div>
        <div className="flex gap-2 mt-4">
          <div className="h-8 bg-gray-200 rounded-lg flex-1" />
          <div className="h-8 bg-gray-100 rounded-lg flex-1" />
        </div>
      </div>
    </div>
  );
}

/* ─── Main Component ─────────────────────────────────────────────────────── */
export default function OfficialsClient() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [filterOptions, setFilterOptions] = useState<FilterOptions>({ provinces: [], levels: [], roles: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [locationInput, setLocationInput] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [locationMessage, setLocationMessage] = useState<string | null>(null);
  const [yourRepresentatives, setYourRepresentatives] = useState<Official[]>([]);
  const [hasLocationSearch, setHasLocationSearch] = useState(false);

  // Filters
  const [search, setSearch] = useState("");
  const [level, setLevel] = useState("");
  const [province, setProvince] = useState("");
  const [page, setPage] = useState(1);

  const abortRef = useRef<AbortController | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const fetchOfficials = useCallback(async () => {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = new AbortController();
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ page: String(page) });
      if (search) params.set("search", search);
      if (level) params.set("level", level);
      if (province) params.set("province", province);

      const res = await fetch(`/api/officials/directory?${params}`, {
        signal: abortRef.current.signal,
      });
      if (!res.ok) throw new Error("Failed to load officials");
      const data = await res.json();
      setOfficials(data.officials ?? []);
      setTotal(data.total ?? 0);
      setPages(data.pages ?? 1);
      if (data.filterOptions) setFilterOptions(data.filterOptions);
    } catch (e: unknown) {
      if ((e as { name?: string }).name !== "AbortError") {
        setError("Failed to load officials. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  }, [search, level, province, page]);

  useEffect(() => { fetchOfficials(); }, [fetchOfficials]);

  function changePage(newPage: number) {
    setPage(newPage);
    topRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function clearFilters() {
    setSearch("");
    setLevel("");
    setProvince("");
    setPage(1);
  }

  // Format as user types: auto-uppercase + auto-space for postal codes.
  function handleLocationInput(value: string) {
    const isPostalShape = /^[A-Za-z]\d[A-Za-z]/.test(value.replace(/\s/g, ""));
    if (isPostalShape) {
      const clean = value.replace(/[^A-Za-z0-9]/g, "").toUpperCase().slice(0, 6);
      const formatted = clean.length > 3 ? `${clean.slice(0, 3)} ${clean.slice(3)}` : clean;
      setLocationInput(formatted);
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    setLocationInput(value);
    // Debounced address autocomplete (Nominatim)
    if (value.length >= 5) {
      setShowSuggestions(true);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }

  // Debounce nominatim calls
  useEffect(() => {
    if (!showSuggestions || locationInput.length < 5) return;
    if (/^[A-Z]\d[A-Z]/.test(locationInput.replace(/\s/g, ""))) return;
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput + " Canada")}&format=json&addressdetails=1&limit=5`,
        );
        const places = (await res.json()) as Array<{ display_name: string }>;
        setSuggestions(
          places.map((p) => p.display_name.split(",").slice(0, 3).join(",").trim()),
        );
      } catch {
        setSuggestions([]);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [locationInput, showSuggestions]);

  async function findMyOfficials(rawInput?: string) {
    const query = (rawInput ?? locationInput).trim();
    if (!query) {
      setHasLocationSearch(false);
      setLocationError(null);
      setLocationMessage(null);
      setYourRepresentatives([]);
      return;
    }

    setLocationLoading(true);
    setLocationError(null);
    setLocationMessage(null);
    setHasLocationSearch(true);

    try {
      const normalizedPostal = query.replace(/\s+/g, "").toUpperCase();
      const isPostal = /^[A-Z]\d[A-Z]\d[A-Z]\d$/.test(normalizedPostal);
      const params = new URLSearchParams();
      if (isPostal) {
        params.set("postalCode", query);
      } else {
        params.set("address", query);
      }

      const res = await fetch(`/api/geo?${params.toString()}`);
      const payload = (await res.json()) as GeoLookupResponse;

      if (!res.ok) {
        setLocationError(payload.error || payload.message || "Unable to find officials for that location.");
        setYourRepresentatives([]);
        return;
      }

      setYourRepresentatives(payload.representatives ?? []);
      setLocationMessage(payload.message ?? null);
      if (!payload.representatives?.length) {
        setLocationError(payload.message || "No local officials found for that location yet.");
      }
    } catch {
      setLocationError("Unable to lookup representatives right now. Please try again in a moment.");
      setYourRepresentatives([]);
    } finally {
      setLocationLoading(false);
    }
  }

  const hasFilters = search || level || province;

  return (
    <div>
      {/* ── Hero ── */}
      <div
        className="relative py-16 px-4 text-white"
        style={{ background: "linear-gradient(135deg, #D71920 0%, #8B0000 35%, #1A4782 100%)" }}
      >
        <div className="max-w-5xl mx-auto text-center">
          <h1 className="text-4xl sm:text-5xl font-black mb-3 leading-tight">
            Find Your Elected Representatives
          </h1>
          <p className="text-white/80 text-lg mb-8 max-w-2xl mx-auto">
            Federal MPs, provincial MPPs, mayors, and municipal councillors across Canada — updated for 2025.
          </p>

          {/* Search bar */}
          <div className="relative max-w-2xl mx-auto mb-8">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="search"
              placeholder="Search by name, district, or title…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="w-full pl-12 pr-4 py-4 rounded-2xl text-gray-900 text-base shadow-xl border-0 focus:outline-none focus:ring-4 focus:ring-white/30"
              aria-label="Search officials"
            />
          </div>

          {/* Level filter pills */}
          <div className="flex flex-wrap justify-center gap-2 mb-8">
            {[
              { value: "", label: "All Officials" },
              { value: "federal", label: "Federal MPs" },
              { value: "provincial", label: "Provincial MPPs" },
              { value: "municipal", label: "Municipal" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setLevel(opt.value); setPage(1); }}
                className={`px-5 py-2 rounded-full text-sm font-semibold transition-all border ${
                  level === opt.value
                    ? "bg-white text-gray-900 border-white shadow-lg"
                    : "bg-white/10 text-white border-white/20 hover:bg-white/20"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-2xl mx-auto">
            {STATS.map((s) => (
              <div key={s.label} className="bg-white/10 rounded-xl py-3 px-2 backdrop-blur-sm border border-white/20">
                <div className="text-2xl font-black text-white">{s.value}</div>
                <div className="text-white/70 text-xs mt-0.5">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── Body ── */}
      <div className="max-w-7xl mx-auto px-4 py-8" ref={topRef}>
        <section className="mb-8 rounded-3xl border border-blue-200 bg-gradient-to-r from-blue-50 via-sky-50 to-cyan-50 p-5 sm:p-7 shadow-sm">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900">Find officials for your address or postal code</h2>
              <p className="text-sm text-slate-600 mt-1">Enter postal code (e.g. M4C 1B2) or your address...</p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1 rounded-full border border-blue-200 bg-white text-blue-700">
              <LocateFixed className="w-3.5 h-3.5" /> Location Lookup
            </span>
          </div>

          <div className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="relative flex-1">
              <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4.5 h-4.5 text-slate-400" />
              <input
                type="search"
                value={locationInput}
                onChange={(e) => handleLocationInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    setShowSuggestions(false);
                    void findMyOfficials();
                  } else if (e.key === "Escape") {
                    setShowSuggestions(false);
                  }
                }}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
                placeholder="Enter postal code (e.g. M4C 1B2) or your address..."
                className="w-full rounded-xl border border-blue-200 bg-white pl-11 pr-4 py-3.5 text-slate-900 shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-300"
                aria-label="Find officials for your address or postal code"
                autoComplete="off"
              />
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-30 left-0 right-0 top-full mt-1 bg-white rounded-xl border border-slate-200 shadow-lg overflow-hidden">
                  {suggestions.map((s, i) => (
                    <button
                      key={`${s}-${i}`}
                      type="button"
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setLocationInput(s);
                        setShowSuggestions(false);
                        void findMyOfficials(s);
                      }}
                      className="w-full text-left px-4 py-2.5 text-sm text-slate-700 hover:bg-blue-50 flex items-start gap-2 border-b border-slate-100 last:border-b-0"
                    >
                      <MapPin className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
                      <span className="truncate">{s}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button
              onClick={() => void findMyOfficials()}
              disabled={locationLoading}
              className="rounded-xl px-6 py-3.5 text-white font-semibold shadow-sm hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: BRAND_COLOUR }}
            >
              {locationLoading ? "Finding..." : "Find My Officials"}
            </button>
          </div>

          {!hasLocationSearch && (
            <div className="mt-6 rounded-2xl border border-dashed border-blue-300 bg-white/70 p-6 text-center">
              <MapPin className="w-11 h-11 text-blue-500 mx-auto mb-3" />
              <p className="text-lg font-bold text-slate-800">Your Officials</p>
              <p className="text-sm text-slate-600 mt-1">Enter your postal code above to find your MP, MPP, Mayor and Ward Councillor</p>
              <button
                onClick={() => {
                  const sample = "M4C 1B2";
                  setLocationInput(sample);
                  void findMyOfficials(sample);
                }}
                className="mt-4 inline-flex items-center rounded-full border border-blue-300 bg-blue-100 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-200"
              >
                Try M4C 1B2
              </button>
            </div>
          )}

          {hasLocationSearch && (
            <div className="mt-6 space-y-4">
              <h3 className="text-lg font-extrabold text-slate-900">Your Representatives</h3>

              {locationError && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  {locationError}
                </div>
              )}

              {!locationError && yourRepresentatives.length === 0 && (
                <div className="rounded-xl border border-slate-200 bg-white px-4 py-8 text-center text-slate-600">
                  No matching representatives were found for this location yet.
                </div>
              )}

              {yourRepresentatives.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {yourRepresentatives.map((official) => {
                    const label = getRepresentativeLabel(official);
                    const colour = getPartyColour(official.partyName, official.party);
                    return (
                      <div key={`rep-${official.id}`} className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <div className="px-4 py-2.5 text-white text-sm font-bold" style={{ backgroundColor: colour }}>
                          This is your {label}
                        </div>
                        <div className="p-4 flex gap-4 items-start">
                          <div className="relative w-16 h-16 rounded-full overflow-hidden bg-slate-100 border border-slate-200 shrink-0">
                            {official.photoUrl ? (
                              <Image
                                src={official.photoUrl}
                                alt={official.name}
                                width={64}
                                height={64}
                                className="w-full h-full object-cover"
                                unoptimized={official.photoUrl.startsWith("http")}
                                loading="lazy"
                              />
                            ) : (
                              <div className="w-full h-full grid place-items-center text-slate-500 font-bold">
                                {official.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()}
                              </div>
                            )}
                          </div>
                          <div className="min-w-0">
                            <p className="font-extrabold text-slate-900 leading-tight">{official.name}</p>
                            <p className="text-sm text-slate-700 mt-0.5">{official.title || LEVEL_LABELS[official.level] || official.level}</p>
                            <p className="text-sm text-slate-500 mt-0.5">{official.district}</p>
                            {(official.partyName || official.party) && (
                              <span className="inline-block mt-2 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                                {official.partyName || official.party}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {locationMessage && !locationError && (
                <p className="text-xs text-slate-500">{locationMessage}</p>
              )}
            </div>
          )}
        </section>

        <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
          <div>
            <p className="text-gray-700 font-medium">
              {loading ? "Loading…" : `${total.toLocaleString()} officials`}
              {hasFilters && !loading && <span className="text-gray-400 ml-1">matching your filters</span>}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Province dropdown */}
            <select
              value={province}
              onChange={(e) => { setProvince(e.target.value); setPage(1); }}
              className="text-sm border border-gray-200 rounded-lg px-3 py-2 bg-white"
              aria-label="Filter by province"
            >
              <option value="">All Provinces</option>
              {filterOptions.provinces.map((p) => (
                <option key={p} value={p}>{p}</option>
              ))}
            </select>

            {/* Mobile filter button */}
            <button
              onClick={() => setShowFilterModal(true)}
              className="sm:hidden flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              <SlidersHorizontal className="w-4 h-4" /> Filters
            </button>

            {/* Clear filters */}
            {hasFilters && (
              <button
                onClick={clearFilters}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 px-3 py-2 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <X className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>
        </div>

        {/* Error state */}
        {error && (
          <div className="flex flex-col items-center py-16 text-center gap-4">
            <AlertCircle className="w-10 h-10 text-red-400" />
            <p className="text-gray-600 font-medium">{error}</p>
            <button
              onClick={fetchOfficials}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Loading state */}
        {loading && !error && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {Array.from({ length: 9 }).map((_, i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Officials grid */}
        {!loading && !error && officials.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {officials.map((official) => (
              <OfficialCard key={official.id} official={official} />
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && !error && officials.length === 0 && (
          <div className="flex flex-col items-center py-20 text-center gap-4">
            <Filter className="w-12 h-12 text-gray-300" />
            <p className="text-xl font-semibold text-gray-700">No officials found</p>
            <p className="text-gray-400 text-sm">Try adjusting your search or filters</p>
            <button
              onClick={clearFilters}
              className="px-6 py-2.5 bg-blue-600 text-white rounded-full text-sm font-semibold hover:bg-blue-700 transition-colors"
            >
              Clear All Filters
            </button>
          </div>
        )}

        {/* Pagination */}
        {!loading && pages > 1 && (
          <div className="flex items-center justify-center gap-3 mt-10">
            <button
              disabled={page <= 1}
              onClick={() => changePage(page - 1)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-sm text-gray-600 font-medium">
              Page {page} of {pages}
            </span>
            <button
              disabled={page >= pages}
              onClick={() => changePage(page + 1)}
              className="flex items-center gap-1.5 px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              aria-label="Next page"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Mobile Filter Modal */}
      {showFilterModal && (
        <div className="fixed inset-0 z-50 flex items-end sm:hidden">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowFilterModal(false)} />
          <div className="relative bg-white rounded-t-2xl p-6 w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between mb-2">
              <h2 className="font-bold text-gray-900">Filters</h2>
              <button onClick={() => setShowFilterModal(false)} aria-label="Close filters">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Level</label>
              {["", "federal", "provincial", "municipal"].map((v) => (
                <button key={v} onClick={() => { setLevel(v); setPage(1); setShowFilterModal(false); }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm mb-1 ${level === v ? "bg-blue-50 text-blue-700 font-semibold" : "text-gray-700 hover:bg-gray-50"}`}>
                  {v === "" ? "All Officials" : LEVEL_LABELS[v] ?? v}
                </button>
              ))}
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 block">Province</label>
              <select value={province} onChange={(e) => { setProvince(e.target.value); setPage(1); setShowFilterModal(false); }}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                <option value="">All Provinces</option>
                {filterOptions.provinces.map((p) => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            {hasFilters && (
              <button onClick={() => { clearFilters(); setShowFilterModal(false); }}
                className="w-full py-2.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                Clear All Filters
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
