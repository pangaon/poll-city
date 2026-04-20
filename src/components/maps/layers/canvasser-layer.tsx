"use client";

import { useEffect, useState, useCallback } from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface CanvasserPinResponse {
  contacts?: unknown[];
  signs?: unknown[];
}

interface CanvasserFeatureProps {
  userId?: string;
  name?: string;
  updatedAt?: string;
  initials?: string;
  isRecent?: boolean;
}

interface Props {
  campaignId: string;
  liveMode?: boolean;
}

function buildCanvasserGeoJSON(data: Record<string, unknown>): GeoJSON.FeatureCollection {
  const pins = (data.canvassers as Array<{
    userId: string;
    name: string;
    lat: number;
    lng: number;
    updatedAt: string;
  }> | undefined) ?? [];

  return {
    type: "FeatureCollection",
    features: pins.map((p) => {
      const mins = Math.round((Date.now() - new Date(p.updatedAt).getTime()) / 60000);
      const initials = p.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [p.lng, p.lat] },
        properties: {
          userId: p.userId,
          name: p.name,
          updatedAt: p.updatedAt,
          initials,
          isRecent: mins < 5,
        } satisfies CanvasserFeatureProps,
      };
    }),
  };
}

export default function CanvasserLayer({ campaignId, liveMode = false }: Props) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  const load = useCallback(() => {
    fetch(`/api/maps/volunteer-locations?campaignId=${encodeURIComponent(campaignId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: Record<string, unknown> | CanvasserPinResponse | null) => {
        if (data && typeof data === "object") {
          setGeojson(buildCanvasserGeoJSON(data as Record<string, unknown>));
        }
      })
      .catch(() => setGeojson(null));
  }, [campaignId]);

  useEffect(() => {
    load();
    if (!liveMode) return;
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load, liveMode]);

  if (!geojson) return null;

  return (
    <Source id="canvassers" type="geojson" data={geojson}>
      <Layer
        id="canvasser-pins"
        type="circle"
        paint={{
          "circle-color": "#f59e0b",
          "circle-radius": 10,
          "circle-stroke-width": 2.5,
          "circle-stroke-color": "#92400e",
          "circle-opacity": 0.95,
        }}
      />
      <Layer
        id="canvasser-labels"
        type="symbol"
        layout={{
          "text-field": ["get", "initials"],
          "text-size": 10,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-anchor": "center",
        }}
        paint={{
          "text-color": "#1c1917",
        }}
      />
    </Source>
  );
}
