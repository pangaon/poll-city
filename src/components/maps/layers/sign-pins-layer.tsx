"use client";

import { useEffect, useState } from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface Props {
  campaignId: string;
}

export default function SignPinsLayer({ campaignId }: Props) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);

  useEffect(() => {
    fetch(`/api/maps/signs-geojson?campaignId=${encodeURIComponent(campaignId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GeoJSON.FeatureCollection | null) => setGeojson(data))
      .catch(() => setGeojson(null));
  }, [campaignId]);

  if (!geojson) return null;

  const statusColorExpr = [
    "match",
    ["get", "status"],
    "installed", "#1D9E75",
    "requested", "#EF9F27",
    "scheduled", "#3b82f6",
    "removed",   "#6b7280",
    "declined",  "#E24B4A",
    "#94a3b8",
  ];

  return (
    <Source id="signs" type="geojson" data={geojson} cluster clusterMaxZoom={14} clusterRadius={40}>
      {/* Clustered circles */}
      <Layer
        id="sign-clusters"
        type="circle"
        filter={["has", "point_count"]}
        paint={{
          "circle-color": "#1D9E75",
          "circle-radius": [
            "step",
            ["get", "point_count"],
            16, 10, 22, 50, 28,
          ] as never,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.9,
        }}
      />
      <Layer
        id="sign-cluster-count"
        type="symbol"
        filter={["has", "point_count"]}
        layout={{
          "text-field": ["get", "point_count_abbreviated"],
          "text-size": 12,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
        }}
        paint={{
          "text-color": "#ffffff",
        }}
      />

      {/* Individual pins */}
      <Layer
        id="sign-pins"
        type="circle"
        filter={["!", ["has", "point_count"]]}
        paint={{
          "circle-color": statusColorExpr as never,
          "circle-radius": 8,
          "circle-stroke-width": 2,
          "circle-stroke-color": "#ffffff",
          "circle-opacity": 0.95,
        }}
      />
    </Source>
  );
}
