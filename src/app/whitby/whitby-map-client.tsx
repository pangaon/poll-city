"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Map, {
  Source,
  Layer,
  NavigationControl,
  ScaleControl,
  AttributionControl,
} from "react-map-gl/maplibre";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import type {
  FillLayerSpecification,
  LineLayerSpecification,
  SymbolLayerSpecification,
  CircleLayerSpecification,
} from "maplibre-gl";
import type { FeatureCollection, Feature } from "geojson";
import { motion, AnimatePresence } from "framer-motion";

const TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";
const WHITBY_CENTER = { longitude: -78.959477, latitude: 43.942973, zoom: 11 };

// ─── helpers ─────────────────────────────────────────────────────────────────

function computeBbox(fc: FeatureCollection): [[number, number], [number, number]] | null {
  let minLng = Infinity, minLat = Infinity, maxLng = -Infinity, maxLat = -Infinity;
  function walk(coords: unknown): void {
    if (!Array.isArray(coords)) return;
    if (typeof coords[0] === "number" && typeof coords[1] === "number") {
      const [lng, lat] = coords as [number, number];
      if (lng < minLng) minLng = lng;
      if (lat < minLat) minLat = lat;
      if (lng > maxLng) maxLng = lng;
      if (lat > maxLat) maxLat = lat;
    } else { (coords as unknown[]).forEach(walk); }
  }
  for (const f of fc.features) {
    const geom = (f as Feature).geometry;
    if (geom && "coordinates" in geom) walk(geom.coordinates);
  }
  if (!isFinite(minLng)) return null;
  return [[minLng, minLat], [maxLng, maxLat]];
}

function getProp(props: Record<string, unknown> | null | undefined, key: string): string {
  if (!props) return "";
  return String(props[key] ?? "");
}

// ─── ward layer specs ─────────────────────────────────────────────────────────

const wardFillLayer: Omit<FillLayerSpecification, "source"> = {
  id: "ward-fill",
  type: "fill",
  paint: {
    "fill-color": ["get", "wardFill"],
    "fill-opacity": ["case", ["boolean", ["feature-state", "hover"], false], 0.52, 0.22],
  },
};

const wardLineLayer: Omit<LineLayerSpecification, "source"> = {
  id: "ward-line",
  type: "line",
  paint: {
    "line-color": ["get", "wardStroke"],
    "line-width": ["case", ["boolean", ["feature-state", "hover"], false], 3.5, 2],
    "line-opacity": 0.85,
  },
};

const wardSelectedFillLayer: Omit<FillLayerSpecification, "source"> = {
  id: "ward-selected-fill",
  type: "fill",
  paint: { "fill-color": ["get", "wardFill"], "fill-opacity": 0.55 },
};

const wardSelectedLineLayer: Omit<LineLayerSpecification, "source"> = {
  id: "ward-selected-line",
  type: "line",
  paint: { "line-color": ["get", "wardStroke"], "line-width": 4, "line-opacity": 1 },
};

const wardLabelLayer: Omit<SymbolLayerSpecification, "source"> = {
  id: "ward-label",
  type: "symbol",
  layout: {
    "text-field": ["get", "wardName"],
    "text-size": 13,
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    "text-anchor": "center",
    "text-max-width": 8,
  },
  paint: {
    "text-color": "#0A2342",
    "text-halo-color": "rgba(255,255,255,0.92)",
    "text-halo-width": 2,
  },
};

// ─── address layer specs ──────────────────────────────────────────────────────

const addrClusterLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "addr-clusters",
  type: "circle",
  filter: ["has", "point_count"],
  paint: {
    "circle-color": [
      "step", ["get", "point_count"],
      "#1D9E75", 25,
      "#EF9F27", 100,
      "#E24B4A",
    ],
    "circle-radius": ["step", ["get", "point_count"], 18, 25, 24, 100, 32],
    "circle-opacity": 0.88,
    "circle-stroke-width": 2,
    "circle-stroke-color": "rgba(255,255,255,0.3)",
  },
};

const addrClusterCountLayer: Omit<SymbolLayerSpecification, "source"> = {
  id: "addr-cluster-count",
  type: "symbol",
  filter: ["has", "point_count"],
  layout: {
    "text-field": "{point_count_abbreviated}",
    "text-size": 12,
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
  },
  paint: { "text-color": "#ffffff" },
};

const addrPointLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "addr-point",
  type: "circle",
  filter: ["!", ["has", "point_count"]],
  paint: {
    "circle-color": "#1D9E75",
    "circle-radius": 5,
    "circle-stroke-width": 1.5,
    "circle-stroke-color": "#fff",
    "circle-opacity": 0.9,
  },
};

// ─── glass style ─────────────────────────────────────────────────────────────

const glass: React.CSSProperties = {
  background: "rgba(10, 35, 66, 0.72)",
  backdropFilter: "blur(20px)",
  WebkitBackdropFilter: "blur(20px)",
  border: "1px solid rgba(255,255,255,0.13)",
  borderRadius: "16px",
  boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
};

const glassLight: React.CSSProperties = {
  background: "rgba(10, 35, 66, 0.55)",
  backdropFilter: "blur(16px)",
  WebkitBackdropFilter: "blur(16px)",
  border: "1px solid rgba(255,255,255,0.10)",
  borderRadius: "12px",
  boxShadow: "0 4px 16px rgba(0,0,0,0.3)",
};

// ─── component ───────────────────────────────────────────────────────────────

type AddressProps = { address: string; civic: string; street: string; postalCode: string; city: string; unit: string };

export default function WhitbyMapClient() {
  const mapRef = useRef<MapRef>(null);
  const [mapLoaded, setMapLoaded] = useState(false);

  // Ward state
  const [wards, setWards] = useState<FeatureCollection | null>(null);
  const [selectedWard, setSelectedWard] = useState<Feature | null>(null);
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [wardLoading, setWardLoading] = useState(true);
  const [wardError, setWardError] = useState<string | null>(null);

  // Address state
  const [showAddresses, setShowAddresses] = useState(false);
  const [addresses, setAddresses] = useState<FeatureCollection | null>(null);
  const [addrLoading, setAddrLoading] = useState(false);
  const [addrError, setAddrError] = useState<string | null>(null);
  const [selectedAddress, setSelectedAddress] = useState<AddressProps | null>(null);

  // Fetch ward boundaries
  useEffect(() => {
    fetch("/api/atlas/whitby-wards")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FeatureCollection>; })
      .then((data) => { setWards(data); setWardLoading(false); })
      .catch((err: Error) => { setWardError(err.message); setWardLoading(false); });
  }, []);

  // Lazy-load addresses only when toggled on
  useEffect(() => {
    if (!showAddresses || addresses) return;
    setAddrLoading(true);
    setAddrError(null);
    fetch("/api/atlas/whitby-addresses")
      .then((r) => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() as Promise<FeatureCollection>; })
      .then((data) => { setAddresses(data); setAddrLoading(false); })
      .catch((err: Error) => { setAddrError(err.message); setAddrLoading(false); });
  }, [showAddresses, addresses]);

  // Auto-fit map to Whitby ward bounds
  useEffect(() => {
    if (!mapLoaded || !wards || !mapRef.current) return;
    const bbox = computeBbox(wards);
    if (!bbox) return;
    try { mapRef.current.fitBounds(bbox, { padding: 60, duration: 1000, maxZoom: 13 }); } catch { /* ignore */ }
  }, [mapLoaded, wards]);

  // Hover via feature-state (zero React re-renders)
  const handleMouseMove = useCallback((e: MapMouseEvent) => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    const features = (e as MapMouseEvent & { features?: { properties: Record<string, unknown>; layer: { id: string } }[] }).features;
    const wardFeature = features?.find((f) => f.layer.id === "ward-fill");

    if (wardFeature) {
      const newId = wardFeature.properties?.wardIndex as number;
      if (hoveredId !== null && hoveredId !== newId) {
        map.setFeatureState({ source: "wards", id: hoveredId }, { hover: false });
      }
      map.setFeatureState({ source: "wards", id: newId }, { hover: true });
      setHoveredId(newId);
      map.getCanvas().style.cursor = "pointer";
    } else if (features?.some((f) => ["addr-clusters", "addr-point"].includes(f.layer.id))) {
      map.getCanvas().style.cursor = "pointer";
    } else {
      if (hoveredId !== null) {
        map.setFeatureState({ source: "wards", id: hoveredId }, { hover: false });
      }
      setHoveredId(null);
      map.getCanvas().style.cursor = "";
    }
  }, [hoveredId]);

  const handleMouseLeave = useCallback(() => {
    if (!mapRef.current) return;
    const map = mapRef.current.getMap();
    if (hoveredId !== null) map.setFeatureState({ source: "wards", id: hoveredId }, { hover: false });
    setHoveredId(null);
    map.getCanvas().style.cursor = "";
  }, [hoveredId]);

  // Click — route to ward or address or cluster
  const handleClick = useCallback((e: MapMouseEvent) => {
    if (!mapRef.current) return;
    const features = (e as MapMouseEvent & { features?: { properties: Record<string, unknown>; layer: { id: string }; geometry: { coordinates: [number, number] } }[] }).features;
    if (!features || features.length === 0) {
      setSelectedWard(null);
      setSelectedAddress(null);
      return;
    }

    // Cluster → zoom in
    const cluster = features.find((f) => f.layer.id === "addr-clusters");
    if (cluster) {
      const map = mapRef.current.getMap();
      const clusterId = cluster.properties.cluster_id as number;
      const clusterCoords = (cluster.geometry as unknown as { coordinates: [number, number] }).coordinates;
      const src = map.getSource("addresses") as { getClusterExpansionZoom: (id: number, cb: (err: Error | null, zoom: number) => void) => void } | undefined;
      if (src?.getClusterExpansionZoom) {
        src.getClusterExpansionZoom(clusterId, (err, zoom) => {
          if (err) return;
          mapRef.current?.flyTo({ center: clusterCoords, zoom });
        });
      } else {
        mapRef.current?.flyTo({ center: clusterCoords, zoom: (mapRef.current.getMap().getZoom() ?? 11) + 2 });
      }
      return;
    }

    // Individual address point
    const addrPoint = features.find((f) => f.layer.id === "addr-point");
    if (addrPoint) {
      setSelectedAddress(addrPoint.properties as unknown as AddressProps);
      setSelectedWard(null);
      return;
    }

    // Ward click
    const wardFeature = features.find((f) => f.layer.id === "ward-fill");
    if (wardFeature) {
      setSelectedWard(wardFeature as unknown as Feature);
      setSelectedAddress(null);
    } else {
      setSelectedWard(null);
      setSelectedAddress(null);
    }
  }, []);

  // Sidebar ward click
  const handleSidebarWardClick = useCallback((feature: Feature) => {
    setSelectedWard(feature);
    setSelectedAddress(null);
    if (!mapRef.current) return;
    const fc: FeatureCollection = { type: "FeatureCollection", features: [feature] };
    const bbox = computeBbox(fc);
    if (bbox) {
      try { mapRef.current.fitBounds(bbox, { padding: 80, duration: 800, maxZoom: 13 }); } catch { /* ignore */ }
    }
  }, []);

  const wardCount = wards?.features.length ?? 0;
  const addrCount = addresses?.features.length ?? 0;
  const selectedFC: FeatureCollection | null = selectedWard
    ? { type: "FeatureCollection", features: [selectedWard] }
    : null;
  const selectedProps = selectedWard?.properties as Record<string, unknown> | null;

  const interactiveLayers = ["ward-fill", ...(showAddresses && addresses ? ["addr-clusters", "addr-point"] : [])];

  return (
    <div className="relative w-full h-screen overflow-hidden" style={{ background: "#060f1e" }}>

      {/* ── MAP ────────────────────────────────────────────────────── */}
      <Map
        ref={mapRef}
        initialViewState={WHITBY_CENTER}
        mapStyle={TILE_STYLE}
        style={{ width: "100%", height: "100%" }}
        attributionControl={false}
        reuseMaps
        onLoad={() => setMapLoaded(true)}
        interactiveLayerIds={interactiveLayers}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />
        <AttributionControl
          position="bottom-left"
          customAttribution="© OpenFreeMap © OpenStreetMap contributors"
          compact
        />

        {/* Ward boundaries */}
        {wards && (
          <Source id="wards" type="geojson" data={wards} promoteId="wardIndex">
            <Layer {...wardFillLayer} />
            <Layer {...wardLineLayer} />
            <Layer {...wardLabelLayer} />
          </Source>
        )}

        {/* Selected ward highlight */}
        {selectedFC && (
          <Source id="ward-selected" type="geojson" data={selectedFC}>
            <Layer {...wardSelectedFillLayer} />
            <Layer {...wardSelectedLineLayer} />
          </Source>
        )}

        {/* Address clusters */}
        {showAddresses && addresses && (
          <Source
            id="addresses"
            type="geojson"
            data={addresses}
            cluster
            clusterMaxZoom={15}
            clusterRadius={45}
          >
            <Layer {...addrClusterLayer} />
            <Layer {...addrClusterCountLayer} />
            <Layer {...addrPointLayer} />
          </Source>
        )}
      </Map>

      {/* ── GLASS HEADER ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: "easeOut" }}
        style={{ ...glass, position: "absolute", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 10, padding: "14px 28px", minWidth: 360, textAlign: "center" }}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ fontSize: 20 }}>🏛️</span>
          <div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, letterSpacing: "0.04em", lineHeight: 1.2 }}>
              TOWN OF WHITBY
            </div>
            <div style={{ color: "rgba(255,255,255,0.55)", fontSize: 11, letterSpacing: "0.12em", marginTop: 2, textTransform: "uppercase" }}>
              Ward Boundaries · Municipal Electoral Map
            </div>
          </div>
          {wardCount > 0 && (
            <span style={{ marginLeft: 10, background: "rgba(29,158,117,0.25)", border: "1px solid rgba(29,158,117,0.5)", color: "#1D9E75", fontSize: 11, fontWeight: 700, borderRadius: 20, padding: "2px 10px", letterSpacing: "0.06em" }}>
              {wardCount} WARDS
            </span>
          )}
        </div>
      </motion.div>

      {/* ── LEFT SIDEBAR ─────────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, x: -30 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
        style={{ ...glass, position: "absolute", top: 90, left: 20, zIndex: 10, width: 220, maxHeight: "calc(100vh - 200px)", overflowY: "auto", padding: "16px 0" }}
      >
        <div style={{ padding: "0 16px 12px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase" }}>Ward Directory</div>
          <div style={{ color: "#fff", fontSize: 13, fontWeight: 600, marginTop: 2 }}>Whitby, Ontario</div>
        </div>

        <div style={{ padding: "8px 0" }}>
          {wardLoading && <div style={{ padding: "16px", color: "rgba(255,255,255,0.4)", fontSize: 12, textAlign: "center" }}>Loading wards…</div>}
          {wardError && <div style={{ padding: "16px", color: "#E24B4A", fontSize: 11 }}>{wardError}</div>}
          {wards?.features.map((f, i) => {
            const props = (f as Feature).properties as Record<string, unknown>;
            const name = getProp(props, "wardName");
            const fill = getProp(props, "wardFill");
            const isSelected = selectedWard?.properties?.wardIndex === props.wardIndex;
            return (
              <button
                key={i}
                onClick={() => handleSidebarWardClick(f as Feature)}
                style={{ display: "flex", alignItems: "center", gap: 10, width: "100%", padding: "9px 16px", background: isSelected ? "rgba(255,255,255,0.08)" : "transparent", border: "none", cursor: "pointer", textAlign: "left" }}
              >
                <span style={{ width: 10, height: 10, borderRadius: "50%", background: fill, flexShrink: 0, boxShadow: isSelected ? `0 0 8px ${fill}` : "none" }} />
                <span style={{ color: isSelected ? "#fff" : "rgba(255,255,255,0.75)", fontSize: 12, fontWeight: isSelected ? 600 : 400, lineHeight: 1.3 }}>
                  {name}
                </span>
                {isSelected && <span style={{ marginLeft: "auto", color: fill, fontSize: 10 }}>●</span>}
              </button>
            );
          })}
        </div>

        {/* Address toggle */}
        <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)", padding: "12px 16px" }}>
          <button
            onClick={() => { setShowAddresses((v) => !v); setSelectedAddress(null); }}
            style={{
              width: "100%",
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid",
              borderColor: showAddresses ? "rgba(29,158,117,0.6)" : "rgba(255,255,255,0.12)",
              background: showAddresses ? "rgba(29,158,117,0.18)" : "rgba(255,255,255,0.04)",
              color: showAddresses ? "#1D9E75" : "rgba(255,255,255,0.6)",
              cursor: "pointer",
              fontSize: 11,
              fontWeight: 600,
              letterSpacing: "0.06em",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 6,
              transition: "all 0.2s",
            }}
          >
            <span>📍 Address Points</span>
            <span style={{ fontSize: 10, opacity: 0.7 }}>
              {addrLoading ? "loading…" : showAddresses && addrCount > 0 ? `${addrCount.toLocaleString()}` : showAddresses ? "on" : "off"}
            </span>
          </button>
          {addrError && <div style={{ color: "#E24B4A", fontSize: 10, marginTop: 6 }}>{addrError}</div>}
        </div>

        <div style={{ padding: "0 16px 4px" }}>
          <div style={{ color: "rgba(255,255,255,0.28)", fontSize: 10, lineHeight: 1.5 }}>
            Data: Whitby GeoHub · OpenStreetMap<br />
            Click a ward or address to explore
          </div>
        </div>
      </motion.div>

      {/* ── SELECTED WARD PANEL ───────────────────────────────────── */}
      <AnimatePresence>
        {selectedWard && selectedProps && (
          <motion.div
            key="ward-detail"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ ...glass, position: "absolute", bottom: 40, right: 20, zIndex: 10, width: 280, padding: "20px" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: getProp(selectedProps, "wardFill"), borderRadius: "16px 16px 0 0", opacity: 0.9 }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Selected Ward</div>
                <div style={{ color: "#fff", fontSize: 18, fontWeight: 700 }}>{getProp(selectedProps, "wardName")}</div>
              </div>
              <button onClick={() => setSelectedWard(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", borderRadius: 8, width: 28, height: 28, fontSize: 14, flexShrink: 0, marginTop: 2 }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              {Object.entries(selectedProps)
                .filter(([k]) => !["wardFill", "wardStroke", "wardIndex"].includes(k))
                .filter(([, v]) => v != null && String(v).trim() !== "")
                .slice(0, 6)
                .map(([key, value]) => {
                  const label = key.replace(/_/g, " ").replace(/([A-Z])/g, " $1").replace(/\b\w/g, (c) => c.toUpperCase()).trim();
                  return (
                    <div key={key} style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: 8 }}>
                      <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>{label}</span>
                      <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 500, textAlign: "right", maxWidth: 160, wordBreak: "break-word" }}>{String(value)}</span>
                    </div>
                  );
                })}
            </div>
            <div style={{ marginTop: 16, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>📍 Town of Whitby · Durham Region, Ontario</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── SELECTED ADDRESS PANEL ────────────────────────────────── */}
      <AnimatePresence>
        {selectedAddress && (
          <motion.div
            key="addr-detail"
            initial={{ opacity: 0, y: 30, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.96 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{ ...glass, position: "absolute", bottom: 40, right: 20, zIndex: 10, width: 260, padding: "20px" }}
          >
            <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 3, background: "#1D9E75", borderRadius: "16px 16px 0 0" }} />
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 12 }}>
              <div>
                <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", marginBottom: 4 }}>Address</div>
                <div style={{ color: "#fff", fontSize: 15, fontWeight: 700, lineHeight: 1.3 }}>{selectedAddress.address}</div>
                {selectedAddress.unit && <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginTop: 2 }}>Unit {selectedAddress.unit}</div>}
              </div>
              <button onClick={() => setSelectedAddress(null)} style={{ background: "rgba(255,255,255,0.08)", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", borderRadius: 8, width: 28, height: 28, fontSize: 14, flexShrink: 0, marginTop: 2 }}>✕</button>
            </div>
            <div style={{ display: "grid", gap: 6 }}>
              {selectedAddress.city && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>City</span>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 500 }}>{selectedAddress.city}</span>
                </div>
              )}
              {selectedAddress.postalCode && (
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Postal Code</span>
                  <span style={{ color: "rgba(255,255,255,0.85)", fontSize: 11, fontWeight: 500 }}>{selectedAddress.postalCode}</span>
                </div>
              )}
            </div>
            <div style={{ marginTop: 14, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 10 }}>Source: OpenStreetMap</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ADDRESS LOADING BADGE ─────────────────────────────────── */}
      <AnimatePresence>
        {addrLoading && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            style={{ ...glassLight, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 15, padding: "16px 24px", display: "flex", alignItems: "center", gap: 12, pointerEvents: "none" }}
          >
            <div style={{ width: 20, height: 20, borderRadius: "50%", border: "2px solid rgba(29,158,117,0.3)", borderTopColor: "#1D9E75", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: 12, letterSpacing: "0.08em" }}>Fetching Whitby addresses…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── BOTTOM-LEFT BRAND ────────────────────────────────────── */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8, duration: 0.5 }}
        style={{ ...glassLight, position: "absolute", bottom: 20, left: 20, zIndex: 10, padding: "8px 14px" }}
      >
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 10, letterSpacing: "0.08em" }}>
          Powered by <span style={{ color: "#1D9E75", fontWeight: 700 }}>Poll City</span> · Ontario Municipal 2026
        </div>
      </motion.div>

      {/* ── WARD LOADING OVERLAY ──────────────────────────────────── */}
      <AnimatePresence>
        {wardLoading && (
          <motion.div
            initial={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
            style={{ position: "absolute", inset: 0, background: "rgba(6,15,30,0.7)", backdropFilter: "blur(8px)", zIndex: 20, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 16 }}
          >
            <div style={{ width: 48, height: 48, borderRadius: "50%", border: "3px solid rgba(29,158,117,0.2)", borderTopColor: "#1D9E75", animation: "spin 0.8s linear infinite" }} />
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: 13, letterSpacing: "0.1em", textTransform: "uppercase" }}>Loading ward boundaries…</div>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── ERROR OVERLAY ─────────────────────────────────────────── */}
      <AnimatePresence>
        {wardError && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            style={{ ...glass, position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", zIndex: 20, padding: 32, maxWidth: 360, textAlign: "center" }}
          >
            <div style={{ fontSize: 32, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: "#E24B4A", fontSize: 15, fontWeight: 600, marginBottom: 8 }}>Could not load ward data</div>
            <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, lineHeight: 1.6 }}>{wardError}</div>
            <button
              onClick={() => { setWardError(null); setWardLoading(true); fetch("/api/atlas/whitby-wards").then(r => r.json() as Promise<FeatureCollection>).then(setWards).catch((e: Error) => setWardError(e.message)).finally(() => setWardLoading(false)); }}
              style={{ marginTop: 20, background: "#1D9E75", border: "none", color: "#fff", borderRadius: 8, padding: "10px 24px", cursor: "pointer", fontSize: 13, fontWeight: 600 }}
            >
              Retry
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
