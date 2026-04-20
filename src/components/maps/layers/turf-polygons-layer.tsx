"use client";

import { useEffect, useState } from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface Props {
  campaignId: string;
  selectedTurfId?: string | null;
  onTurfClick?: (id: string) => void;
}

const STATUS_COLOR_EXPR = [
  "match",
  ["get", "status"],
  "completed",   "#22c55e",
  "reassigned",  "#a855f7",
  "in_progress", "#f59e0b",
  "assigned",    "#3b82f6",
  "#9ca3af",
];

export default function TurfPolygonsLayer({ campaignId, selectedTurfId }: Props) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch(`/api/maps/turfs-geojson?campaignId=${encodeURIComponent(campaignId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GeoJSON.FeatureCollection | null) => setGeojson(data))
      .catch(() => setGeojson(null));
  }, [campaignId]);

  if (!geojson) return null;

  const displayData: GeoJSON.FeatureCollection = {
    ...geojson,
    features: geojson.features.map((f) => ({
      ...f,
      properties: {
        ...(f.properties ?? {}),
        _selected: (f.properties?.id ?? "") === (selectedTurfId ?? "__none__"),
      },
    })),
  };

  return (
    <Source id="turfs" type="geojson" data={displayData}>
      <Layer
        id="turf-fill"
        type="fill"
        paint={{
          "fill-color": STATUS_COLOR_EXPR as never,
          "fill-opacity": [
            "case",
            ["==", ["get", "_selected"], true],
            0.35,
            0.12,
          ] as never,
        }}
      />
      <Layer
        id="turf-outline"
        type="line"
        paint={{
          "line-color": [
            "case",
            ["==", ["get", "_selected"], true],
            "#EF9F27",
            ...(STATUS_COLOR_EXPR as string[]),
          ] as never,
          "line-width": [
            "case",
            ["==", ["get", "_selected"], true],
            3,
            2,
          ] as never,
          "line-opacity": 0.8,
        }}
      />
    </Source>
  );
}

export type { Props as TurfPolygonsLayerProps };
