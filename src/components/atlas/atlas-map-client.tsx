"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MapGL, { Source, Layer, NavigationControl, ScaleControl, AttributionControl } from "react-map-gl/maplibre";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import type { FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification, CircleLayerSpecification, HeatmapLayerSpecification } from "maplibre-gl";
import type { FeatureCollection, Feature, Point } from "geojson";
import { motion, AnimatePresence } from "framer-motion";

const TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const AVG_VOTERS_PER_DOOR = 2.3;
const MINS_PER_HOUSE = 2.5;
const MINS_PER_APT_UNIT = 1.5;

const TURF_COLORS = [
  "#1D9E75", "#EF9F27", "#E24B4A", "#6366F1",
  "#8B5CF6", "#0EA5E9", "#10B981", "#F59E0B",
  "#EC4899", "#14B8A6",
];

const SUPPORT_COLORS: Record<string, string> = {
  strong_support: "#1D9E75", leaning_support: "#10B981", undecided: "#EF9F27",
  leaning_opposition: "#F97316", strong_opposition: "#E24B4A",
};
const SUPPORT_LABELS: Record<string, string> = {
  strong_support: "Strong Support", leaning_support: "Leaning Support", undecided: "Undecided",
  leaning_opposition: "Leaning Opposition", strong_opposition: "Strong Opposition", unknown: "Unknown",
};

// ─── config ──────────────────────────────────────────────────────────────────

export interface MunicipalityConfig {
  displayName: string;
  displayLocation: string;
  loadingText: string;
  dataAttribution: string;
  footerText: string;
  addressSourceKey: string;
  addressSourceLabel: string;
  initialView: { longitude: number; latitude: number; zoom: number };
  wardsApi: string;
  addressesApi: string;
  schoolWardsApi?: string;
  electionResultsApi?: string;
  features?: {
    commercialFilter?: boolean;
    canvassingModes?: boolean;
    timeEnforcement?: boolean;
    wardSearch?: boolean;
  };
}

// ─── types ───────────────────────────────────────────────────────────────────

type AddrProps = { address: string; civic: string; street: string; postalCode: string; city: string; unit: string; source?: string; supportLevel?: string; skipHouse?: boolean; visited?: boolean; visitCount?: number };

type StreetData = {
  name: string;
  doors: number;
  units: number;
  houses: number;
  buildings: number;
  buildingUnits: number;
  estMinutes: number;
  centroid: [number, number];
  features: Feature[];
  turfIndex: number;
};

type TurfData = {
  index: number;
  color: string;
  streets: StreetData[];
  doors: number;
  units: number;
  houses: number;
  buildings: number;
  buildingUnits: number;
  estHours: number;
  canvasserName: string;
};

type MapFeatureEvent = MapMouseEvent & {
  features?: Array<{ properties: Record<string, unknown>; layer: { id: string }; geometry: unknown }>;
};

type ContactOverlayEntry = { supportLevel: string; skipHouse: boolean; visitCount: number };
type ContactOverlayStats = { totalContacts: number; doorsWithData: number; doorsVisited: number; supporters: number };

type ElectionCandidate = { name: string; votes: number; totalVotes: number; pct: number; won: boolean; incumbent: boolean; acclaimed: boolean };
type ElectionRace = { office: string; candidates: ElectionCandidate[]; winner: string | null; winnerPct: number | null; margin: number | null; acclaimed: boolean; totalVotes: number };
type ElectionYearData = { electionDate: string; electors: number; voted: number; turnoutPct: number; races: ElectionRace[] };
type ElectionData = { municipality: string; availableYears: string[]; years: Record<string, ElectionYearData> };

type ViewMode = "dots" | "heatmap" | "support" | "dnk";
type AvailableMode = { key: ViewMode; label: string; available: boolean; count?: number };

type SignsOverlayData = FeatureCollection<Point> & {
  stats: { total: number; installed: number; requested: number; opponent: number };
};
type PollingOverlayData = FeatureCollection<Point> & {
  allStations: Array<{ id: string; stationNumber: string; name: string; address: string; hasPinDrop: boolean }>;
  stats: { total: number; withCoordinates: number; withoutCoordinates: number; accessible: number };
};

// ─── helpers ─────────────────────────────────────────────────────────────────

function computeBbox(fc: FeatureCollection): [[number, number], [number, number]] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  function walk(c: unknown): void {
    if (!Array.isArray(c)) return;
    if (typeof c[0] === "number" && typeof c[1] === "number") {
      const [lng, lat] = c as [number, number];
      if (lng < minLng) minLng = lng; if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng; if (lat > maxLat) maxLat = lat;
    } else { (c as unknown[]).forEach(walk); }
  }
  for (const f of fc.features) { const g = (f as Feature).geometry; if (g && "coordinates" in g) walk(g.coordinates); }
  if (!isFinite(minLng)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

function getProp(p: Record<string, unknown> | null | undefined, k: string): string {
  return p ? String(p[k] ?? "") : "";
}

function wardBboxParams(feature: Feature): URLSearchParams | null {
  const fc: FeatureCollection = { type: "FeatureCollection", features: [feature] };
  const bbox = computeBbox(fc);
  if (!bbox) return null;
  const [[west, south], [east, north]] = bbox;
  const pad = 0.002;
  return new URLSearchParams({
    south: (south - pad).toFixed(6), west: (west - pad).toFixed(6),
    north: (north + pad).toFixed(6), east: (east + pad).toFixed(6),
  });
}

function isLikelyCommercial(props: Record<string, unknown>): boolean {
  const unit = String(props.unit ?? "");
  if (unit.length > 0) return false;
  const civic = String(props.civic ?? "");
  const civicNum = parseInt(civic, 10);
  if (!isNaN(civicNum) && civicNum > 0) {
    if (civicNum > 9000) return true;
    if (civicNum % 100 === 0) return true;
  }
  const address = String(props.address ?? "").toUpperCase();
  const commercialRx = /\b(UNIT\s+\d|SUITE\s+\d|BAY\s+\d|PLAZA|MALL|CENTRE|CENTER|INDUSTRIAL|COMMERCE)\b/;
  return commercialRx.test(address);
}

function parseStreets(fc: FeatureCollection): StreetData[] {
  const map = new Map<string, Feature[]>();
  for (const f of fc.features) {
    const key = String((f.properties as Record<string, unknown>)?.street || "Unknown Street");
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(f);
  }

  return Array.from(map.entries()).map(([name, features]) => {
    const civicMap = new Map<string, Feature[]>();
    for (const f of features) {
      const civic = String((f.properties as Record<string, unknown>)?.civic || "?");
      if (!civicMap.has(civic)) civicMap.set(civic, []);
      civicMap.get(civic)!.push(f);
    }

    const buildings = Array.from(civicMap.values()).filter(v => v.length > 1);
    const singleDoors = Array.from(civicMap.values()).filter(v => v.length === 1);
    const buildingCount = buildings.length;
    const buildingUnits = buildings.reduce((s, v) => s + v.length, 0);
    const houseCount = singleDoors.length;
    const doors = civicMap.size;
    const units = features.length;
    const estMinutes = houseCount * MINS_PER_HOUSE + buildingUnits * MINS_PER_APT_UNIT;

    const coords = features.map(f => (f.geometry as Point).coordinates as [number, number]);
    const centroid: [number, number] = [
      coords.reduce((s, c) => s + c[0], 0) / coords.length,
      coords.reduce((s, c) => s + c[1], 0) / coords.length,
    ];

    return { name, doors, units, houses: houseCount, buildings: buildingCount, buildingUnits, estMinutes, centroid, features, turfIndex: -1 };
  }).sort((a, b) => a.name.localeCompare(b.name));
}

function cutTurfs(streets: StreetData[], n: number): TurfData[] {
  if (!streets.length || n <= 0) return [];
  const sorted = [...streets].sort((a, b) => a.centroid[0] - b.centroid[0]);
  const totalDoors = sorted.reduce((s, st) => s + st.doors, 0);
  const target = Math.ceil(totalDoors / n);
  const result: TurfData[] = [];
  let bucket: StreetData[] = [];
  let bucketDoors = 0;

  for (let i = 0; i < sorted.length; i++) {
    bucket.push(sorted[i]);
    bucketDoors += sorted[i].doors;
    const isLast = i === sorted.length - 1;
    if ((bucketDoors >= target && result.length < n - 1) || isLast) {
      const houses = bucket.reduce((s, st) => s + st.houses, 0);
      const buildings = bucket.reduce((s, st) => s + st.buildings, 0);
      const buildingUnits = bucket.reduce((s, st) => s + st.buildingUnits, 0);
      const units = bucket.reduce((s, st) => s + st.units, 0);
      const estMins = bucket.reduce((s, st) => s + st.estMinutes, 0);
      result.push({
        index: result.length,
        color: TURF_COLORS[result.length % TURF_COLORS.length],
        streets: bucket, doors: bucketDoors, units, houses, buildings, buildingUnits,
        estHours: Math.round(estMins / 60 * 10) / 10,
        canvasserName: "",
      });
      bucket = []; bucketDoors = 0;
    }
  }
  return result;
}

function enrichAddresses(fc: FeatureCollection, contacts: Record<string, ContactOverlayEntry>): FeatureCollection {
  return {
    type: "FeatureCollection",
    features: fc.features.map(f => {
      const p = f.properties as Record<string, unknown>;
      const key = `${String(p.civic ?? "")} ${String(p.street ?? "")}`.toLowerCase().trim();
      const entry = contacts[key];
      if (!entry) return f;
      return { ...f, properties: { ...p, supportLevel: entry.supportLevel, skipHouse: entry.skipHouse, visited: entry.visitCount > 0, visitCount: entry.visitCount } };
    }),
  };
}

function applyTurfColors(fc: FeatureCollection, turfs: TurfData[]): FeatureCollection {
  const streetTurf = new Map<string, number>();
  for (const t of turfs) for (const s of t.streets) streetTurf.set(s.name, t.index);
  return {
    type: "FeatureCollection",
    features: fc.features.map(f => {
      const street = String((f.properties as Record<string, unknown>)?.street || "");
      const ti = streetTurf.get(street) ?? -1;
      return { ...f, properties: { ...f.properties, turfIndex: ti, turfColor: ti >= 0 ? TURF_COLORS[ti % TURF_COLORS.length] : "#1D9E75" } };
    }),
  };
}

// ─── layer specs ─────────────────────────────────────────────────────────────

const wardFillLayer: Omit<FillLayerSpecification, "source"> = {
  id: "ward-fill", type: "fill",
  paint: { "fill-color": ["get", "wardFill"], "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.38, 0.14] },
};
const wardLineLayer: Omit<LineLayerSpecification, "source"> = {
  id: "ward-line", type: "line",
  paint: { "line-color": ["get", "wardStroke"], "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 3.5, 2], "line-opacity": 0.9 },
};
const wardSelectedFillLayer: Omit<FillLayerSpecification, "source"> = {
  id: "ward-selected-fill", type: "fill",
  paint: { "fill-color": ["get", "wardFill"], "fill-opacity": 0.22 },
};
const wardSelectedLineLayer: Omit<LineLayerSpecification, "source"> = {
  id: "ward-selected-line", type: "line",
  paint: { "line-color": ["get", "wardStroke"], "line-width": 4, "line-opacity": 1 },
};
const wardLabelLayer: Omit<SymbolLayerSpecification, "source"> = {
  id: "ward-label", type: "symbol",
  layout: { "text-field": ["get", "wardName"], "text-size": 13, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"], "text-anchor": "center", "text-max-width": 8 },
  paint: { "text-color": "#0A2342", "text-halo-color": "rgba(255,255,255,0.95)", "text-halo-width": 2.5 },
};
const schoolWardFillLayer: Omit<FillLayerSpecification, "source"> = {
  id: "school-ward-fill", type: "fill",
  paint: { "fill-color": ["get", "boardColor"], "fill-opacity": 0.07 },
};
const schoolWardLineLayer: Omit<LineLayerSpecification, "source"> = {
  id: "school-ward-line", type: "line",
  paint: { "line-color": ["get", "boardColor"], "line-width": 2, "line-dasharray": [4, 2], "line-opacity": 0.85 },
};
const addrClusterLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "addr-clusters", type: "circle", filter: ["has", "point_count"],
  paint: {
    "circle-color": ["step", ["get", "point_count"], "#1D9E75", 25, "#EF9F27", 100, "#E24B4A"],
    "circle-radius": ["step", ["get", "point_count"], 18, 25, 24, 100, 32],
    "circle-opacity": 0.9, "circle-stroke-width": 2, "circle-stroke-color": "rgba(255,255,255,0.35)",
  },
};
const addrClusterCountLayer: Omit<SymbolLayerSpecification, "source"> = {
  id: "addr-cluster-count", type: "symbol", filter: ["has", "point_count"],
  layout: { "text-field": "{point_count_abbreviated}", "text-size": 12, "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"] },
  paint: { "text-color": "#ffffff" },
};
const addrPointLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "addr-point", type: "circle", filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["case",
      ["boolean", ["get", "skipHouse"], false], "#6B7280",
      ["==", ["get", "supportLevel"], "strong_support"], "#1D9E75",
      ["==", ["get", "supportLevel"], "leaning_support"], "#10B981",
      ["==", ["get", "supportLevel"], "undecided"], "#EF9F27",
      ["==", ["get", "supportLevel"], "leaning_opposition"], "#F97316",
      ["==", ["get", "supportLevel"], "strong_opposition"], "#E24B4A",
      ["coalesce", ["get", "turfColor"], "#1D9E75"],
    ],
    "circle-radius": ["case", ["boolean", ["get", "skipHouse"], false], 4, ["has", "supportLevel"], 6, 5],
    "circle-stroke-width": 1.5,
    "circle-stroke-color": ["case", ["boolean", ["get", "visited"], false], "#FFD700", "#fff"],
    "circle-opacity": ["case", ["boolean", ["get", "skipHouse"], false], 0.45, 0.92],
  },
};
const bgClusterLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "bg-clusters", type: "circle", filter: ["has", "point_count"],
  paint: { "circle-color": "rgba(100,160,220,0.28)", "circle-radius": ["step", ["get", "point_count"], 14, 50, 20, 200, 26], "circle-opacity": 0.8, "circle-stroke-width": 0 },
};
const bgPointLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "bg-point", type: "circle", filter: ["!", ["has", "point_count"]],
  paint: { "circle-color": "rgba(100,160,220,0.45)", "circle-radius": 4, "circle-stroke-width": 0, "circle-opacity": 0.7 },
};
const electionFillLayer: Omit<FillLayerSpecification, "source"> = {
  id: "election-fill", type: "fill",
  paint: { "fill-color": ["get", "electionFill"], "fill-opacity": ["get", "electionOpacity"] },
};
const electionLineLayer: Omit<LineLayerSpecification, "source"> = {
  id: "election-line", type: "line",
  paint: { "line-color": ["get", "electionStroke"], "line-width": 2.5, "line-opacity": 0.8, "line-dasharray": [5, 3] },
};
const dnkPointLayerSpec: Omit<CircleLayerSpecification, "source"> = {
  id: "addr-dnk", type: "circle", filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": ["case", ["boolean", ["get", "skipHouse"], false], "#E24B4A", "#1D9E75"],
    "circle-radius": ["case", ["boolean", ["get", "skipHouse"], false], 7, 4],
    "circle-opacity": ["case", ["boolean", ["get", "skipHouse"], false], 0.95, 0.18],
    "circle-stroke-width": ["case", ["boolean", ["get", "skipHouse"], false], 2, 0],
    "circle-stroke-color": "#fff",
  },
};
const heatmapLayerSpec: Omit<HeatmapLayerSpecification, "source"> = {
  id: "addr-heatmap", type: "heatmap",
  paint: {
    "heatmap-weight": 1,
    "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 8, 1, 15, 2.5],
    "heatmap-color": ["interpolate", ["linear"], ["heatmap-density"],
      0, "rgba(29,158,117,0)",
      0.2, "rgba(29,158,117,0.4)",
      0.5, "rgba(239,159,39,0.75)",
      0.8, "rgba(226,75,74,0.9)",
      1, "#E24B4A",
    ],
    "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 8, 14, 15, 28],
    "heatmap-opacity": 0.78,
  },
};
const signsLayerSpec: Omit<CircleLayerSpecification, "source"> = {
  id: "signs-layer", type: "circle",
  paint: {
    "circle-color": ["coalesce", ["get", "color"], "#EF9F27"],
    "circle-radius": 7,
    "circle-stroke-width": 2,
    "circle-stroke-color": "#fff",
    "circle-opacity": 0.92,
  },
};
const pollingLayerSpec: Omit<CircleLayerSpecification, "source"> = {
  id: "polling-layer", type: "circle",
  paint: {
    "circle-color": "#0A2342",
    "circle-radius": 8,
    "circle-stroke-width": 2.5,
    "circle-stroke-color": "#EF9F27",
    "circle-opacity": 0.95,
  },
};

// ─── election helpers ────────────────────────────────────────────────────────

function turnoutFill(pct: number): { fill: string; opacity: number; stroke: string } {
  if (pct >= 35) return { fill: "#1D9E75", opacity: 0.38, stroke: "#1D9E75" };
  if (pct >= 25) return { fill: "#1D9E75", opacity: 0.22, stroke: "#1D9E75" };
  if (pct >= 18) return { fill: "#EF9F27", opacity: 0.32, stroke: "#EF9F27" };
  return { fill: "#E24B4A", opacity: 0.35, stroke: "#E24B4A" };
}

function buildElectionWards(wards: FeatureCollection, turnoutPct: number): FeatureCollection {
  const { fill, opacity, stroke } = turnoutFill(turnoutPct);
  return {
    type: "FeatureCollection",
    features: wards.features.map(f => ({
      ...f,
      properties: { ...(f.properties as Record<string, unknown>), electionFill: fill, electionOpacity: opacity, electionStroke: stroke },
    })),
  };
}

// ─── glass ───────────────────────────────────────────────────────────────────

const G: React.CSSProperties = {
  background: "rgba(8, 28, 54, 0.82)",
  backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)",
  border: "1px solid rgba(255,255,255,0.12)",
  borderRadius: "16px", boxShadow: "0 8px 40px rgba(0,0,0,0.5)",
};
const GL: React.CSSProperties = {
  background: "rgba(8, 28, 54, 0.65)",
  backdropFilter: "blur(16px)", WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.09)",
  borderRadius: "12px", boxShadow: "0 4px 20px rgba(0,0,0,0.35)",
};

const labelStyle: React.CSSProperties = { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" };
const val: React.CSSProperties = { color: "#fff", fontSize: 24, fontWeight: 800, lineHeight: 1.1 };
const subval: React.CSSProperties = { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 500 };

// ─── sub-components ───────────────────────────────────────────────────────────

function StatBox({ label: l, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", flex: 1 }}>
      <div style={labelStyle}>{l}</div>
      <div style={{ ...val, color: color ?? "#fff", fontSize: 22 }}>{value}</div>
      {sub && <div style={{ ...subval, fontSize: 11, marginTop: 2 }}>{sub}</div>}
    </div>
  );
}

function BuildingRow({ icon, text, count, pct }: { icon: string; text: string; count: number; pct: number }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0" }}>
      <span style={{ fontSize: 14, width: 20 }}>{icon}</span>
      <span style={{ ...subval, flex: 1 }}>{text}</span>
      <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>{count.toLocaleString()}</span>
      <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11, width: 36, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

function ViewModePill({ modes, active, onChange }: { modes: AvailableMode[]; active: ViewMode; onChange: (m: ViewMode) => void }) {
  const visible = modes.filter(m => m.available);
  if (visible.length < 2) return null;
  return (
    <div style={{ display: "flex", gap: 3, background: "rgba(255,255,255,0.06)", borderRadius: 20, padding: 3, marginBottom: 10 }}>
      {visible.map(m => (
        <button key={m.key} onClick={() => onChange(m.key)}
          style={{
            flex: 1, padding: "4px 7px", borderRadius: 16, border: "none",
            background: active === m.key ? "rgba(29,158,117,0.3)" : "transparent",
            color: active === m.key ? "#1D9E75" : "rgba(255,255,255,0.45)",
            fontSize: 10, fontWeight: active === m.key ? 700 : 500,
            cursor: "pointer", whiteSpace: "nowrap", letterSpacing: "0.04em",
          }}
        >
          {m.label}{m.count !== undefined ? ` (${m.count})` : ""}
        </button>
      ))}
    </div>
  );
}

function LayerToggle({ label, enabled, loading, count, onToggle }: { label: string; enabled: boolean; loading: boolean; count?: number; onToggle: () => void }) {
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "7px 0" }}>
      <div>
        <span style={{ color: enabled ? "#fff" : "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: enabled ? 600 : 400 }}>{label}</span>
        {count !== undefined && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginLeft: 6 }}>{count} pins</span>}
        {loading && <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10, marginLeft: 6 }}>Loading…</span>}
      </div>
      <button onClick={onToggle}
        style={{ position: "relative", width: 36, height: 20, borderRadius: 10, border: "none", background: enabled ? "#1D9E75" : "rgba(255,255,255,0.12)", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}>
        <span style={{ position: "absolute", top: 2, left: enabled ? 18 : 2, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s", display: "block" }} />
      </button>
    </div>
  );
}

// ─── component ───────────────────────────────────────────────────────────────

export default function AtlasMapClient({ config }: { config: MunicipalityConfig }) {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Ward
  const [wards, setWards] = useState<FeatureCollection | null>(null);
  const [selectedWard, setSelectedWard] = useState<Feature | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [wardLoading, setWardLoading] = useState(true);
  const [wardError, setWardError] = useState<string | null>(null);

  // Addresses
  const [addresses, setAddresses] = useState<FeatureCollection | null>(null);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddrProps | null>(null);

  // Streets + turfs
  const [streets, setStreets] = useState<StreetData[]>([]);
  const [turfs, setTurfs] = useState<TurfData[]>([]);
  const [canvasserCount, setCanvasserCount] = useState(4);
  const [showTurfPanel, setShowTurfPanel] = useState(false);
  const [displayAddresses, setDisplayAddresses] = useState<FeatureCollection | null>(null);
  const [allAddresses, setAllAddresses] = useState<FeatureCollection | null>(null);

  // Optional features
  const [wardSearch, setWardSearch] = useState("");
  const [includeCommercial, setIncludeCommercial] = useState(false);
  const [canvassingMode, setCanvassingMode] = useState<"persuasion" | "gotv">("persuasion");
  const [currentHour] = useState(() => new Date().getHours());
  const withinCanvassingHours = !config.features?.timeEnforcement || (currentHour >= 9 && currentHour < 21);

  // Optional: school wards (Toronto)
  const [schoolWards, setSchoolWards] = useState<FeatureCollection | null>(null);
  const [showSchoolWards, setShowSchoolWards] = useState(false);
  const [schoolWardsLoading, setSchoolWardsLoading] = useState(false);
  const [schoolWardsError, setSchoolWardsError] = useState<string | null>(null);

  // Campaign DB overlay (auth-gated — null = not logged in or no data)
  const [contactsOverlay, setContactsOverlay] = useState<{ contacts: Record<string, ContactOverlayEntry>; stats: ContactOverlayStats } | null>(null);
  const [overlayLoading, setOverlayLoading] = useState(false);

  // View mode + campaign layers
  const [viewMode, setViewMode] = useState<ViewMode>("dots");
  const [showSigns, setShowSigns] = useState(false);
  const [showPolling, setShowPolling] = useState(false);
  const [signsOverlay, setSignsOverlay] = useState<SignsOverlayData | null>(null);
  const [pollingOverlay, setPollingOverlay] = useState<PollingOverlayData | null>(null);
  const [signsLoading, setSignsLoading] = useState(false);
  const [pollingLoading, setPollingLoading] = useState(false);
  const [selectedSign, setSelectedSign] = useState<Record<string, unknown> | null>(null);
  const [selectedPolling, setSelectedPolling] = useState<Record<string, unknown> | null>(null);

  // Election results layer
  const [showElectionLayer, setShowElectionLayer] = useState(false);
  const [electionData, setElectionData] = useState<ElectionData | null>(null);
  const [electionLoading, setElectionLoading] = useState(false);
  const [electionError, setElectionError] = useState<string | null>(null);
  const [electionYear, setElectionYear] = useState("2022");

  // Fetch wards
  useEffect(() => {
    fetch(config.wardsApi)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FeatureCollection>; })
      .then(d => { setWards(d); setWardLoading(false); })
      .catch((e: Error) => { setWardError(e.message); setWardLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!mapLoaded || !wards || !mapRef.current) return;
    const bbox = computeBbox(wards);
    if (!bbox) return;
    try { mapRef.current.fitBounds(bbox, { padding: 60, duration: 1000, maxZoom: 13 }); } catch { /* ignore */ }
  }, [mapLoaded, wards]);

  // Preload all ward addresses concurrently — dim blue background layer shows houses everywhere on pan
  useEffect(() => {
    if (!wards) return;
    Promise.all(
      wards.features.map(f => {
        const params = wardBboxParams(f as Feature);
        if (!params) return Promise.resolve([] as Feature[]);
        return fetch(`${config.addressesApi}?${params.toString()}`)
          .then(r => r.ok ? (r.json() as Promise<FeatureCollection>) : { type: "FeatureCollection" as const, features: [] as Feature[] })
          .then(d => d.features ?? [])
          .catch(() => [] as Feature[]);
      })
    ).then(all => setAllAddresses({ type: "FeatureCollection", features: all.flat() }));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wards]);

  // Election layer toggle → fetch once per municipality
  useEffect(() => {
    if (!config.electionResultsApi || !showElectionLayer || electionData) return;
    setElectionLoading(true); setElectionError(null);
    fetch(config.electionResultsApi)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<ElectionData>; })
      .then(d => {
        setElectionData(d);
        if (d.availableYears?.length) setElectionYear(d.availableYears[0]);
        setElectionLoading(false);
      })
      .catch((e: Error) => { setElectionError(e.message); setElectionLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showElectionLayer, electionData]);

  // School ward toggle → fetch once
  useEffect(() => {
    if (!config.schoolWardsApi || !showSchoolWards || schoolWards) return;
    setSchoolWardsLoading(true); setSchoolWardsError(null);
    fetch(config.schoolWardsApi)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FeatureCollection>; })
      .then(d => { setSchoolWards(d); setSchoolWardsLoading(false); })
      .catch((e: Error) => { setSchoolWardsError(e.message); setSchoolWardsLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showSchoolWards, schoolWards]);

  // Ward change → fetch campaign contact overlay (auth-gated, 401 = silent no-op)
  useEffect(() => {
    setContactsOverlay(null);
    if (!selectedWard) return;
    const wardName = getProp(selectedWard.properties as Record<string, unknown>, "wardName");
    setOverlayLoading(true);
    fetch(`/api/atlas/contacts-overlay${wardName ? `?wardName=${encodeURIComponent(wardName)}` : ""}`)
      .then(r => { if (r.status === 401) return null; if (!r.ok) throw new Error(); return r.json(); })
      .then(d => { if (d) setContactsOverlay(d as { contacts: Record<string, ContactOverlayEntry>; stats: ContactOverlayStats }); })
      .catch(() => { /* anonymous users see base map */ })
      .finally(() => setOverlayLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard?.properties?.wardIndex]);

  // Ward change → reload addresses
  useEffect(() => {
    setAddresses(null); setStreets([]); setTurfs([]);
    setDisplayAddresses(null); setSelectedAddress(null); setShowTurfPanel(false);
    setSignsOverlay(null); setPollingOverlay(null); setShowSigns(false); setShowPolling(false);
    setSelectedSign(null); setSelectedPolling(null); setViewMode("dots");
    if (!selectedWard) return;

    const params = wardBboxParams(selectedWard);
    if (!params) return;
    setAddrLoading(true); setAddrError(null);
    fetch(`${config.addressesApi}?${params.toString()}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FeatureCollection>; })
      .then(d => { setAddresses(d); setAddrLoading(false); })
      .catch((e: Error) => { setAddrError(e.message); setAddrLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard?.properties?.wardIndex]);

  // Ward change → fetch signs overlay (auth-gated, 401 = silent no-op)
  useEffect(() => {
    setSignsOverlay(null);
    if (!selectedWard) return;
    const wardName = getProp(selectedWard.properties as Record<string, unknown>, "wardName");
    setSignsLoading(true);
    fetch(`/api/atlas/signs-overlay${wardName ? `?wardName=${encodeURIComponent(wardName)}` : ""}`)
      .then(r => { if (r.status === 401) return null; if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        if (d && (d as SignsOverlayData).features?.length > 0) {
          setSignsOverlay(d as SignsOverlayData);
          setShowSigns(true);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setSignsLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard?.properties?.wardIndex]);

  // Ward change → fetch polling stations overlay (auth-gated, 401 = silent no-op)
  useEffect(() => {
    setPollingOverlay(null);
    if (!selectedWard) return;
    const wardName = getProp(selectedWard.properties as Record<string, unknown>, "wardName");
    setPollingLoading(true);
    fetch(`/api/atlas/polling-stations${wardName ? `?wardName=${encodeURIComponent(wardName)}` : ""}`)
      .then(r => { if (r.status === 401) return null; if (!r.ok) throw new Error(); return r.json(); })
      .then(d => {
        if (d && (d as PollingOverlayData).features?.length > 0) {
          setPollingOverlay(d as PollingOverlayData);
          setShowPolling(true);
        }
      })
      .catch(() => { /* silent */ })
      .finally(() => setPollingLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard?.properties?.wardIndex]);

  // Addresses + commercial filter + campaign overlay → displayAddresses + streets
  useEffect(() => {
    if (!addresses) { setStreets([]); setTurfs([]); setDisplayAddresses(null); return; }
    const filtered: FeatureCollection =
      config.features?.commercialFilter && !includeCommercial
        ? { ...addresses, features: addresses.features.filter(f => !isLikelyCommercial(f.properties as Record<string, unknown>)) }
        : addresses;
    const enriched = contactsOverlay ? enrichAddresses(filtered, contactsOverlay.contacts) : filtered;
    setStreets(parseStreets(enriched));
    setTurfs([]);
    setDisplayAddresses(enriched);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [addresses, includeCommercial, contactsOverlay]);

  // Hover
  const handleMouseMove = useCallback((e: MapFeatureEvent) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const wf = e.features?.find(f => f.layer.id === "ward-fill");
    if (wf) {
      const id = wf.properties?.wardIndex as number;
      if (hoveredId !== null && hoveredId !== id) map.setFeatureState({ source: "wards", id: hoveredId }, { hover: false });
      map.setFeatureState({ source: "wards", id }, { hover: true });
      setHoveredId(id);
      map.getCanvas().style.cursor = "pointer";
    } else if (e.features?.some(f => ["addr-clusters", "addr-point", "addr-dnk", "signs-layer", "polling-layer"].includes(f.layer.id))) {
      map.getCanvas().style.cursor = "pointer";
    } else {
      if (hoveredId !== null) map.setFeatureState({ source: "wards", id: hoveredId }, { hover: false });
      setHoveredId(null); map.getCanvas().style.cursor = "";
    }
  }, [hoveredId]);

  const handleMouseLeave = useCallback(() => {
    if (!mapRef.current) return;
    if (hoveredId !== null) mapRef.current.getMap().setFeatureState({ source: "wards", id: hoveredId }, { hover: false });
    setHoveredId(null); mapRef.current.getMap().getCanvas().style.cursor = "";
  }, [hoveredId]);

  // Click
  const handleClick = useCallback((e: MapFeatureEvent) => {
    if (!mapRef.current) return;
    const cluster = e.features?.find(f => f.layer.id === "addr-clusters");
    if (cluster) {
      const map = mapRef.current.getMap();
      const id = cluster.properties.cluster_id as number;
      const coords = (cluster.geometry as unknown as { coordinates: [number, number] }).coordinates;
      const src = map.getSource("addresses") as { getClusterExpansionZoom: (id: number, cb: (e: Error | null, z: number) => void) => void } | undefined;
      if (src?.getClusterExpansionZoom) src.getClusterExpansionZoom(id, (err, zoom) => { if (!err) mapRef.current?.flyTo({ center: coords, zoom }); });
      else mapRef.current?.flyTo({ center: coords, zoom: (map.getZoom() ?? 11) + 2 });
      return;
    }
    const sf = e.features?.find(f => f.layer.id === "signs-layer");
    if (sf) { setSelectedSign(sf.properties as Record<string, unknown>); setSelectedAddress(null); setSelectedPolling(null); return; }
    const pf = e.features?.find(f => f.layer.id === "polling-layer");
    if (pf) { setSelectedPolling(pf.properties as Record<string, unknown>); setSelectedAddress(null); setSelectedSign(null); return; }
    const af = e.features?.find(f => ["addr-point", "addr-dnk"].includes(f.layer.id));
    if (af) { setSelectedAddress(af.properties as unknown as AddrProps); setSelectedSign(null); setSelectedPolling(null); return; }
    const wf = e.features?.find(f => f.layer.id === "ward-fill");
    if (wf) {
      const feat = wf as unknown as Feature;
      setSelectedWard(feat); setSelectedAddress(null); setSelectedSign(null); setSelectedPolling(null);
      const fc: FeatureCollection = { type: "FeatureCollection", features: [feat] };
      const bbox = computeBbox(fc);
      if (bbox) try { mapRef.current.fitBounds(bbox, { padding: 60, duration: 700, maxZoom: 14 }); } catch { /* ignore */ }
    } else {
      setSelectedWard(null); setSelectedAddress(null); setSelectedSign(null); setSelectedPolling(null);
    }
  }, []);

  const handleSidebarWardClick = useCallback((f: Feature) => {
    setSelectedWard(f); setSelectedAddress(null);
    const fc: FeatureCollection = { type: "FeatureCollection", features: [f] };
    const bbox = computeBbox(fc);
    if (bbox) try { mapRef.current?.fitBounds(bbox, { padding: 60, duration: 700, maxZoom: 14 }); } catch { /* ignore */ }
  }, []);

  const handleCutTurfs = useCallback(() => {
    if (!displayAddresses || streets.length === 0) return;
    const newTurfs = cutTurfs(streets, canvasserCount);
    setTurfs(newTurfs);
    setDisplayAddresses(applyTurfColors(displayAddresses, newTurfs));
  }, [displayAddresses, streets, canvasserCount]);

  const updateCanvasserName = useCallback((index: number, name: string) => {
    setTurfs(prev => prev.map(t => t.index === index ? { ...t, canvasserName: name } : t));
  }, []);

  const retryWards = useCallback(() => {
    setWardError(null); setWardLoading(true);
    fetch(config.wardsApi)
      .then(r => r.json() as Promise<FeatureCollection>)
      .then(setWards)
      .catch((e: Error) => setWardError(e.message))
      .finally(() => setWardLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Derived
  const wardCount = wards?.features.length ?? 0;
  const addrCount = displayAddresses?.features.length ?? 0;
  const voterEst = Math.round(addrCount * AVG_VOTERS_PER_DOOR);
  const selectedProps = selectedWard?.properties as Record<string, unknown> | null;
  const selectedFC: FeatureCollection | null = selectedWard ? { type: "FeatureCollection", features: [selectedWard] } : null;

  const totalHouses = streets.reduce((s, st) => s + st.houses, 0);
  const totalBuildings = streets.reduce((s, st) => s + st.buildings, 0);
  const totalBuildingUnits = streets.reduce((s, st) => s + st.buildingUnits, 0);
  const uniqueDoors = streets.reduce((s, st) => s + st.doors, 0);
  const litRec = Math.ceil(addrCount * 1.1);

  const canBeginCanvassing = addrCount > 0 && !addrLoading && withinCanvassingHours;
  const hasSupportData = !!(contactsOverlay && contactsOverlay.stats.totalContacts > 0);
  const hasDnkData = !!(contactsOverlay && Object.values(contactsOverlay.contacts).some(c => c.skipHouse));
  const availableModes: AvailableMode[] = [
    { key: "dots", label: "Dots", available: true },
    { key: "heatmap", label: "Heat", available: true },
    { key: "support", label: "Support", available: hasSupportData, count: hasSupportData ? contactsOverlay!.stats.supporters : undefined },
    { key: "dnk", label: "DNK", available: hasDnkData },
  ];
  const addrLayerId = viewMode === "dnk" ? "addr-dnk" : "addr-point";
  const interactiveLayers = [
    "ward-fill",
    ...(displayAddresses && viewMode !== "heatmap" ? ["addr-clusters", addrLayerId] : []),
    ...(showSigns && signsOverlay ? ["signs-layer"] : []),
    ...(showPolling && pollingOverlay ? ["polling-layer"] : []),
  ];

  // Election derived
  const activeElectionYear = electionData?.years[electionYear];
  const electionWards = showElectionLayer && wards && activeElectionYear
    ? buildElectionWards(wards, activeElectionYear.turnoutPct)
    : null;

  const filteredWards = config.features?.wardSearch
    ? (wards?.features.filter(f => {
        if (!wardSearch.trim()) return true;
        return getProp((f as Feature).properties as Record<string, unknown>, "wardName")
          .toLowerCase().includes(wardSearch.toLowerCase());
      }) ?? [])
    : (wards?.features ?? []);

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#050e1c" }}>

      {/* ── MAP ──────────────────────────────────────────────────────── */}
      <MapGL
        ref={mapRef}
        initialViewState={config.initialView}
        mapStyle={TILE_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false} reuseMaps
        onLoad={() => setMapLoaded(true)}
        interactiveLayerIds={interactiveLayers}
        onMouseMove={handleMouseMove as (e: MapMouseEvent) => void}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick as (e: MapMouseEvent) => void}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />
        <AttributionControl position="bottom-left" customAttribution="© OpenFreeMap © OpenStreetMap contributors" compact />

        {wards && (
          <Source id="wards" type="geojson" data={wards} promoteId="wardIndex">
            <Layer {...wardFillLayer} /><Layer {...wardLineLayer} /><Layer {...wardLabelLayer} />
          </Source>
        )}
        {selectedFC && (
          <Source id="ward-selected" type="geojson" data={selectedFC}>
            <Layer {...wardSelectedFillLayer} /><Layer {...wardSelectedLineLayer} />
          </Source>
        )}
        {allAddresses && (
          <Source id="addresses-bg" type="geojson" data={allAddresses} cluster clusterMaxZoom={14} clusterRadius={40}>
            <Layer {...bgClusterLayer} /><Layer {...bgPointLayer} />
          </Source>
        )}
        {displayAddresses && viewMode === "heatmap" ? (
          <Source id="addresses" type="geojson" data={displayAddresses}>
            <Layer {...heatmapLayerSpec} />
          </Source>
        ) : displayAddresses ? (
          <Source id="addresses" type="geojson" data={displayAddresses} cluster clusterMaxZoom={15} clusterRadius={45}>
            <Layer {...addrClusterLayer} /><Layer {...addrClusterCountLayer} />
            {viewMode === "dnk" ? <Layer {...dnkPointLayerSpec} /> : <Layer {...addrPointLayer} />}
          </Source>
        ) : null}
        {showSigns && signsOverlay && (
          <Source id="signs-overlay" type="geojson" data={signsOverlay}>
            <Layer {...signsLayerSpec} />
          </Source>
        )}
        {showPolling && pollingOverlay && (
          <Source id="polling-overlay" type="geojson" data={pollingOverlay}>
            <Layer {...pollingLayerSpec} />
          </Source>
        )}
        {config.schoolWardsApi && showSchoolWards && schoolWards && (
          <Source id="school-wards" type="geojson" data={schoolWards}>
            <Layer {...schoolWardFillLayer} /><Layer {...schoolWardLineLayer} />
          </Source>
        )}
        {electionWards && (
          <Source id="election-wards" type="geojson" data={electionWards}>
            <Layer {...electionFillLayer} /><Layer {...electionLineLayer} />
          </Source>
        )}
      </MapGL>

      {/* ── HEADER ───────────────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}
        style={{ ...G, position: "absolute", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 10, padding: "12px 24px" }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🏛️</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: "0.05em" }}>{config.displayName}</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Ward Boundaries · Campaign Operations</div>
          </div>
          {wardCount > 0 && (
            <span style={{ marginLeft: 8, background: "rgba(29,158,117,0.2)", border: "1px solid rgba(29,158,117,0.45)", color: "#1D9E75", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>
              {wardCount} WARDS
            </span>
          )}
          {config.schoolWardsApi && (
            <button
              onClick={() => setShowSchoolWards(v => !v)}
              style={{
                marginLeft: 10, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                border: `1px solid ${showSchoolWards ? "rgba(139,92,246,0.7)" : "rgba(255,255,255,0.15)"}`,
                background: showSchoolWards ? "rgba(139,92,246,0.2)" : "rgba(255,255,255,0.05)",
                color: showSchoolWards ? "#8B5CF6" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              {schoolWardsLoading ? "Loading…" : "🏫 School Wards"}
            </button>
          )}
          {config.electionResultsApi && (
            <button
              onClick={() => setShowElectionLayer(v => !v)}
              style={{
                marginLeft: 6, borderRadius: 20, padding: "3px 10px", fontSize: 11, fontWeight: 700,
                border: `1px solid ${showElectionLayer ? "rgba(239,159,39,0.7)" : "rgba(255,255,255,0.15)"}`,
                background: showElectionLayer ? "rgba(239,159,39,0.18)" : "rgba(255,255,255,0.05)",
                color: showElectionLayer ? "#EF9F27" : "rgba(255,255,255,0.5)",
                cursor: "pointer",
              }}
            >
              {electionLoading ? "Loading…" : "📊 Election History"}
            </button>
          )}
        </div>
      </motion.div>

      {schoolWardsError && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ ...GL, position: "absolute", top: 70, left: "50%", transform: "translateX(-50%)", zIndex: 12, padding: "8px 16px", fontSize: 11, color: "#E24B4A" }}
        >
          School ward data unavailable: {schoolWardsError}
        </motion.div>
      )}

      {/* ── LEFT SIDEBAR — ward directory ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15 }}
        style={{ ...G, position: "absolute", top: 80, left: 16, zIndex: 10, width: 220, maxHeight: "calc(100vh - 180px)", overflowY: "auto", padding: "14px 0" }}
      >
        <div style={{ padding: "0 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={labelStyle}>Ward Directory</div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginTop: 3 }}>{config.displayLocation}</div>
          {config.features?.wardSearch && (
            <input
              type="text"
              placeholder="Search wards…"
              value={wardSearch}
              onChange={e => setWardSearch(e.target.value)}
              style={{ width: "100%", marginTop: 8, background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "5px 9px", color: "#fff", fontSize: 11, outline: "none", boxSizing: "border-box" }}
            />
          )}
        </div>

        <div style={{ padding: "6px 0" }}>
          {wardLoading && <div style={{ padding: 16, color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center" }}>Loading wards…</div>}
          {wardError && <div style={{ padding: 12, color: "#E24B4A", fontSize: 11 }}>{wardError}</div>}
          {filteredWards.map((f, i) => {
            const p = (f as Feature).properties as Record<string, unknown>;
            const name = getProp(p, "wardName");
            const fill = getProp(p, "wardFill");
            const isSel = selectedWard?.properties?.wardIndex === p.wardIndex;
            return (
              <button key={i} onClick={() => handleSidebarWardClick(f as Feature)}
                style={{ display: "flex", alignItems: "center", gap: 9, width: "100%", padding: "8px 14px", background: isSel ? "rgba(255,255,255,0.07)" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ width: 9, height: 9, borderRadius: "50%", background: fill, flexShrink: 0, boxShadow: isSel ? `0 0 8px ${fill}` : "none" }} />
                <span style={{ color: isSel ? "#fff" : "rgba(255,255,255,0.7)", fontSize: 12, fontWeight: isSel ? 700 : 400, flex: 1 }}>{name}</span>
                {isSel && addrCount > 0 && (
                  <span style={{ color: fill, fontSize: 10, fontWeight: 700 }}>{addrCount.toLocaleString()}</span>
                )}
              </button>
            );
          })}
        </div>

        <div style={{ padding: "10px 14px 2px", borderTop: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, lineHeight: 1.6 }}>
            {selectedWard ? "Click another ward to switch." : "Click a ward to begin."}<br />
            {config.dataAttribution}
          </div>
        </div>
      </motion.div>

      {/* ── WARD OPS PANEL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedWard && selectedProps && !showTurfPanel && (
          <motion.div
            key={`ops-${getProp(selectedProps, "wardIndex")}`}
            initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 30 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            style={{ ...G, position: "absolute", bottom: 24, right: 16, zIndex: 10, width: 310, overflow: "hidden" }}
          >
            <div style={{ height: 4, background: getProp(selectedProps, "wardFill") }} />
            <div style={{ padding: "16px 18px" }}>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={labelStyle}>Selected Ward</div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 3 }}>{getProp(selectedProps, "wardName")}</div>
                </div>
                <button onClick={() => { setSelectedWard(null); setAddresses(null); }}
                  style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", borderRadius: 7, width: 26, height: 26, fontSize: 13 }}>✕</button>
              </div>

              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <StatBox label="Doors" value={addrLoading ? "…" : uniqueDoors.toLocaleString()} sub="unique approaches" />
                <StatBox label="Est. Voters" value={addrLoading ? "…" : voterEst.toLocaleString()} sub="@ 2.3 per door" color="#1D9E75" />
              </div>

              {addrCount > 0 && !addrLoading && (
                <>
                  <ViewModePill modes={availableModes} active={viewMode} onChange={m => setViewMode(m)} />
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                    <div style={{ ...labelStyle, marginBottom: 8 }}>Building Breakdown</div>
                    <BuildingRow icon="🏠" text="Single Family / Townhouse" count={totalHouses} pct={Math.round(totalHouses / uniqueDoors * 100)} />
                    <BuildingRow icon="🏢" text={`Buildings (${totalBuildingUnits.toLocaleString()} units)`} count={totalBuildings} pct={Math.round(totalBuildings / uniqueDoors * 100)} />
                    {(uniqueDoors - totalHouses - totalBuildings) > 0 && (
                      <BuildingRow icon="❓" text="Unknown type" count={uniqueDoors - totalHouses - totalBuildings} pct={Math.round((uniqueDoors - totalHouses - totalBuildings) / uniqueDoors * 100)} />
                    )}
                  </div>

                  {config.features?.commercialFilter && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "9px 12px", background: "rgba(255,255,255,0.04)", borderRadius: 10, marginBottom: 10 }}>
                      <div>
                        <div style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>Include commercial</div>
                        <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>Off = filters likely businesses</div>
                      </div>
                      <button
                        onClick={() => setIncludeCommercial(v => !v)}
                        style={{ position: "relative", width: 40, height: 22, borderRadius: 11, border: "none", background: includeCommercial ? "#1D9E75" : "rgba(255,255,255,0.12)", cursor: "pointer", transition: "background 0.2s", flexShrink: 0 }}
                      >
                        <span style={{ position: "absolute", top: 3, left: includeCommercial ? 21 : 3, width: 16, height: 16, borderRadius: "50%", background: "#fff", transition: "left 0.2s" }} />
                      </button>
                    </div>
                  )}

                  {contactsOverlay && contactsOverlay.stats.totalContacts > 0 && (
                    <div style={{ background: "rgba(29,158,117,0.07)", border: "1px solid rgba(29,158,117,0.18)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                      <div style={{ ...labelStyle, marginBottom: 8 }}>Campaign Data{overlayLoading ? " (refreshing…)" : ""}</div>
                      <div style={{ display: "flex", gap: 6, marginBottom: 6 }}>
                        <StatBox label="Contacts" value={contactsOverlay.stats.totalContacts.toLocaleString()} />
                        <StatBox label="Doors w/ Data" value={contactsOverlay.stats.doorsWithData.toLocaleString()} />
                      </div>
                      <div style={{ display: "flex", gap: 6 }}>
                        <StatBox label="Visited" value={contactsOverlay.stats.doorsVisited.toLocaleString()} />
                        <StatBox label="Supporters" value={contactsOverlay.stats.supporters.toLocaleString()} color="#1D9E75" />
                      </div>
                    </div>
                  )}

                  {(signsLoading || signsOverlay || pollingLoading || pollingOverlay) && (
                    <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "8px 12px", marginBottom: 10 }}>
                      <div style={{ ...labelStyle, marginBottom: 4 }}>Campaign Layers</div>
                      {(signsLoading || signsOverlay) && (
                        <LayerToggle label="Signs" enabled={showSigns} loading={signsLoading} count={signsOverlay?.stats.total} onToggle={() => setShowSigns(v => !v)} />
                      )}
                      {(pollingLoading || pollingOverlay) && (
                        <LayerToggle label="Polling Stations" enabled={showPolling} loading={pollingLoading} count={pollingOverlay?.stats.withCoordinates} onToggle={() => setShowPolling(v => !v)} />
                      )}
                    </div>
                  )}

                  <div style={{ background: "rgba(239,159,39,0.09)", border: "1px solid rgba(239,159,39,0.22)", borderRadius: 9, padding: "9px 12px", marginBottom: 12 }}>
                    <div style={{ color: "#EF9F27", fontSize: 12, fontWeight: 700 }}>📄 Literature: {litRec.toLocaleString()} pieces</div>
                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 2 }}>Includes 10% buffer · Adjust for multi-piece drops</div>
                  </div>
                </>
              )}

              {config.features?.timeEnforcement && !withinCanvassingHours && (
                <div style={{ background: "rgba(239,159,39,0.12)", border: "1px solid rgba(239,159,39,0.3)", borderRadius: 9, padding: "9px 12px", marginBottom: 10 }}>
                  <div style={{ color: "#EF9F27", fontSize: 12, fontWeight: 700 }}>⏰ Outside canvassing hours</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 }}>Ontario canvassing permitted 9am–9pm only.</div>
                </div>
              )}

              <button
                disabled={!canBeginCanvassing}
                onClick={() => setShowTurfPanel(true)}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
                  background: canBeginCanvassing ? "#1D9E75" : "rgba(255,255,255,0.06)",
                  color: canBeginCanvassing ? "#fff" : "rgba(255,255,255,0.25)",
                  fontSize: 14, fontWeight: 700, cursor: canBeginCanvassing ? "pointer" : "not-allowed",
                  letterSpacing: "0.03em",
                }}
              >
                {addrLoading ? "Loading addresses…"
                  : config.features?.timeEnforcement && !withinCanvassingHours ? "Canvassing hours: 9am–9pm"
                  : addrCount > 0 ? "🗺️ Begin Canvassing"
                  : "Select a ward to load doors"}
              </button>

              {addrError && <div style={{ marginTop: 8, color: "#E24B4A", fontSize: 11 }}>{addrError}</div>}
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.22)", fontSize: 10 }}>{config.footerText}</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── TURF CUTTING PANEL ───────────────────────────────────────── */}
      <AnimatePresence>
        {showTurfPanel && selectedProps && (
          <motion.div
            key="turf-panel"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            style={{ ...G, position: "absolute", top: 80, right: 16, bottom: 24, zIndex: 10, width: 340, display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div style={{ height: 4, background: getProp(selectedProps, "wardFill"), flexShrink: 0 }} />

            <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => setShowTurfPanel(false)}
                  style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
                  ← Back
                </button>
                <div style={labelStyle}>Turf Cutting</div>
                <button onClick={() => { setSelectedWard(null); setShowTurfPanel(false); setAddresses(null); }}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, marginTop: 8 }}>{getProp(selectedProps, "wardName")}</div>
              <div style={{ ...subval, marginTop: 2 }}>{uniqueDoors.toLocaleString()} doors · {streets.length} streets</div>

              {config.features?.canvassingModes && (
                <div style={{ display: "flex", gap: 6, marginTop: 10 }}>
                  {(["persuasion", "gotv"] as const).map(mode => (
                    <button
                      key={mode}
                      onClick={() => setCanvassingMode(mode)}
                      style={{ flex: 1, padding: "5px 8px", borderRadius: 7, border: `1px solid ${canvassingMode === mode ? "#1D9E75" : "rgba(255,255,255,0.12)"}`, background: canvassingMode === mode ? "rgba(29,158,117,0.2)" : "transparent", color: canvassingMode === mode ? "#1D9E75" : "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, cursor: "pointer", textTransform: "uppercase", letterSpacing: "0.08em" }}
                    >
                      {mode === "persuasion" ? "Persuasion" : "GOTV"}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <div style={{ ...labelStyle, marginBottom: 10 }}>How many canvassers?</div>
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <button onClick={() => setCanvasserCount(c => Math.max(1, c - 1))}
                  style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>−</button>
                <div style={{ flex: 1, textAlign: "center" }}>
                  <span style={{ color: "#fff", fontSize: 28, fontWeight: 800 }}>{canvasserCount}</span>
                  <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, marginTop: 1 }}>
                    ~{uniqueDoors > 0 ? Math.round(uniqueDoors / canvasserCount).toLocaleString() : 0} doors each
                  </div>
                </div>
                <button onClick={() => setCanvasserCount(c => Math.min(20, c + 1))}
                  style={{ width: 36, height: 36, borderRadius: 9, border: "1px solid rgba(255,255,255,0.12)", background: "rgba(255,255,255,0.06)", color: "#fff", fontSize: 18, cursor: "pointer", fontWeight: 700 }}>+</button>
              </div>

              <button onClick={handleCutTurfs}
                style={{ width: "100%", marginTop: 12, padding: "11px", borderRadius: 10, border: "none", background: "#1D9E75", color: "#fff", fontSize: 13, fontWeight: 700, cursor: "pointer", letterSpacing: "0.03em" }}>
                ✂️ Cut {canvasserCount} Turfs
              </button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
              {turfs.length === 0 ? (
                <div>
                  <div style={{ padding: "4px 18px 8px", ...labelStyle }}>Street Intelligence ({streets.length} streets)</div>
                  {streets.map((st, i) => (
                    <div key={i} style={{ padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{st.name}</span>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{st.doors} doors</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                        {st.houses > 0 && <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>🏠 {st.houses}</span>}
                        {st.buildings > 0 && <span style={{ color: "#EF9F27", fontSize: 10 }}>🏢 {st.buildings} bldg · {st.buildingUnits} units</span>}
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>~{Math.round(st.estMinutes)}min</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ padding: "4px 18px 8px", ...labelStyle }}>
                    {turfs.length} Turfs
                    {config.features?.canvassingModes ? ` — ${canvassingMode === "gotv" ? "GOTV Mode" : "Persuasion Mode"}` : " — Tap name to assign canvasser"}
                  </div>
                  {turfs.map((turf) => (
                    <div key={turf.index} style={{ margin: "6px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 12, overflow: "hidden", border: `1px solid ${turf.color}30` }}>
                      <div style={{ height: 3, background: turf.color }} />
                      <div style={{ padding: "10px 12px" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                            <span style={{ width: 10, height: 10, borderRadius: "50%", background: turf.color, display: "inline-block" }} />
                            <span style={{ color: "#fff", fontWeight: 700, fontSize: 13 }}>Turf {turf.index + 1}</span>
                          </div>
                          <div style={{ display: "flex", gap: 10 }}>
                            <span style={{ ...subval, fontSize: 11 }}>{turf.doors.toLocaleString()} doors</span>
                            <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>~{turf.estHours}h</span>
                          </div>
                        </div>

                        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.45)" }}>🏠 {turf.houses}</span>
                          {turf.buildings > 0 && <span style={{ fontSize: 10, color: "#EF9F27" }}>🏢 {turf.buildings} bldg ({turf.buildingUnits} units)</span>}
                          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)" }}>📄 {Math.ceil(turf.units * 1.1)}</span>
                        </div>

                        <input
                          type="text"
                          placeholder="Assign canvasser name…"
                          value={turf.canvasserName}
                          onChange={e => updateCanvasserName(turf.index, e.target.value)}
                          style={{ width: "100%", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, padding: "6px 10px", color: "#fff", fontSize: 12, outline: "none", boxSizing: "border-box" }}
                        />

                        <div style={{ marginTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)", paddingTop: 6 }}>
                          {turf.streets.slice(0, 4).map((st, i) => (
                            <div key={i} style={{ display: "flex", justifyContent: "space-between", padding: "2px 0" }}>
                              <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 10 }}>{st.name}</span>
                              <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>
                                {st.doors}d{st.buildings > 0 ? ` · 🏢${st.buildings}` : ""}
                              </span>
                            </div>
                          ))}
                          {turf.streets.length > 4 && (
                            <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, marginTop: 2 }}>+{turf.streets.length - 4} more streets</div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  <div style={{ padding: "10px 10px 4px" }}>
                    <button style={{ width: "100%", padding: "11px", borderRadius: 10, background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)", color: "#1D9E75", fontSize: 13, fontWeight: 700, cursor: "pointer" } as React.CSSProperties}>
                      📋 Generate Walk Lists
                    </button>
                    <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, textAlign: "center", marginTop: 6 }}>PDF + app export — next push</div>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADDRESS DETAIL ───────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedAddress && !showTurfPanel && (
          <motion.div
            key="addr"
            initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 10 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ ...GL, position: "absolute", bottom: addrCount > 0 ? 380 : 24, right: 16, zIndex: 11, width: 260, padding: "14px 16px" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#1D9E75", borderRadius: "12px 12px 0 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={labelStyle}>Address</div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginTop: 3 }}>{selectedAddress.address}</div>
                {selectedAddress.unit && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Unit {selectedAddress.unit}</div>}
              </div>
              <button onClick={() => setSelectedAddress(null)}
                style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", borderRadius: 6, width: 24, height: 24, fontSize: 12 }}>✕</button>
            </div>
            {selectedAddress.skipHouse && (
              <div style={{ background: "rgba(226,75,74,0.12)", border: "1px solid rgba(226,75,74,0.3)", borderRadius: 7, padding: "5px 9px", marginBottom: 8 }}>
                <span style={{ color: "#E24B4A", fontSize: 11, fontWeight: 700 }}>⚠️ Do Not Knock</span>
              </div>
            )}
            {selectedAddress.supportLevel && !selectedAddress.skipHouse && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 0" }}>
                <span style={{ ...subval, fontSize: 11 }}>Support Level</span>
                <span style={{ color: SUPPORT_COLORS[selectedAddress.supportLevel] ?? "#fff", fontSize: 12, fontWeight: 700 }}>
                  {SUPPORT_LABELS[selectedAddress.supportLevel] ?? selectedAddress.supportLevel}
                </span>
              </div>
            )}
            {selectedAddress.visited && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ ...subval, fontSize: 11 }}>Door Knocks</span>
                <span style={{ color: "#1D9E75", fontSize: 12, fontWeight: 600 }}>{selectedAddress.visitCount}</span>
              </div>
            )}
            {selectedAddress.postalCode && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ ...subval, fontSize: 11 }}>Postal Code</span>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{selectedAddress.postalCode}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ ...subval, fontSize: 11 }}>Source</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                {selectedAddress.source === config.addressSourceKey ? config.addressSourceLabel : "OpenStreetMap"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ELECTION RESULTS PANEL ──────────────────────────────────── */}
      <AnimatePresence>
        {showElectionLayer && !showTurfPanel && (
          <motion.div
            key="election-panel"
            initial={{ opacity: 0, x: 40 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 40 }}
            transition={{ type: "spring", stiffness: 280, damping: 28 }}
            style={{ ...G, position: "absolute", top: 80, right: 16, bottom: 24, zIndex: 10, width: 320, display: "flex", flexDirection: "column", overflow: "hidden" }}
          >
            <div style={{ height: 4, background: "#EF9F27", flexShrink: 0 }} />
            <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ ...labelStyle }}>Election History</div>
                <button onClick={() => setShowElectionLayer(false)}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, marginTop: 4 }}>{config.displayLocation}</div>
              <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 }}>Ontario Municipal Elections · Open Government Data</div>

              {electionLoading && (
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 12 }}>
                  <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(239,159,39,0.3)", borderTopColor: "#EF9F27", animation: "spin 0.8s linear infinite" }} />
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Loading election data…</div>
                  <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
                </div>
              )}
              {electionError && <div style={{ color: "#E24B4A", fontSize: 11, marginTop: 8 }}>Error: {electionError}</div>}

              {electionData && !electionLoading && (
                <div style={{ display: "flex", gap: 6, marginTop: 12 }}>
                  {electionData.availableYears.map(y => (
                    <button key={y} onClick={() => setElectionYear(y)}
                      style={{
                        flex: 1, padding: "5px 0", borderRadius: 7, border: `1px solid ${electionYear === y ? "#EF9F27" : "rgba(255,255,255,0.12)"}`,
                        background: electionYear === y ? "rgba(239,159,39,0.18)" : "transparent",
                        color: electionYear === y ? "#EF9F27" : "rgba(255,255,255,0.4)",
                        fontSize: 12, fontWeight: 700, cursor: "pointer",
                      }}
                    >{y}</button>
                  ))}
                </div>
              )}
            </div>

            {activeElectionYear && (
              <div style={{ flex: 1, overflowY: "auto" }}>
                {/* Turnout hero */}
                <div style={{ padding: "16px 18px", borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                    <div style={{
                      width: 68, height: 68, borderRadius: "50%", flexShrink: 0,
                      background: `conic-gradient(${turnoutFill(activeElectionYear.turnoutPct).fill} ${activeElectionYear.turnoutPct * 3.6}deg, rgba(255,255,255,0.06) 0deg)`,
                      display: "flex", alignItems: "center", justifyContent: "center",
                    }}>
                      <div style={{ width: 50, height: 50, borderRadius: "50%", background: "rgba(8,28,54,0.95)", display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column" }}>
                        <span style={{ color: "#EF9F27", fontSize: 14, fontWeight: 800, lineHeight: 1 }}>{activeElectionYear.turnoutPct}%</span>
                        <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 8, lineHeight: 1.2 }}>VOTED</span>
                      </div>
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ color: "#fff", fontSize: 18, fontWeight: 800 }}>
                        {activeElectionYear.voted.toLocaleString()}
                      </div>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 }}>
                        of {activeElectionYear.electors.toLocaleString()} eligible voters
                      </div>
                      {/* Year-over-year bars */}
                      {electionData && (
                        <div style={{ marginTop: 8 }}>
                          {electionData.availableYears.map(y => {
                            const yr = electionData.years[y];
                            if (!yr) return null;
                            const pct = yr.turnoutPct;
                            return (
                              <div key={y} style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 3 }}>
                                <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 9, width: 28 }}>{y}</span>
                                <div style={{ flex: 1, height: 5, background: "rgba(255,255,255,0.07)", borderRadius: 3 }}>
                                  <div style={{ width: `${Math.min(pct / 50 * 100, 100)}%`, height: "100%", background: y === electionYear ? "#EF9F27" : "rgba(255,255,255,0.22)", borderRadius: 3, transition: "width 0.4s" }} />
                                </div>
                                <span style={{ color: y === electionYear ? "#EF9F27" : "rgba(255,255,255,0.4)", fontSize: 9, width: 32, textAlign: "right" }}>{pct}%</span>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Race results */}
                <div style={{ padding: "10px 0" }}>
                  <div style={{ padding: "0 18px 8px", ...labelStyle }}>Results by Office</div>
                  {activeElectionYear.races.map((race, ri) => (
                    <div key={ri} style={{ padding: "10px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 6 }}>
                        {race.office}
                      </div>
                      {race.acclaimed && race.candidates[0] && (
                        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                          <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", flexShrink: 0 }} />
                          <span style={{ color: "#1D9E75", fontSize: 13, fontWeight: 700 }}>{race.candidates[0].name}</span>
                          <span style={{ background: "rgba(29,158,117,0.18)", border: "1px solid rgba(29,158,117,0.35)", color: "#1D9E75", fontSize: 9, fontWeight: 700, borderRadius: 10, padding: "1px 6px" }}>ACCLAIMED</span>
                        </div>
                      )}
                      {!race.acclaimed && race.candidates.slice(0, 4).map((c, ci) => (
                        <div key={ci} style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 5 }}>
                          <span style={{ width: 7, height: 7, borderRadius: "50%", background: c.won ? "#1D9E75" : "rgba(255,255,255,0.2)", flexShrink: 0 }} />
                          <div style={{ flex: 1 }}>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                              <span style={{ color: c.won ? "#fff" : "rgba(255,255,255,0.55)", fontSize: 12, fontWeight: c.won ? 700 : 400 }}>{c.name}</span>
                              <span style={{ color: c.won ? "#1D9E75" : "rgba(255,255,255,0.35)", fontSize: 11, fontWeight: c.won ? 700 : 400 }}>{c.pct}%</span>
                            </div>
                            {c.won && race.totalVotes > 0 && (
                              <div style={{ height: 3, background: "rgba(255,255,255,0.06)", borderRadius: 2, marginTop: 2 }}>
                                <div style={{ width: `${c.pct}%`, height: "100%", background: "#1D9E75", borderRadius: 2 }} />
                              </div>
                            )}
                            <div style={{ display: "flex", gap: 6, marginTop: 1 }}>
                              {c.votes > 0 && <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 10 }}>{c.votes.toLocaleString()} votes</span>}
                              {c.incumbent && <span style={{ color: "#EF9F27", fontSize: 9, fontWeight: 700 }}>INCUMBENT</span>}
                            </div>
                          </div>
                        </div>
                      ))}
                      {!race.acclaimed && race.candidates.length > 4 && (
                        <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 10, paddingLeft: 14 }}>+{race.candidates.length - 4} more candidates</div>
                      )}
                      {!race.acclaimed && race.margin !== null && (
                        <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, marginTop: 4 }}>
                          Margin: {race.margin > 0 ? `+${race.margin}` : race.margin}%
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                <div style={{ padding: "10px 18px 14px" }}>
                  <div style={{ background: "rgba(239,159,39,0.06)", border: "1px solid rgba(239,159,39,0.15)", borderRadius: 9, padding: "9px 12px" }}>
                    <div style={{ color: "#EF9F27", fontSize: 11, fontWeight: 700, marginBottom: 4 }}>📌 2026 Context</div>
                    <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, lineHeight: 1.5 }}>
                      In {electionYear}, {activeElectionYear.voted.toLocaleString()} people voted.
                      To win a council seat, a candidate typically needs {activeElectionYear.races.find(r => !r.office.toLowerCase().includes("mayor"))?.candidates.find(c => c.won) ? Math.round((activeElectionYear.races.find(r => !r.office.toLowerCase().includes("mayor"))?.candidates.find(c => c.won)?.votes ?? 0) * 0.85).toLocaleString() : "~2,000"}+ votes.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {!electionData && !electionLoading && !electionError && (
              <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
                <div style={{ textAlign: "center" }}>
                  <div style={{ fontSize: 28, marginBottom: 8 }}>📊</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Election data not yet seeded.</div>
                  <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 11, marginTop: 4 }}>Run: npx tsx scripts/seed-ontario-elections.ts</div>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADDRESS LOADING ───────────────────────────────────────────── */}
      <AnimatePresence>
        {addrLoading && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ ...GL, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 15, padding: "14px 22px", display: "flex", alignItems: "center", gap: 10, pointerEvents: "none" }}
          >
            <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(29,158,117,0.3)", borderTopColor: "#1D9E75", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12 }}>Loading {getProp(selectedProps, "wardName")} addresses…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── DYNAMIC LEGEND ───────────────────────────────────────────── */}
      <AnimatePresence>
        {(contactsOverlay && contactsOverlay.stats.totalContacts > 0) || (showSigns && signsOverlay) || (showPolling && pollingOverlay) ? (
          <motion.div
            key="legend"
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            style={{ ...GL, position: "absolute", bottom: 16, left: 248, zIndex: 10, padding: "8px 12px", display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", maxWidth: 640 }}
          >
            {contactsOverlay && contactsOverlay.stats.totalContacts > 0 && viewMode === "support" && (
              <>
                {Object.entries(SUPPORT_COLORS).map(([k, color]) => (
                  <div key={k} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, display: "inline-block" }} />
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>{SUPPORT_LABELS[k]}</span>
                  </div>
                ))}
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#1D9E75", border: "1.5px solid #FFD700", display: "inline-block" }} />
                  <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>Visited</span>
                </div>
              </>
            )}
            {contactsOverlay && contactsOverlay.stats.totalContacts > 0 && viewMode === "dnk" && (
              <>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#E24B4A", display: "inline-block" }} />
                  <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>Do Not Knock</span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#1D9E75", opacity: 0.25, display: "inline-block" }} />
                  <span style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>Other</span>
                </div>
              </>
            )}
            {showSigns && signsOverlay && (
              <>
                {[["installed","#1D9E75"],["requested","#EF9F27"],["approved","#6366F1"],["opponent","#E24B4A"]].map(([label, color]) => (
                  <div key={label} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 8, height: 8, borderRadius: "50%", background: color as string, display: "inline-block" }} />
                    <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>Sign {label}</span>
                  </div>
                ))}
              </>
            )}
            {showPolling && pollingOverlay && (
              <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: "#0A2342", border: "2px solid #EF9F27", display: "inline-block" }} />
                <span style={{ color: "rgba(255,255,255,0.55)", fontSize: 10 }}>Polling Station</span>
              </div>
            )}
          </motion.div>
        ) : null}
      </AnimatePresence>

      {/* ── SIGN DETAIL POPUP ────────────────────────────────────────── */}
      <AnimatePresence>
        {selectedSign && (
          <motion.div
            key="sign-detail"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ ...GL, position: "absolute", bottom: addrCount > 0 ? 390 : 24, right: 16, zIndex: 11, width: 240, padding: "14px 16px" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: selectedSign.isOpponent ? "#E24B4A" : "#EF9F27", borderRadius: "12px 12px 0 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={labelStyle}>{selectedSign.isOpponent ? "Opponent Sign" : "Campaign Sign"}</div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginTop: 3 }}>{String(selectedSign.address ?? "")}</div>
                {selectedSign.city && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>{String(selectedSign.city)}</div>}
              </div>
              <button onClick={() => setSelectedSign(null)}
                style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", borderRadius: 6, width: 24, height: 24, fontSize: 12 }}>✕</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ ...subval, fontSize: 11 }}>Status</span>
              <span style={{ color: "#fff", fontSize: 12, fontWeight: 600, textTransform: "capitalize" }}>{String(selectedSign.status ?? "")}</span>
            </div>
            {selectedSign.signType && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ ...subval, fontSize: 11 }}>Type</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{String(selectedSign.signType)}</span>
              </div>
            )}
            {selectedSign.quantity && Number(selectedSign.quantity) > 1 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ ...subval, fontSize: 11 }}>Quantity</span>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{String(selectedSign.quantity)}</span>
              </div>
            )}
            {selectedSign.notes && (
              <div style={{ marginTop: 6, padding: "6px 8px", background: "rgba(255,255,255,0.05)", borderRadius: 6, color: "rgba(255,255,255,0.55)", fontSize: 11 }}>
                {String(selectedSign.notes)}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── POLLING STATION DETAIL POPUP ─────────────────────────────── */}
      <AnimatePresence>
        {selectedPolling && (
          <motion.div
            key="polling-detail"
            initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 8 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ ...GL, position: "absolute", bottom: addrCount > 0 ? 390 : 24, right: 16, zIndex: 11, width: 240, padding: "14px 16px" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#EF9F27", borderRadius: "12px 12px 0 0" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
              <div>
                <div style={labelStyle}>Polling Station {String(selectedPolling.stationNumber ?? "")}</div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginTop: 3 }}>{String(selectedPolling.name ?? "")}</div>
              </div>
              <button onClick={() => setSelectedPolling(null)}
                style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", borderRadius: 6, width: 24, height: 24, fontSize: 12 }}>✕</button>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ ...subval, fontSize: 11 }}>Address</span>
              <span style={{ color: "#fff", fontSize: 11 }}>{String(selectedPolling.address ?? "")}</span>
            </div>
            {selectedPolling.wardName && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ ...subval, fontSize: 11 }}>Ward</span>
                <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11 }}>{String(selectedPolling.wardName)}</span>
              </div>
            )}
            {selectedPolling.electorCount && Number(selectedPolling.electorCount) > 0 && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ ...subval, fontSize: 11 }}>Electors</span>
                <span style={{ color: "#1D9E75", fontSize: 12, fontWeight: 700 }}>{Number(selectedPolling.electorCount).toLocaleString()}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ ...subval, fontSize: 11 }}>Accessible</span>
              <span style={{ color: selectedPolling.isAccessible ? "#1D9E75" : "#E24B4A", fontSize: 11, fontWeight: 600 }}>
                {selectedPolling.isAccessible ? "Yes" : "No"}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BRAND ────────────────────────────────────────────────────── */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }}
        style={{ ...GL, position: "absolute", bottom: 16, left: 16, zIndex: 10, padding: "7px 12px" }}
      >
        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, letterSpacing: "0.07em" }}>
          Powered by <span style={{ color: "#1D9E75", fontWeight: 700 }}>Poll City</span> · Ontario 2026
        </div>
      </motion.div>

      {/* ── WARD LOADING ─────────────────────────────────────────────── */}
      <AnimatePresence>
        {wardLoading && (
          <motion.div initial={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.4 }}
            style={{ position: "absolute", inset: 0, background: "rgba(5,14,28,0.8)", backdropFilter: "blur(10px)", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 14 }}
          >
            <div style={{ width: 44, height: 44, borderRadius: "50%", border: "3px solid rgba(29,158,117,0.18)", borderTopColor: "#1D9E75", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>{config.loadingText}</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── WARD ERROR ───────────────────────────────────────────────── */}
      <AnimatePresence>
        {wardError && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            style={{ ...G, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 20, padding: 28, maxWidth: 340, textAlign: "center" }}
          >
            <div style={{ fontSize: 28, marginBottom: 10 }}>⚠️</div>
            <div style={{ color: "#E24B4A", fontSize: 14, fontWeight: 700, marginBottom: 6 }}>Ward boundaries unavailable</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 12, lineHeight: 1.6 }}>{wardError}</div>
            <button onClick={retryWards}
              style={{ marginTop: 16, background: "#1D9E75", border: "none", color: "#fff", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
