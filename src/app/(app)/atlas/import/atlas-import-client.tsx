"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Layers, BarChart2, Users, MapPin, GitMerge,
  Upload, CheckCircle, AlertCircle, Clock, Search,
  Globe, Database, TrendingUp, ChevronRight, Download,
  Loader2, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { FeatureGuide } from "@/components/ui";

/* ── Types ──────────────────────────────────────────────────────────────── */

type SourceId = "boundaries" | "results" | "demographics" | "prelist" | "enrich";
type PrelistSource = "osm" | "mpac" | "statcan";

interface AddrRecord {
  id: string;
  civic: number;
  street: string;
  unit?: string;
  postalCode: string;
  pollDiv: string;
  daCode: string;
  lat: number;
  lng: number;
  households: number;
  daMedianIncome: number;
  daMedianAge: number;
  daLangPrimary: string;
}

interface PrelistResult {
  records: AddrRecord[];
  count: number;
  source: string;
  cached: boolean;
}

interface HistoryEntry {
  id: string;
  filename: string;
  type: "GeoJSON" | "Results CSV" | "Census CSV" | "Addr Pre-List" | "Voter Enrich";
  records: number;
  date: string;
  duration: string;
  status: "Success" | "Enriched" | "Partial" | "Error";
  detail?: string;
}

interface Props {
  campaignId: string;
}

/* ── Fake seed history (matches Figma) ───────────────────────────────────── */

const SEED_HISTORY: HistoryEntry[] = [
  { id: "1", filename: "fed_boundaries_2023_v2.geojson", type: "GeoJSON", records: 338, date: "2026-01-14", duration: "2m 14s", status: "Success" },
  { id: "2", filename: "election_2021_results_all_ridings.csv", type: "Results CSV", records: 338, date: "2026-01-10", duration: "45s", status: "Success" },
  { id: "3", filename: "election_2019_results.csv", type: "Results CSV", records: 338, date: "2026-01-10", duration: "41s", status: "Success" },
  { id: "4", filename: "census_profile_2021_fed.csv", type: "Census CSV", records: 291, date: "2026-01-08", duration: "1m 33s", status: "Partial", detail: "47 ridings missing census subdivision match" },
  { id: "5", filename: "election_2015_results.csv", type: "Results CSV", records: 338, date: "2026-01-07", duration: "39s", status: "Success" },
];

/* ── Source card definitions ─────────────────────────────────────────────── */

const SOURCES: Array<{
  id: SourceId;
  label: string;
  badge?: string;
  badgeColor?: string;
  icon: React.ComponentType<{ className?: string }>;
  sub: string;
  provider: string;
  isNew?: boolean;
}> = [
  { id: "boundaries", label: "Riding Boundaries", icon: Layers, badge: "GeoJSON / SHP", badgeColor: "bg-blue-900/60 text-blue-300", sub: "Elections Canada", provider: "Elections Canada" },
  { id: "results", label: "Election Results", icon: BarChart2, badge: "CSV", badgeColor: "bg-slate-700/80 text-slate-300", sub: "Elections Canada", provider: "Elections Canada" },
  { id: "demographics", label: "Census Demographics", icon: Users, badge: "CSV", badgeColor: "bg-slate-700/80 text-slate-300", sub: "Statistics Canada", provider: "Statistics Canada" },
  { id: "prelist", label: "Address Pre-List", icon: MapPin, badge: "AUTO-GENERATED", badgeColor: "bg-amber-800/60 text-amber-300", sub: "Free open data", provider: "OSM / Ontario / StatsCan", isNew: true },
  { id: "enrich", label: "Enrich & Merge", icon: GitMerge, badge: "ENRICH", badgeColor: "bg-purple-900/60 text-purple-300", sub: "Party / Municipal Clerk", provider: "CSV Upload" },
];

/* ── Status badge ────────────────────────────────────────────────────────── */

function StatusBadge({ status }: { status: HistoryEntry["status"] }) {
  const map: Record<HistoryEntry["status"], string> = {
    Success: "text-green-400",
    Enriched: "text-cyan-400",
    Partial: "text-amber-400",
    Error: "text-red-400",
  };
  const icons: Record<HistoryEntry["status"], React.ReactNode> = {
    Success: <CheckCircle className="w-3 h-3" />,
    Enriched: <TrendingUp className="w-3 h-3" />,
    Partial: <AlertCircle className="w-3 h-3" />,
    Error: <AlertCircle className="w-3 h-3" />,
  };
  return (
    <span className={cn("flex items-center gap-1 font-medium text-xs", map[status])}>
      {icons[status]} {status}
    </span>
  );
}

/* ── Type badge ──────────────────────────────────────────────────────────── */

function TypeBadge({ type }: { type: HistoryEntry["type"] }) {
  const map: Record<HistoryEntry["type"], string> = {
    "GeoJSON": "bg-blue-900/60 text-blue-300 border-blue-700/50",
    "Results CSV": "bg-slate-700/60 text-slate-300 border-slate-600/50",
    "Census CSV": "bg-teal-900/60 text-teal-300 border-teal-700/50",
    "Addr Pre-List": "bg-amber-900/60 text-amber-300 border-amber-700/50",
    "Voter Enrich": "bg-purple-900/60 text-purple-300 border-purple-700/50",
  };
  return (
    <span className={cn("text-xs px-2 py-0.5 rounded border font-medium", map[type])}>
      {type}
    </span>
  );
}

/* ── Address Pre-List panel ──────────────────────────────────────────────── */

function PrelistPanel({ campaignId, onSuccess }: { campaignId: string; onSuccess: (entry: HistoryEntry) => void }) {
  const [municipality, setMunicipality] = useState("Town of Whitby");
  const [source, setSource] = useState<PrelistSource>("osm");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PrelistResult | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced autocomplete
  useEffect(() => {
    const q = municipality.trim();
    if (q.length < 2) { setSuggestions([]); setShowDropdown(false); return; }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/address-prelist/autocomplete?q=${encodeURIComponent(q)}`);
        if (!res.ok) return;
        const data = (await res.json()) as { suggestions: string[] };
        setSuggestions(data.suggestions ?? []);
        setShowDropdown((data.suggestions ?? []).length > 0);
      } catch { /* silent */ }
    }, 400);
    return () => clearTimeout(timer);
  }, [municipality]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const sourceOptions: Array<{
    id: PrelistSource;
    label: string;
    sub: string;
    coverage: string;
    method: string;
    status: "live" | "needs-backend";
  }> = [
    {
      id: "mpac",
      label: "Ontario Open Data",
      sub: "Address Point dataset",
      coverage: "~5.2M addresses province-wide",
      method: "Batch CSV · no rate limit",
      status: "needs-backend",
    },
    {
      id: "osm",
      label: "OpenStreetMap",
      sub: "Nominatim / Overpass",
      coverage: "Global, urban Canada well-covered",
      method: "Live API · 1 req/sec (fair use)",
      status: "live",
    },
    {
      id: "statcan",
      label: "Statistics Canada",
      sub: "Dissemination Area files",
      coverage: "All 56,590 DAs in Canada",
      method: "Batch download",
      status: "needs-backend",
    },
  ];

  async function handleFetch() {
    if (!municipality.trim()) { toast.error("Enter a municipality name"); return; }
    setLoading(true);
    setResult(null);
    const t0 = Date.now();
    try {
      const res = await fetch("/api/address-prelist/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ municipality: municipality.trim(), source }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Unknown error" }));
        throw new Error((err as { error?: string }).error ?? "Request failed");
      }
      const data = (await res.json()) as PrelistResult;
      setResult(data);
      const durationMs = Date.now() - t0;
      const duration = durationMs > 60000
        ? `${Math.floor(durationMs / 60000)}m ${Math.round((durationMs % 60000) / 1000)}s`
        : `${Math.round(durationMs / 1000)}s`;
      const filename = `addr_${municipality.toLowerCase().replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.osm`;
      onSuccess({
        id: `prelist-${Date.now()}`,
        filename,
        type: "Addr Pre-List",
        records: data.count,
        date: new Date().toISOString().slice(0, 10),
        duration,
        status: "Success",
      });
      toast.success(`Loaded ${data.count.toLocaleString()} addresses${data.cached ? " (cached)" : ""}`);
    } catch (e: unknown) {
      toast.error((e instanceof Error ? e.message : "Failed to fetch addresses"));
    } finally {
      setLoading(false);
    }
  }

  function handleExport() {
    if (!result) return;
    const csv = [
      "id,civic,street,unit,postalCode,pollDiv,daCode,lat,lng,households,daMedianIncome,daMedianAge,daLangPrimary",
      ...result.records.map((r) =>
        [r.id, r.civic, `"${r.street}"`, r.unit ?? "", r.postalCode, r.pollDiv, r.daCode, r.lat, r.lng, r.households, r.daMedianIncome, r.daMedianAge, r.daLangPrimary].join(",")
      ),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `addr_${municipality.replace(/\s+/g, "_")}_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h2 className="text-sm font-semibold text-slate-200 uppercase tracking-widest mb-4">
          Step 1 — Configure Address Scope
        </h2>

        {/* Municipality */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">
            Municipality
          </label>
          <div className="relative" ref={dropdownRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500 z-10" />
            <input
              type="text"
              value={municipality}
              onChange={(e) => { setMunicipality(e.target.value); }}
              onFocus={() => { if (suggestions.length > 0) setShowDropdown(true); }}
              placeholder="Type a Canadian city or municipality…"
              className="w-full bg-[#0A1628] border border-slate-700 rounded-lg pl-10 pr-4 py-3 text-slate-200 text-sm placeholder:text-slate-500 focus:outline-none focus:border-cyan-500 focus:ring-1 focus:ring-cyan-500/30"
            />
            <AnimatePresence>
              {showDropdown && suggestions.length > 0 && (
                <motion.ul
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  transition={{ duration: 0.12 }}
                  className="absolute z-50 top-full left-0 right-0 mt-1 bg-[#0D1B2E] border border-slate-700 rounded-lg shadow-xl overflow-hidden"
                >
                  {suggestions.map((s) => (
                    <li key={s}>
                      <button
                        type="button"
                        onMouseDown={(e) => {
                          e.preventDefault();
                          setMunicipality(s);
                          setSuggestions([]);
                          setShowDropdown(false);
                        }}
                        className="w-full text-left px-4 py-2.5 text-sm text-slate-200 hover:bg-slate-700/60 flex items-center gap-2 transition-colors"
                      >
                        <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
                        {s}
                      </button>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>
          <p className="mt-1.5 text-xs text-slate-500">Suggestions from OpenStreetMap — select or type any Canadian city</p>
        </div>

        {/* Source options */}
        <div className="mb-5">
          <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
            Primary Address Source — All Free, No API Key Required
          </label>
          <div className="space-y-2">
            {sourceOptions.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSource(opt.id)}
                className={cn(
                  "w-full text-left rounded-lg border p-3 transition-all",
                  source === opt.id
                    ? "border-cyan-500 bg-cyan-950/30 ring-1 ring-cyan-500/20"
                    : "border-slate-700 bg-[#0A1628] hover:border-slate-600"
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2 min-w-0">
                    <div className={cn(
                      "w-2.5 h-2.5 rounded-full flex-shrink-0 mt-0.5",
                      source === opt.id ? "bg-cyan-400" : "bg-slate-600"
                    )} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-medium text-slate-200">{opt.label}</span>
                        <span className="text-xs text-slate-500">{opt.sub}</span>
                        {opt.status === "live" ? (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-green-900/60 text-green-400 font-medium">LIVE — works now</span>
                        ) : (
                          <span className="text-xs px-1.5 py-0.5 rounded bg-slate-700/60 text-slate-400 font-medium">needs backend</span>
                        )}
                        <span className="text-xs px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 font-medium">FREE</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-0.5">{opt.coverage} · Method: {opt.method}</p>
                      {opt.id === "osm" && source === "osm" && (
                        <p className="text-xs text-cyan-400 mt-1">
                          Type any Canadian city above — autocomplete + real Overpass API query (up to 2,000 addresses)
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </button>
            ))}
          </div>
          {source !== "osm" && (
            <p className="mt-2 text-xs text-amber-400/80">
              OSM uses a bounding-box query — FSA range not required · Up to 2,000 addresses per fetch · Canada-scoped
            </p>
          )}
        </div>

        {/* CTA */}
        <button
          onClick={handleFetch}
          disabled={loading}
          className={cn(
            "w-full py-3.5 rounded-lg font-semibold text-sm tracking-wide flex items-center justify-center gap-2 transition-all",
            loading
              ? "bg-slate-700 text-slate-400 cursor-not-allowed"
              : "bg-cyan-500 hover:bg-cyan-400 text-slate-950"
          )}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Fetching addresses…</>
          ) : (
            <><Globe className="w-4 h-4" /> Fetch Real Addresses from OpenStreetMap</>
          )}
        </button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="text-sm font-medium text-slate-200">
                  {result.count.toLocaleString()} addresses loaded
                  {result.cached && <span className="ml-2 text-xs text-slate-500">(cached)</span>}
                </span>
              </div>
              <button
                onClick={handleExport}
                className="flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Export CSV
              </button>
            </div>
            <div className="rounded-lg border border-slate-700 overflow-hidden">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-slate-800/60 border-b border-slate-700">
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Civic</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Street</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Postal</th>
                    <th className="text-left px-3 py-2 text-slate-400 font-medium">Poll Div</th>
                    <th className="text-right px-3 py-2 text-slate-400 font-medium">Lat / Lng</th>
                  </tr>
                </thead>
                <tbody>
                  {result.records.slice(0, 8).map((r) => (
                    <tr key={r.id} className="border-b border-slate-800 hover:bg-slate-800/30">
                      <td className="px-3 py-1.5 text-slate-300 font-mono">{r.civic}</td>
                      <td className="px-3 py-1.5 text-slate-300 max-w-[180px] truncate">{r.street}</td>
                      <td className="px-3 py-1.5 text-slate-400 font-mono">{r.postalCode || "—"}</td>
                      <td className="px-3 py-1.5 text-slate-400">{r.pollDiv}</td>
                      <td className="px-3 py-1.5 text-slate-500 font-mono text-right">
                        {r.lat.toFixed(4)}, {r.lng.toFixed(4)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {result.count > 8 && (
                <div className="px-3 py-2 text-xs text-slate-500 bg-slate-800/30 text-center">
                  + {(result.count - 8).toLocaleString()} more — export CSV to view all
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ── File drop panel (Riding Boundaries, Results, Demographics) ──────────── */

function FileDropPanel({ sourceId }: { sourceId: SourceId }) {
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const configs: Record<string, { requiredFields: string[]; label: string; accept: string; officialSource?: string; sampleUrl?: string }> = {
    boundaries: {
      label: "Drop GeoJSON / SHP file here",
      accept: ".geojson,.json,.shp,.zip",
      requiredFields: ["FED_NUM", "geometry (Polygon)", "FED_NAMEE / FED_NAMEF", "PRNAME"],
      officialSource: "Elections Canada",
      sampleUrl: "elections.ca/open-data",
    },
    results: {
      label: "Drop CSV file here",
      accept: ".csv",
      requiredFields: ["ELECTORAL_DISTRICT_NUMBER", "CANDIDATE_NAME", "VOTES_OBTAINED", "PARTY_NAME"],
      officialSource: "Elections Canada",
      sampleUrl: "elections.ca/open-data",
    },
    demographics: {
      label: "Drop Census CSV here",
      accept: ".csv",
      requiredFields: ["GEO_CODE", "GEO_LEVEL", "CHARACTERISTIC_ID", "C1_COUNT_TOTAL"],
      officialSource: "Statistics Canada",
      sampleUrl: "www12.statcan.gc.ca",
    },
    enrich: {
      label: "Drop voter file CSV here",
      accept: ".csv",
      requiredFields: ["first_name", "last_name", "address", "postal_code"],
      officialSource: "Party / Municipal Clerk",
    },
  };

  const cfg = configs[sourceId] ?? configs.boundaries;

  return (
    <div className="p-6 space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); toast.info("File upload backend coming soon"); }}
        onClick={() => inputRef.current?.click()}
        className={cn(
          "border-2 border-dashed rounded-xl p-12 flex flex-col items-center gap-4 cursor-pointer transition-all",
          dragging ? "border-cyan-500 bg-cyan-950/20" : "border-slate-700 hover:border-slate-600 bg-[#0A1628]"
        )}
      >
        <Upload className={cn("w-8 h-8", dragging ? "text-cyan-400" : "text-slate-500")} />
        <div className="text-center">
          <p className="text-slate-300 font-medium">{cfg.label}</p>
          <p className="text-slate-500 text-sm mt-1">or click to browse your computer</p>
        </div>
        <button className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-sm font-medium transition-colors">
          Choose File
        </button>
        <input ref={inputRef} type="file" accept={cfg.accept} className="hidden" onChange={() => toast.info("File upload backend coming soon")} />
      </div>

      {/* Required fields */}
      <div>
        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Required Fields</p>
        <div className="grid grid-cols-2 gap-2">
          {cfg.requiredFields.map((f) => (
            <div key={f} className="flex items-center gap-2 text-xs text-slate-300">
              <CheckCircle className="w-3 h-3 text-green-400 flex-shrink-0" />
              <code className="text-cyan-400">{f}</code>
            </div>
          ))}
        </div>
      </div>

      {cfg.officialSource && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-500">Official Source: <span className="text-slate-300">{cfg.officialSource}</span></span>
          {cfg.sampleUrl && (
            <span className="text-cyan-500/70 flex items-center gap-1">
              <Globe className="w-3 h-3" /> {cfg.sampleUrl}
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/* ── Main component ──────────────────────────────────────────────────────── */

export default function AtlasImportClient({ campaignId }: Props) {
  const [selected, setSelected] = useState<SourceId>("prelist");
  const [history, setHistory] = useState<HistoryEntry[]>(SEED_HISTORY);

  const handlePrelistSuccess = useCallback((entry: HistoryEntry) => {
    setHistory((prev) => [entry, ...prev]);
  }, []);

  const selectedSource = SOURCES.find((s) => s.id === selected)!;

  return (
    <div className="min-h-screen bg-[#060E1A] text-slate-100">
      <FeatureGuide
        featureKey="atlas-import"
        title="ATLAS Data Import Pipeline"
        description="This is where you load official election data — historical results, boundaries, census data — into your campaign's intelligence layer. You only need to do this once per election cycle."
        bullets={[
          "Import data from Elections Ontario, Statistics Canada, or your city clerk",
          "The system validates and geocodes every record automatically",
          "Once imported, your atlas maps and swing calculator update automatically",
        ]}
      />
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-800 flex items-center gap-3">
        <button className="text-slate-500 hover:text-slate-300 text-sm flex items-center gap-1 transition-colors">
          Atlas <ChevronRight className="w-3.5 h-3.5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-slate-100 tracking-tight">Data Import Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">CSV / GeoJSON ingestion · Address pre-list generation · Voter list enrichment</p>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Two-column layout */}
        <div className="grid grid-cols-[320px_1fr] gap-4">
          {/* Left: source cards */}
          <div className="space-y-2">
            {SOURCES.map((src) => {
              const Icon = src.icon;
              const isActive = selected === src.id;
              return (
                <button
                  key={src.id}
                  onClick={() => setSelected(src.id)}
                  className={cn(
                    "w-full text-left rounded-xl border p-3.5 transition-all",
                    isActive
                      ? "border-slate-600 bg-slate-800/70"
                      : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-800/40"
                  )}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={cn(
                        "p-1.5 rounded-lg flex-shrink-0 mt-0.5",
                        isActive ? "bg-slate-700" : "bg-slate-800"
                      )}>
                        <Icon className={cn("w-4 h-4", isActive ? "text-cyan-400" : "text-slate-400")} />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={cn("text-sm font-semibold", isActive ? "text-slate-100" : "text-slate-300")}>
                            {src.label}
                          </span>
                          {src.isNew && (
                            <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-900/60 text-cyan-400 font-bold border border-cyan-800/50">NEW</span>
                          )}
                        </div>
                        {src.badge && (
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold mt-1 inline-block", src.badgeColor)}>
                            {src.badge}
                          </span>
                        )}
                        <p className="text-xs text-slate-500 mt-0.5">{src.sub}</p>
                      </div>
                    </div>
                    {isActive && <ChevronRight className="w-4 h-4 text-slate-400 flex-shrink-0 mt-1" />}
                  </div>
                </button>
              );
            })}

            {/* Recent imports mini-list */}
            <div className="mt-4 pt-4 border-t border-slate-800">
              <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider px-1 mb-2">Recent Imports</p>
              <div className="space-y-1.5">
                {history.slice(0, 4).map((h) => (
                  <div key={h.id} className="flex items-center gap-2 px-1">
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full flex-shrink-0",
                      h.status === "Success" ? "bg-green-500" :
                      h.status === "Enriched" ? "bg-cyan-500" :
                      h.status === "Partial" ? "bg-amber-500" : "bg-red-500"
                    )} />
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 truncate">{h.filename}</p>
                      <p className="text-[10px] text-slate-600">{h.type} · {h.date}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right: detail panel */}
          <div className="rounded-xl border border-slate-800 bg-slate-900/40 min-h-[480px]">
            <div className="px-6 py-4 border-b border-slate-800 flex items-center gap-2">
              <selectedSource.icon className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold text-slate-200 text-sm">{selectedSource.label}</span>
              {selectedSource.badge && (
                <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-semibold", selectedSource.badgeColor)}>
                  {selectedSource.badge}
                </span>
              )}
            </div>
            <AnimatePresence mode="wait">
              <motion.div
                key={selected}
                initial={{ opacity: 0, x: 8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
              >
                {selected === "prelist" ? (
                  <PrelistPanel campaignId={campaignId} onSuccess={handlePrelistSuccess} />
                ) : (
                  <FileDropPanel sourceId={selected} />
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

        {/* Import History */}
        <div className="rounded-xl border border-slate-800 bg-slate-900/40 overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-slate-400" />
              <span className="font-semibold text-slate-200 text-sm">Import History</span>
              <span className="text-xs text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">
                {history.length} entries
              </span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500">
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500 inline-block" /> Success</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-cyan-500 inline-block" /> Enriched</span>
              <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500 inline-block" /> Partial</span>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left px-5 py-2.5 text-slate-400 font-medium">File</th>
                  <th className="text-left px-3 py-2.5 text-slate-400 font-medium">Type</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium">Records</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium">Date</th>
                  <th className="text-right px-3 py-2.5 text-slate-400 font-medium">Duration</th>
                  <th className="text-right px-5 py-2.5 text-slate-400 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {history.map((h) => (
                  <tr key={h.id} className="border-b border-slate-800/60 hover:bg-slate-800/20">
                    <td className="px-5 py-2.5">
                      <span className="text-slate-300 font-mono">{h.filename}</span>
                      {h.detail && <p className="text-slate-500 mt-0.5 font-sans">{h.detail}</p>}
                    </td>
                    <td className="px-3 py-2.5"><TypeBadge type={h.type} /></td>
                    <td className="px-3 py-2.5 text-right text-slate-300 font-mono">{h.records.toLocaleString()}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400">{h.date}</td>
                    <td className="px-3 py-2.5 text-right text-slate-400 font-mono">{h.duration}</td>
                    <td className="px-5 py-2.5 text-right"><StatusBadge status={h.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
