"use client";

import { useEffect, useState, useCallback } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { CircleLayerSpecification, HeatmapLayerSpecification } from "maplibre-gl";
import { buildSupportExpression } from "@/components/maps/lib/map-utils";

interface Props {
  campaignId: string;
  showHeatmap?: boolean;
  filterSupport?: string[];
  onContactClick?: (contactId: string) => void;
}

const dotLayer: Omit<CircleLayerSpecification, "source"> = {
  id: "contact-dots",
  type: "circle",
  paint: {
    "circle-color": buildSupportExpression(),
    "circle-radius": [
      "interpolate",
      ["linear"],
      ["zoom"],
      10, 3,
      14, 6,
    ],
    "circle-opacity": 0.85,
    "circle-stroke-width": 1,
    "circle-stroke-color": "#ffffff",
  },
};

const heatLayer: Omit<HeatmapLayerSpecification, "source"> = {
  id: "contact-heat",
  type: "heatmap",
  maxzoom: 15,
  paint: {
    "heatmap-weight": [
      "match",
      ["get", "supportLevel"],
      "strong_support", 1.0,
      "lean_support", 0.7,
      "undecided", 0.4,
      "lean_oppose", 0.3,
      "strong_oppose", 0.2,
      0.3,
    ],
    "heatmap-radius": 20,
    "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 11, 0.8, 15, 0.3],
  },
};

export default function ContactDotsLayer({ campaignId, showHeatmap = false, onContactClick }: Props) {
  const [geojson, setGeojson] = useState<GeoJSON.FeatureCollection | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/maps/contacts-geojson?campaignId=${encodeURIComponent(campaignId)}&take=10000`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: GeoJSON.FeatureCollection | null) => {
        setGeojson(data);
      })
      .catch(() => setGeojson(null))
      .finally(() => setLoading(false));
  }, [campaignId]);

  if (loading || !geojson) return null;

  return (
    <Source id="contacts" type="geojson" data={geojson}>
      {showHeatmap && <Layer {...heatLayer} />}
      <Layer {...dotLayer} />
    </Source>
  );
}
