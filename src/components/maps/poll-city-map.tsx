"use client";

import { useCallback, useEffect, useRef } from "react";
import Map, {
  NavigationControl,
  ScaleControl,
  AttributionControl,
  Source,
  Layer,
} from "react-map-gl/maplibre";
import type { MapRef, MapMouseEvent } from "react-map-gl/maplibre";
import type { FillLayerSpecification, LineLayerSpecification, SymbolLayerSpecification } from "maplibre-gl";

const TILE_STYLE = "https://tiles.openfreemap.org/styles/liberty";

export type PollCityMapMode =
  | "turf"
  | "canvass"
  | "canvassing"
  | "gotv"
  | "signs"
  | "dashboard"
  | "analytics"
  | "walk"
  | "public";

export interface PollCityMapProps {
  campaignId?: string;
  mode?: PollCityMapMode;
  wardGeoJSON?: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
  children?: React.ReactNode;
  height?: string;
  initialViewState?: {
    longitude: number;
    latitude: number;
    zoom: number;
  };
  onMapClick?: (lngLat: { lng: number; lat: number }) => void;
  onMapReady?: (map: MapRef) => void;
  cursor?: string;
}

const DEFAULT_VIEW = {
  longitude: -79.3832,
  latitude: 43.6532,
  zoom: 12,
};

const wardFillLayer: Omit<FillLayerSpecification, "source"> = {
  id: "ward-fill",
  type: "fill",
  paint: {
    "fill-color": "#0A2342",
    "fill-opacity": 0.1,
  },
};

const wardLineLayer: Omit<LineLayerSpecification, "source"> = {
  id: "ward-line",
  type: "line",
  paint: {
    "line-color": "#0A2342",
    "line-opacity": 0.7,
    "line-width": 2,
  },
};

const wardLabelLayer: Omit<SymbolLayerSpecification, "source"> = {
  id: "ward-label",
  type: "symbol",
  layout: {
    "text-field": ["coalesce", ["get", "WARD_DESC"], ["get", "WARD_TEXT"], ""],
    "text-size": 14,
    "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
    "text-anchor": "center",
    "text-offset": [0, 0],
  },
  paint: {
    "text-color": "#0A2342",
    "text-halo-color": "#ffffff",
    "text-halo-width": 2,
  },
};

const councillorLabelLayer: Omit<SymbolLayerSpecification, "source"> = {
  id: "councillor-label",
  type: "symbol",
  layout: {
    "text-field": ["coalesce", ["get", "COUNCILOR"], ""],
    "text-size": 11,
    "text-font": ["Open Sans Regular", "Arial Unicode MS Regular"],
    "text-anchor": "center",
    "text-offset": [0, 1.5],
  },
  paint: {
    "text-color": "#334155",
    "text-halo-color": "#ffffff",
    "text-halo-width": 1.5,
  },
};

function normalizeToFeatureCollection(
  geojson: GeoJSON.FeatureCollection | GeoJSON.Feature | null | undefined,
): GeoJSON.FeatureCollection | null {
  if (!geojson) return null;
  if (geojson.type === "FeatureCollection") return geojson;
  if (geojson.type === "Feature") {
    return { type: "FeatureCollection", features: [geojson] };
  }
  return null;
}

export default function PollCityMap({
  wardGeoJSON,
  children,
  height = "100%",
  initialViewState,
  onMapClick,
  onMapReady,
  cursor = "grab",
}: PollCityMapProps) {
  const mapRef = useRef<MapRef>(null);

  const handleClick = useCallback(
    (e: MapMouseEvent) => {
      onMapClick?.({ lng: e.lngLat.lng, lat: e.lngLat.lat });
    },
    [onMapClick],
  );

  useEffect(() => {
    if (mapRef.current) {
      onMapReady?.(mapRef.current);
    }
  });

  const wardFC = normalizeToFeatureCollection(wardGeoJSON ?? null);

  return (
    <div style={{ height, width: "100%", minHeight: 400, position: "relative" }}>
      <Map
        ref={mapRef}
        initialViewState={initialViewState ?? DEFAULT_VIEW}
        mapStyle={TILE_STYLE}
        style={{ width: "100%", height: "100%" }}
        cursor={cursor}
        onClick={handleClick}
        attributionControl={false}
        reuseMaps
      >
        <NavigationControl position="top-right" />
        <ScaleControl position="bottom-right" />
        <AttributionControl
          position="bottom-left"
          customAttribution="© OpenFreeMap © OpenStreetMap contributors"
          compact
        />

        {wardFC && (
          <Source id="ward-boundary" type="geojson" data={wardFC}>
            <Layer {...wardFillLayer} />
            <Layer {...wardLineLayer} />
            <Layer {...wardLabelLayer} />
            <Layer {...councillorLabelLayer} />
          </Source>
        )}

        {children}
      </Map>
    </div>
  );
}
