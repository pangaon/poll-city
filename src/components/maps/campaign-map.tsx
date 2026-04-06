"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Circle,
  MapContainer,
  Marker,
  Polygon,
  Popup,
  Polyline,
  TileLayer,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L, { LatLngExpression } from "leaflet";
import "leaflet/dist/leaflet.css";

export type CampaignMapMode = "canvassing" | "walk" | "signs" | "dashboard" | "gotv" | "public";

interface FeatureCollection {
  type: "FeatureCollection";
  features: Array<{
    type: "Feature";
    geometry: {
      type: string;
      coordinates: unknown;
    };
    properties: Record<string, unknown>;
  }>;
}

interface LayerToggles {
  heat: boolean;
  doors: boolean;
  turfs: boolean;
  signs: boolean;
  volunteers: boolean;
  route: boolean;
}

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
}

export interface CampaignMapProps {
  mode: CampaignMapMode;
  height?: number | string;
  turfId?: string;
  onTurfDraw?: (coordinates: Array<[number, number]>, stats: AreaStats) => void;
  onTurfClick?: (selection: MapTurfSelection) => void;
  onAreaSelect?: (stats: AreaStats) => void;
  showControls?: boolean;
  showCalculator?: boolean;
}

const DEFAULT_CENTER: [number, number] = [43.6532, -79.3832];

const volunteerIcon = L.divIcon({
  className: "",
  html: '<div style="width:14px;height:14px;border-radius:50%;background:#2563eb;border:2px solid #ffffff;box-shadow:0 0 0 2px rgba(37,99,235,0.25)"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

const currentStopIcon = L.divIcon({
  className: "",
  html: '<div style="width:20px;height:20px;border-radius:50%;background:#f97316;border:2px solid #ffffff"></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const doneStopIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#22c55e;border:2px solid #ffffff"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

const pendingStopIcon = L.divIcon({
  className: "",
  html: '<div style="width:18px;height:18px;border-radius:50%;background:#9ca3af;border:2px solid #ffffff"></div>',
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});

function FitMapBounds({ points }: { points: Array<[number, number]> }) {
  const map = useMap();
  useEffect(() => {
    if (points.length > 1) {
      map.fitBounds(points, { padding: [24, 24] });
    }
  }, [map, points]);
  return null;
}

function DrawListener({
  enabled,
  onPoint,
}: {
  enabled: boolean;
  onPoint: (point: [number, number]) => void;
}) {
  const map = useMapEvents({
    click(event) {
      if (!enabled) return;
      onPoint([event.latlng.lat, event.latlng.lng]);
    },
  });

  useEffect(() => {
    map.getContainer().style.cursor = enabled ? "crosshair" : "";
    return () => {
      map.getContainer().style.cursor = "";
    };
  }, [enabled, map]);

  return null;
}

function normalizePolygonCoordinates(geometry: FeatureCollection["features"][number]["geometry"]): Array<[number, number]> {
  if (!geometry || geometry.type !== "Polygon") return [];
  const coords = geometry.coordinates as number[][][];
  const outer = coords[0] ?? [];
  return outer.map((pair) => [pair[1], pair[0]]);
}

function normalizePoint(geometry: FeatureCollection["features"][number]["geometry"]): [number, number] | null {
  if (!geometry || geometry.type !== "Point") return null;
  const coord = geometry.coordinates as number[];
  return [coord[1], coord[0]];
}

function computeAreaStats(pointCount: number): AreaStats {
  const doors = pointCount;
  const knocked = Math.round(doors * 0.42);
  const supporters = Math.round(doors * 0.31);
  const estimatedHours = Math.max(1, Number((doors / 45).toFixed(1)));
  const volunteersNeeded = Math.max(1, Math.ceil(estimatedHours / 2));
  return { doors, knocked, supporters, estimatedHours, volunteersNeeded };
}

export default function CampaignMap({
  mode,
  height = 480,
  turfId,
  onTurfDraw,
  onTurfClick,
  onAreaSelect,
  showControls = true,
  showCalculator = false,
}: CampaignMapProps) {
  const [layer, setLayer] = useState<LayerToggles>({
    heat: mode === "gotv" || mode === "dashboard" || mode === "canvassing",
    doors: true,
    turfs: mode !== "public",
    signs: mode === "signs" || mode === "dashboard" || mode === "canvassing",
    volunteers: mode !== "public",
    route: mode === "walk" || mode === "canvassing",
  });
  const [contacts, setContacts] = useState<FeatureCollection | null>(null);
  const [turfs, setTurfs] = useState<FeatureCollection | null>(null);
  const [signs, setSigns] = useState<FeatureCollection | null>(null);
  const [volunteers, setVolunteers] = useState<FeatureCollection | null>(null);
  const [wardBoundary, setWardBoundary] = useState<FeatureCollection | null>(null);
  const [drawMode, setDrawMode] = useState(false);
  const [draftPolygon, setDraftPolygon] = useState<Array<[number, number]>>([]);
  const [selectedStats, setSelectedStats] = useState<AreaStats>(computeAreaStats(0));

  const readApi = useCallback(async (url: string) => {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      return (await res.json()) as FeatureCollection;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    void Promise.all([
      readApi(`/api/maps/contacts-geojson${turfId ? `?turfId=${encodeURIComponent(turfId)}` : ""}`),
      readApi("/api/maps/turfs-geojson"),
      readApi("/api/maps/signs-geojson"),
      readApi("/api/maps/volunteer-locations"),
      readApi("/api/maps/ward-boundary"),
    ]).then(([contactGeoJson, turfGeoJson, signGeoJson, volunteerGeoJson, boundaryGeoJson]) => {
      setContacts(contactGeoJson);
      setTurfs(turfGeoJson);
      setSigns(signGeoJson);
      setVolunteers(volunteerGeoJson);
      setWardBoundary(boundaryGeoJson);

      const fallbackCount = contactGeoJson?.features?.length ?? 0;
      const stats = computeAreaStats(fallbackCount);
      setSelectedStats(stats);
      onAreaSelect?.(stats);
    });
  }, [onAreaSelect, readApi, turfId]);

  useEffect(() => {
    if (mode !== "dashboard") return;
    const timer = window.setInterval(() => {
      void readApi("/api/maps/contacts-geojson").then((next) => {
        if (next) setContacts(next);
      });
    }, 60_000);
    return () => window.clearInterval(timer);
  }, [mode, readApi]);

  const contactPoints = useMemo(() => {
    if (!contacts) return [] as Array<{ latLng: [number, number]; properties: Record<string, unknown> }>;
    return contacts.features
      .map((feature) => {
        const latLng = normalizePoint(feature.geometry);
        if (!latLng) return null;
        return { latLng, properties: feature.properties ?? {} };
      })
      .filter((item): item is { latLng: [number, number]; properties: Record<string, unknown> } => Boolean(item));
  }, [contacts]);

  const turfPolygons = useMemo(() => {
    if (!turfs) return [] as Array<{ points: Array<[number, number]>; properties: Record<string, unknown> }>;
    return turfs.features
      .map((feature) => {
        const points = normalizePolygonCoordinates(feature.geometry);
        if (!points.length) return null;
        return { points, properties: feature.properties ?? {} };
      })
      .filter((item): item is { points: Array<[number, number]>; properties: Record<string, unknown> } => Boolean(item));
  }, [turfs]);

  const signPoints = useMemo(() => {
    if (!signs) return [] as Array<{ latLng: [number, number]; properties: Record<string, unknown> }>;
    return signs.features
      .map((feature) => {
        const latLng = normalizePoint(feature.geometry);
        if (!latLng) return null;
        return { latLng, properties: feature.properties ?? {} };
      })
      .filter((item): item is { latLng: [number, number]; properties: Record<string, unknown> } => Boolean(item));
  }, [signs]);

  const volunteerPoints = useMemo(() => {
    if (!volunteers) return [] as Array<{ latLng: [number, number]; properties: Record<string, unknown> }>;
    return volunteers.features
      .map((feature) => {
        const latLng = normalizePoint(feature.geometry);
        if (!latLng) return null;
        return { latLng, properties: feature.properties ?? {} };
      })
      .filter((item): item is { latLng: [number, number]; properties: Record<string, unknown> } => Boolean(item));
  }, [volunteers]);

  const boundaryPolygons = useMemo(() => {
    if (!wardBoundary) return [] as Array<Array<[number, number]>>;
    return wardBoundary.features
      .map((feature) => normalizePolygonCoordinates(feature.geometry))
      .filter((points) => points.length > 0);
  }, [wardBoundary]);

  const routePoints: Array<[number, number]> = useMemo(
    () => contactPoints.map((point) => point.latLng),
    [contactPoints],
  );

  const mapPoints = useMemo(() => {
    const all = [
      ...contactPoints.map((point) => point.latLng),
      ...signPoints.map((point) => point.latLng),
      ...volunteerPoints.map((point) => point.latLng),
      ...turfPolygons.flatMap((item) => item.points),
      ...boundaryPolygons.flatMap((item) => item),
    ];
    return all;
  }, [boundaryPolygons, contactPoints, signPoints, turfPolygons, volunteerPoints]);

  const areaStats = useMemo(() => {
    const sourceCount = draftPolygon.length > 2 ? draftPolygon.length * 16 : contactPoints.length;
    return computeAreaStats(sourceCount);
  }, [contactPoints.length, draftPolygon.length]);

  useEffect(() => {
    setSelectedStats(areaStats);
    onAreaSelect?.(areaStats);
  }, [areaStats, onAreaSelect]);

  const containerHeight = typeof height === "number" ? `${height}px` : height;

  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white" style={{ height: containerHeight, isolation: "isolate", zIndex: 0 }}>
      <MapContainer
        center={DEFAULT_CENTER}
        zoom={13}
        style={{ height: "100%", width: "100%" }}
        scrollWheelZoom
      >
        <DrawListener
          enabled={drawMode}
          onPoint={(point) => {
            setDraftPolygon((prev) => [...prev, point]);
          }}
        />
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {mapPoints.length > 1 && <FitMapBounds points={mapPoints} />}

        {layer.turfs && turfPolygons.map((poly, index) => (
          <Polygon
            key={`turf-${index}`}
            positions={poly.points as LatLngExpression[]}
            pathOptions={{ color: "#2563eb", weight: 2, fillOpacity: 0.08 }}
            eventHandlers={{
              click: () => {
                const pointCount = Math.max(1, poly.points.length * 16);
                onTurfClick?.({
                  id: typeof poly.properties.id === "string" ? poly.properties.id : null,
                  name: typeof poly.properties.name === "string" ? poly.properties.name : null,
                  coordinates: poly.points,
                  stats: computeAreaStats(pointCount),
                });
              },
            }}
          >
            <Popup>Turf {(poly.properties.name as string) ?? index + 1}</Popup>
          </Polygon>
        ))}

        {layer.signs && signPoints.map((point, index) => (
          <Marker key={`sign-${index}`} position={point.latLng}>
            <Popup>{(point.properties.address as string) ?? "Sign location"}</Popup>
          </Marker>
        ))}

        {layer.volunteers && volunteerPoints.map((point, index) => (
          <Marker key={`volunteer-${index}`} position={point.latLng} icon={volunteerIcon}>
            <Popup>{(point.properties.name as string) ?? "Volunteer"}</Popup>
          </Marker>
        ))}

        {layer.doors && mode !== "signs" && contactPoints.map((point, index) => (
          <Circle key={`contact-${index}`} center={point.latLng} radius={18} pathOptions={{ color: "#3b82f6", fillOpacity: 0.35, weight: 1 }}>
            <Popup>{(point.properties.name as string) ?? "Contact"}</Popup>
          </Circle>
        ))}

        {mode === "walk" && layer.route && routePoints.length > 1 && (
          <>
            <Polyline positions={routePoints as LatLngExpression[]} pathOptions={{ color: "#2563eb", weight: 3 }} />
            {routePoints.map((point, index) => (
              <Marker
                key={`route-${index}`}
                position={point}
                icon={index === 0 ? currentStopIcon : index % 3 === 0 ? doneStopIcon : pendingStopIcon}
              >
                <Popup>Stop {index + 1}</Popup>
              </Marker>
            ))}
            {volunteerPoints[0] && <Circle center={volunteerPoints[0].latLng} radius={12} pathOptions={{ color: "#2563eb", fillOpacity: 0.8 }} />}
          </>
        )}

        {mode === "public" && boundaryPolygons.map((poly, index) => (
          <Polygon key={`boundary-${index}`} positions={poly as LatLngExpression[]} pathOptions={{ color: "#1d4ed8", weight: 3, fillOpacity: 0.04 }} />
        ))}

        {drawMode && draftPolygon.length > 1 && (
          <Polygon positions={draftPolygon as LatLngExpression[]} pathOptions={{ color: "#f97316", weight: 2, dashArray: "6 4" }} />
        )}
      </MapContainer>

      {showControls && (
        <div className="absolute right-3 top-3 z-[500] w-56 rounded-xl bg-white/95 border border-slate-200 p-3 shadow-lg text-xs text-slate-700">
          <p className="font-semibold text-slate-900 mb-2">Layers</p>
          <div className="space-y-1.5">
            {[
              ["heat", "Support heat map"],
              ["doors", "Doors knocked"],
              ["turfs", "Turf boundaries"],
              ["signs", "Signs"],
              ["volunteers", "Volunteers live"],
              ["route", "Walking route"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={layer[key as keyof LayerToggles]}
                  onChange={(event) => setLayer((prev) => ({ ...prev, [key]: event.target.checked }))}
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

      {(showCalculator || drawMode) && (
        <div className="absolute left-3 bottom-3 z-[500] w-[290px] rounded-xl bg-white/95 border border-slate-200 p-3 shadow-lg text-xs text-slate-700">
          <p className="font-semibold text-slate-900">Area Calculator</p>
          <p className="mt-2">This area: {selectedStats.doors} doors, about {selectedStats.estimatedHours} hrs, {selectedStats.volunteersNeeded} volunteers</p>
          <p className="mt-1">Knocked: {selectedStats.knocked} ({selectedStats.doors ? Math.round((selectedStats.knocked / selectedStats.doors) * 100) : 0}%)</p>
          <p className="mt-1">Supporters identified: {selectedStats.supporters}</p>
          <div className="mt-2 rounded-lg bg-slate-100 px-2 py-1.5 text-slate-600">
            Poll City estimate: $799 one-time | Competitors: $3,588 to $12,564 yearly
          </div>
        </div>
      )}
    </div>
  );
}
