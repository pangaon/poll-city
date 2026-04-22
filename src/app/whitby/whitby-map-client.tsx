"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import MapGL, { Source, Layer, NavigationControl, ScaleControl, AttributionControl } from "react-map-gl/maplibre";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import type { FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification, CircleLayerSpecification } from "maplibre-gl";
import type { FeatureCollection, Feature, Point } from "geojson";
import { motion, AnimatePresence } from "framer-motion";

const TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const WHITBY_CENTER = { longitude: -78.959477, latitude: 43.942973, zoom: 11 };
const AVG_VOTERS_PER_DOOR = 2.3;
const MINS_PER_HOUSE = 2.5;
const MINS_PER_APT_UNIT = 1.5;

const TURF_COLORS = [
  "#1D9E75", "#EF9F27", "#E24B4A", "#6366F1",
  "#8B5CF6", "#0EA5E9", "#10B981", "#F59E0B",
  "#EC4899", "#14B8A6",
];

// ─── types ───────────────────────────────────────────────────────────────────

type AddrProps = { address: string; civic: string; street: string; postalCode: string; city: string; unit: string; source?: string };

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
    "circle-color": ["coalesce", ["get", "turfColor"], "#1D9E75"],
    "circle-radius": 5, "circle-stroke-width": 1.5, "circle-stroke-color": "#fff", "circle-opacity": 0.92,
  },
};

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

const label: React.CSSProperties = { color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: "0.13em", textTransform: "uppercase" };
const val: React.CSSProperties = { color: "#fff", fontSize: 24, fontWeight: 800, lineHeight: 1.1 };
const subval: React.CSSProperties = { color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 500 };

// ─── sub-components ───────────────────────────────────────────────────────────

function StatBox({ label: l, value, sub, color }: { label: string; value: string; sub?: string; color?: string }) {
  return (
    <div style={{ background: "rgba(255,255,255,0.05)", borderRadius: 10, padding: "12px 14px", flex: 1 }}>
      <div style={label}>{l}</div>
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

// ─── component ───────────────────────────────────────────────────────────────

export default function WhitbyMapClient() {
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

  // Phase 1: commercial filter, canvassing mode, time enforcement
  const [includeCommercial, setIncludeCommercial] = useState(false);
  const [canvassingMode, setCanvassingMode] = useState<"persuasion" | "gotv">("persuasion");
  const [currentHour] = useState(() => new Date().getHours());
  const withinCanvassingHours = currentHour >= 9 && currentHour < 21;

  // Fetch wards
  useEffect(() => {
    fetch("/api/atlas/whitby-wards")
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FeatureCollection>; })
      .then(d => { setWards(d); setWardLoading(false); })
      .catch((e: Error) => { setWardError(e.message); setWardLoading(false); });
  }, []);

  useEffect(() => {
    if (!mapLoaded || !wards || !mapRef.current) return;
    const bbox = computeBbox(wards);
    if (!bbox) return;
    try { mapRef.current.fitBounds(bbox, { padding: 60, duration: 1000, maxZoom: 13 }); } catch { /* ignore */ }
  }, [mapLoaded, wards]);

  // Ward change → reload addresses
  useEffect(() => {
    setAddresses(null); setStreets([]); setTurfs([]);
    setDisplayAddresses(null); setSelectedAddress(null); setShowTurfPanel(false);
    if (!selectedWard) return;

    const params = wardBboxParams(selectedWard);
    if (!params) return;
    setAddrLoading(true); setAddrError(null);
    fetch(`/api/atlas/whitby-addresses?${params.toString()}`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FeatureCollection>; })
      .then(d => { setAddresses(d); setAddrLoading(false); })
      .catch((e: Error) => { setAddrError(e.message); setAddrLoading(false); });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedWard?.properties?.wardIndex]);

  // Filter + parse streets when addresses or commercial toggle changes
  useEffect(() => {
    if (!addresses) { setStreets([]); setTurfs([]); setDisplayAddresses(null); return; }
    const filtered: FeatureCollection = includeCommercial
      ? addresses
      : { ...addresses, features: addresses.features.filter(f => !isLikelyCommercial(f.properties as Record<string, unknown>)) };
    setStreets(parseStreets(filtered));
    setTurfs([]);
    setDisplayAddresses(filtered);
  }, [addresses, includeCommercial]);

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
    } else if (e.features?.some(f => ["addr-clusters", "addr-point"].includes(f.layer.id))) {
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
    const af = e.features?.find(f => f.layer.id === "addr-point");
    if (af) { setSelectedAddress(af.properties as unknown as AddrProps); return; }
    const wf = e.features?.find(f => f.layer.id === "ward-fill");
    if (wf) {
      const feat = wf as unknown as Feature;
      setSelectedWard(feat); setSelectedAddress(null);
      const fc: FeatureCollection = { type: "FeatureCollection", features: [feat] };
      const bbox = computeBbox(fc);
      if (bbox) try { mapRef.current.fitBounds(bbox, { padding: 60, duration: 700, maxZoom: 14 }); } catch { /* ignore */ }
    } else {
      setSelectedWard(null); setSelectedAddress(null);
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

  const interactiveLayers = ["ward-fill", ...(displayAddresses ? ["addr-clusters", "addr-point"] : [])];

  return (
    <div style={{ position: "relative", width: "100%", height: "100vh", overflow: "hidden", background: "#050e1c" }}>

      {/* ── MAP ──────────────────────────────────────────────────────── */}
      <MapGL
        ref={mapRef}
        initialViewState={WHITBY_CENTER}
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
        {displayAddresses && (
          <Source id="addresses" type="geojson" data={displayAddresses} cluster clusterMaxZoom={15} clusterRadius={45}>
            <Layer {...addrClusterLayer} /><Layer {...addrClusterCountLayer} /><Layer {...addrPointLayer} />
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
            <div style={{ color: "#fff", fontWeight: 800, fontSize: 15, letterSpacing: "0.05em" }}>TOWN OF WHITBY</div>
            <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, letterSpacing: "0.1em", textTransform: "uppercase" }}>Ward Boundaries · Campaign Operations</div>
          </div>
          {wardCount > 0 && (
            <span style={{ marginLeft: 8, background: "rgba(29,158,117,0.2)", border: "1px solid rgba(29,158,117,0.45)", color: "#1D9E75", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "3px 10px" }}>
              {wardCount} WARDS
            </span>
          )}
        </div>
      </motion.div>

      {/* ── LEFT SIDEBAR — ward directory ────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -24 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.45, delay: 0.15 }}
        style={{ ...G, position: "absolute", top: 80, left: 16, zIndex: 10, width: 220, maxHeight: "calc(100vh - 180px)", overflowY: "auto", padding: "14px 0" }}
      >
        <div style={{ padding: "0 14px 10px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
          <div style={label}>Ward Directory</div>
          <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginTop: 3 }}>Whitby, Ontario</div>
        </div>

        <div style={{ padding: "6px 0" }}>
          {wardLoading && <div style={{ padding: 16, color: "rgba(255,255,255,0.35)", fontSize: 12, textAlign: "center" }}>Loading wards…</div>}
          {wardError && <div style={{ padding: 12, color: "#E24B4A", fontSize: 11 }}>{wardError}</div>}
          {wards?.features.map((f, i) => {
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
            Source: Whitby GeoHub (official)
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

              {/* Ward name */}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 14 }}>
                <div>
                  <div style={label}>Selected Ward</div>
                  <div style={{ color: "#fff", fontSize: 20, fontWeight: 800, marginTop: 3 }}>{getProp(selectedProps, "wardName")}</div>
                </div>
                <button onClick={() => { setSelectedWard(null); setAddresses(null); }}
                  style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.45)", cursor: "pointer", borderRadius: 7, width: 26, height: 26, fontSize: 13 }}>✕</button>
              </div>

              {/* Stats */}
              <div style={{ display: "flex", gap: 8, marginBottom: 12 }}>
                <StatBox label="Doors" value={addrLoading ? "…" : uniqueDoors.toLocaleString()} sub="unique approaches" />
                <StatBox label="Est. Voters" value={addrLoading ? "…" : voterEst.toLocaleString()} sub="@ 2.3 per door" color="#1D9E75" />
              </div>

              {/* Building breakdown */}
              {addrCount > 0 && !addrLoading && (
                <>
                  <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "10px 12px", marginBottom: 10 }}>
                    <div style={{ ...label, marginBottom: 8 }}>Building Breakdown</div>
                    <BuildingRow icon="🏠" text="Single Family / Townhouse" count={totalHouses} pct={Math.round(totalHouses / uniqueDoors * 100)} />
                    <BuildingRow icon="🏢" text={`Buildings (${totalBuildingUnits.toLocaleString()} units)`} count={totalBuildings} pct={Math.round(totalBuildings / uniqueDoors * 100)} />
                    {(uniqueDoors - totalHouses - totalBuildings) > 0 && (
                      <BuildingRow icon="❓" text="Unknown type" count={uniqueDoors - totalHouses - totalBuildings} pct={Math.round((uniqueDoors - totalHouses - totalBuildings) / uniqueDoors * 100)} />
                    )}
                  </div>

                  {/* Commercial toggle */}
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

                  {/* Literature recommendation */}
                  <div style={{ background: "rgba(239,159,39,0.09)", border: "1px solid rgba(239,159,39,0.22)", borderRadius: 9, padding: "9px 12px", marginBottom: 12 }}>
                    <div style={{ color: "#EF9F27", fontSize: 12, fontWeight: 700 }}>📄 Literature: {litRec.toLocaleString()} pieces</div>
                    <div style={{ color: "rgba(255,255,255,0.38)", fontSize: 11, marginTop: 2 }}>Includes 10% buffer · Adjust for multi-piece drops</div>
                  </div>
                </>
              )}

              {/* Time enforcement warning */}
              {!withinCanvassingHours && (
                <div style={{ background: "rgba(239,159,39,0.12)", border: "1px solid rgba(239,159,39,0.3)", borderRadius: 9, padding: "9px 12px", marginBottom: 10 }}>
                  <div style={{ color: "#EF9F27", fontSize: 12, fontWeight: 700 }}>⏰ Outside canvassing hours</div>
                  <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11, marginTop: 2 }}>Ontario canvassing permitted 9am–9pm only.</div>
                </div>
              )}

              {/* CTA */}
              <button
                disabled={addrCount === 0 || addrLoading || !withinCanvassingHours}
                onClick={() => setShowTurfPanel(true)}
                style={{
                  width: "100%", padding: "12px 16px", borderRadius: 10, border: "none",
                  background: addrCount > 0 && !addrLoading && withinCanvassingHours ? "#1D9E75" : "rgba(255,255,255,0.06)",
                  color: addrCount > 0 && !addrLoading && withinCanvassingHours ? "#fff" : "rgba(255,255,255,0.25)",
                  fontSize: 14, fontWeight: 700, cursor: addrCount > 0 && !addrLoading && withinCanvassingHours ? "pointer" : "not-allowed",
                  letterSpacing: "0.03em",
                }}
              >
                {addrLoading ? "Loading addresses…" : !withinCanvassingHours ? "Canvassing hours: 9am–9pm" : addrCount > 0 ? "🗺️ Begin Canvassing" : "Select a ward to load doors"}
              </button>

              {addrError && <div style={{ marginTop: 8, color: "#E24B4A", fontSize: 11 }}>{addrError}</div>}
              <div style={{ marginTop: 10, color: "rgba(255,255,255,0.22)", fontSize: 10 }}>Durham Region · Ontario Municipal 2026</div>
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

            {/* Panel header */}
            <div style={{ padding: "14px 18px 12px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <button onClick={() => setShowTurfPanel(false)}
                  style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.6)", cursor: "pointer", borderRadius: 7, padding: "4px 10px", fontSize: 12, fontWeight: 600 }}>
                  ← Back
                </button>
                <div style={{ ...label }}>Turf Cutting</div>
                <button onClick={() => { setSelectedWard(null); setShowTurfPanel(false); setAddresses(null); }}
                  style={{ background: "transparent", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 14 }}>✕</button>
              </div>
              <div style={{ color: "#fff", fontSize: 16, fontWeight: 800, marginTop: 8 }}>{getProp(selectedProps, "wardName")}</div>
              <div style={{ ...subval, marginTop: 2 }}>{uniqueDoors.toLocaleString()} doors · {streets.length} streets</div>

              {/* Persuasion / GOTV mode toggle */}
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
            </div>

            {/* Canvasser count */}
            <div style={{ padding: "14px 18px", borderBottom: "1px solid rgba(255,255,255,0.07)", flexShrink: 0 }}>
              <div style={{ ...label, marginBottom: 10 }}>How many canvassers?</div>
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

            {/* Street intelligence / turf list */}
            <div style={{ flex: 1, overflowY: "auto", padding: "10px 0" }}>
              {turfs.length === 0 ? (
                <div>
                  <div style={{ padding: "4px 18px 8px", ...label }}>Street Intelligence ({streets.length} streets)</div>
                  {streets.map((st, i) => (
                    <div key={i} style={{ padding: "8px 18px", borderBottom: "1px solid rgba(255,255,255,0.04)" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                        <span style={{ color: "#fff", fontSize: 13, fontWeight: 600 }}>{st.name}</span>
                        <span style={{ color: "rgba(255,255,255,0.5)", fontSize: 11 }}>{st.doors} doors</span>
                      </div>
                      <div style={{ display: "flex", gap: 8, marginTop: 3 }}>
                        {st.houses > 0 && (
                          <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 10 }}>🏠 {st.houses}</span>
                        )}
                        {st.buildings > 0 && (
                          <span style={{ color: "#EF9F27", fontSize: 10 }}>🏢 {st.buildings} bldg · {st.buildingUnits} units</span>
                        )}
                        <span style={{ color: "rgba(255,255,255,0.25)", fontSize: 10 }}>~{Math.round(st.estMinutes)}min</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div>
                  <div style={{ padding: "4px 18px 8px", ...label }}>
                    {turfs.length} Turfs — {canvassingMode === "gotv" ? "GOTV Mode" : "Persuasion Mode"}
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
                    <button
                      style={{ width: "100%", padding: "11px", borderRadius: 10, background: "rgba(29,158,117,0.15)", border: "1px solid rgba(29,158,117,0.3)", color: "#1D9E75", fontSize: 13, fontWeight: 700, cursor: "pointer" } as React.CSSProperties}
                    >
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
                <div style={label}>Address</div>
                <div style={{ color: "#fff", fontSize: 14, fontWeight: 700, marginTop: 3 }}>{selectedAddress.address}</div>
                {selectedAddress.unit && <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 11 }}>Unit {selectedAddress.unit}</div>}
              </div>
              <button onClick={() => setSelectedAddress(null)}
                style={{ background: "rgba(255,255,255,0.07)", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", borderRadius: 6, width: 24, height: 24, fontSize: 12 }}>✕</button>
            </div>
            {selectedAddress.postalCode && (
              <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
                <span style={{ ...subval, fontSize: 11 }}>Postal Code</span>
                <span style={{ color: "#fff", fontSize: 12, fontWeight: 600 }}>{selectedAddress.postalCode}</span>
              </div>
            )}
            <div style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}>
              <span style={{ ...subval, fontSize: 11 }}>Source</span>
              <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>
                {selectedAddress.source === "whitby-geohub" ? "Whitby GeoHub" : "OpenStreetMap"}
              </span>
            </div>
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
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading Whitby…</div>
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
            <button onClick={() => { setWardError(null); setWardLoading(true); fetch("/api/atlas/whitby-wards").then(r => r.json() as Promise<FeatureCollection>).then(setWards).catch((e: Error) => setWardError(e.message)).finally(() => setWardLoading(false)); }}
              style={{ marginTop: 16, background: "#1D9E75", border: "none", color: "#fff", borderRadius: 8, padding: "9px 22px", cursor: "pointer", fontSize: 13, fontWeight: 700 }}>
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
