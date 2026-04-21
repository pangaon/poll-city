"use client";

import dynamic from "next/dynamic";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import { turfStatusColor } from "@/components/maps/lib/map-utils";

const PollCityMap = dynamic(() => import("@/components/maps/poll-city-map"), { ssr: false });

export type CampaignMapMode = "canvassing" | "walk" | "signs" | "dashboard" | "gotv" | "public";

interface AreaStats {
  doors: number;
  knocked: number;
  supporters: number;
  estimatedHours: number;
  volunteersNeeded: number;
}

export interface MapTurfSelection {
  id: string | null;
  name: string | null;
  coordinates: Array<[number, number]>;
  stats: AreaStats;
  status?: string;
  completionPercent?: number;
  assignedVolunteer?: string | null;
  totalDoors?: number;
  doorsKnocked?: number;
  supporters?: number;
  undecided?: number;
}

export interface CampaignMapProps {
  mode: CampaignMapMode;
  height?: number | string;
  campaignId?: string;
  turfId?: string;
  selectedTurfId?: string | null;
  onTurfDraw?: (coordinates: Array<[number, number]>, stats: AreaStats) => void;
  onTurfClick?: (selection: MapTurfSelection) => void;
  onAreaSelect?: (stats: AreaStats) => void;
  showControls?: boolean;
  showCalculator?: boolean;
  hideLegend?: boolean;
}

function computeAreaStats(pointCount: number): AreaStats {
  const doors = pointCount;
  const knocked = Math.round(doors * 0.42);
  const supporters = Math.round(doors * 0.31);
  const estimatedHours = Math.max(1, Number((doors / 45).toFixed(1)));
  const volunteersNeeded = Math.max(1, Math.ceil(estimatedHours / 2));
  return { doors, knocked, supporters, estimatedHours, volunteersNeeded };
}

interface LayerToggles {
  heat: boolean;
  doors: boolean;
  universe: boolean;
  turfs: boolean;
  signs: boolean;
  volunteers: boolean;
  route: boolean;
}

export { turfStatusColor };

type GeoFC = GeoJSON.FeatureCollection;
type GeoFeat = GeoJSON.Feature;

function fetchGeoJSON(url: string): Promise<GeoFC | null> {
  return fetch(url)
    .then((r) => (r.ok ? (r.json() as Promise<GeoFC>) : null))
    .catch(() => null);
}

const SUPPORT_COLOR_EXPR = [
  "match",
  ["get", "supportLevel"],
  "strong_support", "#1D9E75",
  "lean_support",   "#6ee7b7",
  "undecided",      "#EF9F27",
  "lean_oppose",    "#fca5a5",
  "strong_oppose",  "#E24B4A",
  "#94a3b8",
];

const TURF_COLOR_EXPR = [
  "match",
  ["get", "status"],
  "completed",   "#22c55e",
  "reassigned",  "#a855f7",
  "in_progress", "#f59e0b",
  "assigned",    "#3b82f6",
  "#9ca3af",
];

export default function CampaignMap({
  mode,
  height = 480,
  campaignId,
  turfId,
  selectedTurfId,
  onTurfDraw,
  onTurfClick,
  onAreaSelect,
  showControls = true,
  showCalculator = false,
  hideLegend = false,
}: CampaignMapProps) {
  const [layer, setLayer] = useState<LayerToggles>({
    heat: mode === "gotv" || mode === "dashboard" || mode === "canvassing",
    doors: true,
    universe: mode === "canvassing",
    turfs: mode !== "public",
    signs: mode === "signs" || mode === "dashboard" || mode === "canvassing",
    volunteers: mode !== "public",
    route: mode === "walk" || mode === "canvassing",
  });

  const [contacts, setContacts] = useState<GeoFC | null>(null);
  const [addressUniverse, setAddressUniverse] = useState<GeoFC | null>(null);
  const [turfs, setTurfs] = useState<GeoFC | null>(null);
  const [signs, setSigns] = useState<GeoFC | null>(null);
  const [volunteers, setVolunteers] = useState<GeoFC | null>(null);
  const [wardBoundary, setWardBoundary] = useState<GeoFC | GeoFeat | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [draftPolygon, setDraftPolygon] = useState<Array<[number, number]>>([]);
  const [selectedStats, setSelectedStats] = useState<AreaStats>(computeAreaStats(0));

  useEffect(() => {
    if (!campaignId) return;
    const cid = encodeURIComponent(campaignId);
    const turfParam = turfId ? `&turfId=${encodeURIComponent(turfId)}` : "";
    void Promise.all([
      fetchGeoJSON(`/api/maps/contacts-geojson?campaignId=${cid}${turfParam}&take=10000`),
      fetchGeoJSON(`/api/maps/turfs-geojson?campaignId=${cid}`),
      fetchGeoJSON(`/api/maps/signs-geojson?campaignId=${cid}`),
      fetchGeoJSON(`/api/maps/volunteer-locations?campaignId=${cid}`),
      fetchGeoJSON(`/api/maps/address-prelist?campaignId=${cid}`),
      fetch(`/api/geodata/ward-boundary?campaignId=${cid}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((d: { data?: GeoFC | GeoFeat } | null) => d?.data ?? null)
        .catch(() => null),
    ]).then(([contactGeo, turfGeo, signGeo, volunteerGeo, universeGeo, boundary]) => {
      setContacts(contactGeo);
      setAddressUniverse(universeGeo);
      setTurfs(turfGeo);
      setSigns(signGeo);
      setVolunteers(volunteerGeo);
      setWardBoundary(boundary as GeoFC | GeoFeat | null);

      const stats = computeAreaStats(contactGeo?.features?.length ?? 0);
      setSelectedStats(stats);
      onAreaSelect?.(stats);
    });
  }, [campaignId, turfId, onAreaSelect]);

  // Dashboard live refresh
  useEffect(() => {
    if (mode !== "dashboard" || !campaignId) return;
    const timer = window.setInterval(() => {
      void fetchGeoJSON(`/api/maps/contacts-geojson?campaignId=${encodeURIComponent(campaignId)}&take=10000`)
        .then((next) => { if (next) setContacts(next); });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [mode, campaignId]);

  const areaStats = useMemo(() => {
    const count = draftPolygon.length > 2 ? draftPolygon.length * 16 : (contacts?.features?.length ?? 0);
    return computeAreaStats(count);
  }, [contacts, draftPolygon.length]);

  useEffect(() => {
    setSelectedStats(areaStats);
    onAreaSelect?.(areaStats);
  }, [areaStats, onAreaSelect]);

  const handleMapClick = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      if (!drawMode) return;
      setDraftPolygon((prev) => [...prev, [lngLat.lat, lngLat.lng]]);
    },
    [drawMode],
  );

  const wardFC: GeoFC | null = useMemo(() => {
    if (!wardBoundary) return null;
    if (wardBoundary.type === "FeatureCollection") return wardBoundary as GeoFC;
    if (wardBoundary.type === "Feature") {
      return { type: "FeatureCollection", features: [wardBoundary as GeoFeat] };
    }
    return null;
  }, [wardBoundary]);

  // Draft polygon GeoJSON for draw mode
  const draftFC: GeoFC = useMemo(() => {
    if (draftPolygon.length < 2) return { type: "FeatureCollection", features: [] };
    const coords = draftPolygon.map(([lat, lng]) => [lng, lat]);
    return {
      type: "FeatureCollection",
      features: [{
        type: "Feature",
        geometry: draftPolygon.length >= 3
          ? { type: "Polygon", coordinates: [[...coords, coords[0]]] }
          : { type: "LineString", coordinates: coords },
        properties: {},
      }],
    };
  }, [draftPolygon]);

  // Turf data with selected flag
  const turfsDisplay: GeoFC | null = useMemo(() => {
    if (!turfs) return null;
    return {
      ...turfs,
      features: turfs.features.map((f) => ({
        ...f,
        properties: {
          ...(f.properties ?? {}),
          _selected: (f.properties?.id ?? "") === (selectedTurfId ?? "__none__"),
        },
      })),
    };
  }, [turfs, selectedTurfId]);

  const containerHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ height: containerHeight, isolation: "isolate", zIndex: 0 }}>
      <PollCityMap
        mode={mode}
        wardGeoJSON={wardFC}
        height="100%"
        cursor={drawMode ? "crosshair" : "grab"}
        onMapClick={handleMapClick}
      >
        {/* Turf polygons */}
        {layer.turfs && turfsDisplay && (
          <Source id="cm-turfs" type="geojson" data={turfsDisplay}>
            <Layer
              id="cm-turf-fill"
              type="fill"
              paint={{
                "fill-color": TURF_COLOR_EXPR as never,
                "fill-opacity": [
                  "case", ["==", ["get", "_selected"], true], 0.35, 0.12,
                ] as never,
              }}
            />
            <Layer
              id="cm-turf-outline"
              type="line"
              paint={{
                "line-color": [
                  "case", ["==", ["get", "_selected"], true], "#EF9F27", ...TURF_COLOR_EXPR as string[],
                ] as never,
                "line-width": ["case", ["==", ["get", "_selected"], true], 3, 2] as never,
              }}
            />
          </Source>
        )}

        {/* Address universe — all doors in the ward (grey, beneath contacts) */}
        {layer.universe && addressUniverse && (addressUniverse.features?.length ?? 0) > 0 && (
          <Source id="cm-universe" type="geojson" data={addressUniverse}>
            <Layer
              id="cm-universe-dots"
              type="circle"
              paint={{
                "circle-color": "#94a3b8",
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14, 4] as never,
                "circle-opacity": 0.5,
              }}
            />
          </Source>
        )}

        {/* Contact dots (with optional heatmap) */}
        {layer.doors && contacts && mode !== "signs" && (
          <Source id="cm-contacts" type="geojson" data={contacts}>
            {layer.heat && (
              <Layer
                id="cm-heat"
                type="heatmap"
                maxzoom={15}
                paint={{
                  "heatmap-radius": 20,
                  "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.7, 15, 0.2] as never,
                }}
              />
            )}
            <Layer
              id="cm-dots"
              type="circle"
              paint={{
                "circle-color": SUPPORT_COLOR_EXPR as never,
                "circle-radius": ["interpolate", ["linear"], ["zoom"], 10, 3, 14, 6] as never,
                "circle-opacity": 0.85,
                "circle-stroke-width": 1,
                "circle-stroke-color": "#ffffff",
              }}
            />
          </Source>
        )}

        {/* Sign dots */}
        {layer.signs && signs && (
          <Source id="cm-signs" type="geojson" data={signs}>
            <Layer
              id="cm-sign-dots"
              type="circle"
              paint={{
                "circle-color": "#EF9F27",
                "circle-radius": 6,
                "circle-stroke-width": 1.5,
                "circle-stroke-color": "#ffffff",
              }}
            />
          </Source>
        )}

        {/* Volunteer pins */}
        {layer.volunteers && volunteers && (
          <Source id="cm-volunteers" type="geojson" data={volunteers}>
            <Layer
              id="cm-volunteer-dots"
              type="circle"
              paint={{
                "circle-color": "#2563eb",
                "circle-radius": 7,
                "circle-stroke-width": 2,
                "circle-stroke-color": "#ffffff",
              }}
            />
          </Source>
        )}

        {/* Walk route */}
        {mode === "walk" && layer.route && contacts && (contacts.features?.length ?? 0) > 1 && (
          <Source id="cm-route" type="geojson" data={contacts}>
            <Layer
              id="cm-route-line"
              type="line"
              paint={{
                "line-color": "#2563eb",
                "line-width": 3,
              }}
            />
          </Source>
        )}

        {/* Draw mode draft polygon */}
        {drawMode && draftPolygon.length >= 2 && (
          <Source id="cm-draft" type="geojson" data={draftFC}>
            {draftPolygon.length >= 3 && (
              <Layer
                id="cm-draft-fill"
                type="fill"
                paint={{ "fill-color": "#f97316", "fill-opacity": 0.15 }}
              />
            )}
            <Layer
              id="cm-draft-line"
              type="line"
              paint={{ "line-color": "#f97316", "line-width": 2, "line-dasharray": [6, 4] }}
            />
          </Source>
        )}
      </PollCityMap>

      {/* Layer toggle panel */}
      {showControls && (
        <div className="absolute right-3 top-3 z-10 w-56 rounded-xl bg-white/95 border border-slate-200 p-3 shadow-lg text-xs text-slate-700">
          <p className="font-semibold text-slate-900 mb-2">Layers</p>
          <div className="space-y-1.5">
            {([
              ["heat", "Support heat map"],
              ["doors", "Doors knocked"],
              ["universe", "Address universe"],
              ["turfs", "Turf boundaries"],
              ["signs", "Signs"],
              ["volunteers", "Volunteers live"],
              ["route", "Walking route"],
            ] as [keyof LayerToggles, string][]).map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layer[key]}
                  onChange={(e) => setLayer((prev) => ({ ...prev, [key]: e.target.checked }))}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          {mode === "canvassing" && (
            <button
              type="button"
              onClick={() => {
                setDrawMode((prev) => !prev);
                if (drawMode) setDraftPolygon([]);
              }}
              className="mt-3 w-full rounded-lg bg-blue-700 px-3 py-1.5 text-white hover:bg-blue-800"
            >
              {drawMode ? "Stop Drawing" : "Draw Turf"}
            </button>
          )}
          {mode === "canvassing" && drawMode && draftPolygon.length > 2 && (
            <button
              type="button"
              onClick={() => {
                const stats = computeAreaStats(Math.max(1, draftPolygon.length * 16));
                onTurfDraw?.(draftPolygon, stats);
                setSelectedStats(stats);
                setDrawMode(false);
              }}
              className="mt-2 w-full rounded-lg bg-emerald-700 px-3 py-1.5 text-white hover:bg-emerald-800"
            >
              Create Turf
            </button>
          )}
        </div>
      )}

      {/* Area calculator */}
      {(showCalculator || drawMode) && (
        <div className="absolute left-3 bottom-3 z-10 w-[290px] rounded-xl bg-white/95 border border-slate-200 p-3 shadow-lg text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Area Calculator</p>
          <p className="mt-2">This area: {selectedStats.doors} doors, about {selectedStats.estimatedHours} hrs, {selectedStats.volunteersNeeded} volunteers</p>
          <p className="mt-1">Knocked: {selectedStats.knocked} ({selectedStats.doors ? Math.round((selectedStats.knocked / selectedStats.doors) * 100) : 0}%)</p>
          <p className="mt-1">Supporters identified: {selectedStats.supporters}</p>
        </div>
      )}

      {/* Turf legend */}
      {!hideLegend && layer.turfs && (turfsDisplay?.features?.length ?? 0) > 0 && (
        <div className="absolute left-3 top-3 z-10 rounded-xl bg-white/95 border border-slate-200 p-2.5 shadow-lg text-xs text-slate-700">
          <p className="font-semibold text-slate-900 mb-1.5">Turf Status</p>
          <div className="space-y-1">
            {[
              ["#9ca3af", "Draft"],
              ["#3b82f6", "Assigned"],
              ["#f59e0b", "In progress"],
              ["#f97316", "Halfway"],
              ["#84cc16", "Nearly done"],
              ["#22c55e", "Completed"],
              ["#a855f7", "Reassigned"],
            ].map(([color, label]) => (
              <div key={label} className="flex items-center gap-2">
                <span className="inline-block w-3 h-3 rounded-sm flex-shrink-0" style={{ background: color }} />
                {label}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
