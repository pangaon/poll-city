"use client";

import { useEffect, useState } from "react";
import { Source, Layer } from "react-map-gl/maplibre";

interface WardProgress {
  percent: number;
  knocked: number;
  total: number;
}

interface Props {
  campaignId: string;
  wardGeoJSON?: GeoJSON.Feature | GeoJSON.FeatureCollection | null;
}

function progressColor(pct: number): string {
  if (pct >= 80) return "#1D9E75";
  if (pct >= 40) return "#EF9F27";
  return "#E24B4A";
}

export default function WardProgressLayer({ campaignId, wardGeoJSON }: Props) {
  const [progress, setProgress] = useState<WardProgress | null>(null);

  useEffect(() => {
    fetch(`/api/maps/ward-progress?campaignId=${encodeURIComponent(campaignId)}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: WardProgress | null) => setProgress(data))
      .catch(() => setProgress(null));
  }, [campaignId]);

  if (!wardGeoJSON || !progress) return null;

  const pct = progress.percent ?? 0;
  const color = progressColor(pct);

  const fc: GeoJSON.FeatureCollection =
    wardGeoJSON.type === "FeatureCollection"
      ? wardGeoJSON
      : { type: "FeatureCollection", features: [wardGeoJSON as GeoJSON.Feature] };

  const progressFC: GeoJSON.FeatureCollection = {
    ...fc,
    features: fc.features.map((f) => ({
      ...f,
      properties: { ...(f.properties ?? {}), _progress: pct, _color: color },
    })),
  };

  return (
    <Source id="ward-progress" type="geojson" data={progressFC}>
      <Layer
        id="ward-progress-fill"
        type="fill"
        paint={{
          "fill-color": ["get", "_color"] as never,
          "fill-opacity": 0.12,
        }}
      />
      <Layer
        id="ward-progress-label"
        type="symbol"
        layout={{
          "text-field": [
            "concat",
            ["to-string", ["round", ["get", "_progress"]]],
            "% canvassed",
          ] as never,
          "text-size": 13,
          "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
          "text-anchor": "center",
        }}
        paint={{
          "text-color": color,
          "text-halo-color": "#ffffff",
          "text-halo-width": 2,
        }}
      />
    </Source>
  );
}
