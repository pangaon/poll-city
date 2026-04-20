"use client";

import dynamic from "next/dynamic";

const PollCityMap = dynamic(() => import("@/components/maps/poll-city-map"), { ssr: false });

type Point = { id: string; label: string; lat: number; lng: number };

interface CandidateWardMapProps {
  boundaryGeoJSON: unknown;
  eventPoints: Point[];
  officePoint: { lat: number; lng: number } | null;
}

function toFeatureCollection(boundaryGeoJSON: unknown): GeoJSON.FeatureCollection | null {
  if (!boundaryGeoJSON || typeof boundaryGeoJSON !== "object") return null;
  const obj = boundaryGeoJSON as Record<string, unknown>;

  if (obj.type === "FeatureCollection") {
    return obj as unknown as GeoJSON.FeatureCollection;
  }
  if (obj.type === "Feature") {
    return {
      type: "FeatureCollection",
      features: [obj as unknown as GeoJSON.Feature],
    };
  }
  if (obj.type === "Polygon" || obj.type === "MultiPolygon") {
    return {
      type: "FeatureCollection",
      features: [{ type: "Feature", geometry: obj as unknown as GeoJSON.Geometry, properties: {} }],
    };
  }
  return null;
}

function deriveCenter(
  boundaryGeoJSON: unknown,
  eventPoints: Point[],
  officePoint: { lat: number; lng: number } | null,
): { longitude: number; latitude: number; zoom: number } {
  const ep = eventPoints[0];
  const op = officePoint;
  if (ep) return { longitude: ep.lng, latitude: ep.lat, zoom: 12 };
  if (op) return { longitude: op.lng, latitude: op.lat, zoom: 12 };

  const obj = boundaryGeoJSON as Record<string, unknown> | null;
  if (obj?.type === "Feature") {
    const geom = (obj as { geometry?: { coordinates?: unknown[] } }).geometry;
    const ring = geom?.coordinates?.[0] as number[][] | undefined;
    if (ring?.length) {
      const lngs = ring.map((p) => p[0]);
      const lats = ring.map((p) => p[1]);
      return {
        longitude: lngs.reduce((a, b) => a + b, 0) / lngs.length,
        latitude: lats.reduce((a, b) => a + b, 0) / lats.length,
        zoom: 12,
      };
    }
  }
  return { longitude: -79.3832, latitude: 43.6532, zoom: 12 };
}

export default function CandidateWardMap({
  boundaryGeoJSON,
  eventPoints,
  officePoint,
}: CandidateWardMapProps) {
  const wardFC = toFeatureCollection(boundaryGeoJSON);
  const initialViewState = deriveCenter(boundaryGeoJSON, eventPoints, officePoint);

  return (
    <div className="h-[300px] md:h-[420px] w-full rounded-xl overflow-hidden">
      <PollCityMap
        mode="public"
        wardGeoJSON={wardFC}
        initialViewState={initialViewState}
        height="100%"
      />
    </div>
  );
}
