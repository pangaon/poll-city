"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";

const PollCityMap = dynamic(() => import("@/components/maps/poll-city-map"), { ssr: false });

export interface MapStop {
  id: string;
  lat: number;
  lng: number;
  label: string;
  visited: boolean;
  order: number;
}

export interface CanvasserPin {
  userId: string;
  name: string;
  lat: number;
  lng: number;
  updatedAt: string;
}

interface Props {
  stops?: MapStop[];
  canvassers?: CanvasserPin[];
  showRoute?: boolean;
  height?: string;
  center?: [number, number];
  zoom?: number;
}

function buildRouteGeoJSON(stops: MapStop[]): GeoJSON.FeatureCollection {
  const sorted = [...stops].sort((a, b) => a.order - b.order);
  return {
    type: "FeatureCollection",
    features: [
      {
        type: "Feature",
        geometry: {
          type: "LineString",
          coordinates: sorted.map((s) => [s.lng, s.lat]),
        },
        properties: {},
      },
    ],
  };
}

function buildStopsGeoJSON(stops: MapStop[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: stops.map((s) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: {
        id: s.id,
        label: s.label,
        visited: s.visited,
        order: s.order + 1,
        color: s.visited ? "#10b981" : "#1e40af",
      },
    })),
  };
}

function buildCanvasserGeoJSON(canvassers: CanvasserPin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: canvassers.map((c) => {
      const initials = c.name
        .split(" ")
        .map((w) => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: { userId: c.userId, name: c.name, initials },
      };
    }),
  };
}

function deriveCenter(
  stops: MapStop[],
  canvassers: CanvasserPin[],
  center?: [number, number],
): { longitude: number; latitude: number; zoom: number } {
  if (center) return { latitude: center[0], longitude: center[1], zoom: 15 };
  const allPoints = [
    ...stops.map((s) => ({ lat: s.lat, lng: s.lng })),
    ...canvassers.map((c) => ({ lat: c.lat, lng: c.lng })),
  ];
  if (allPoints.length === 0) return { longitude: -79.3832, latitude: 43.6532, zoom: 15 };
  const lat = allPoints.reduce((s, p) => s + p.lat, 0) / allPoints.length;
  const lng = allPoints.reduce((s, p) => s + p.lng, 0) / allPoints.length;
  return { latitude: lat, longitude: lng, zoom: 15 };
}

export default function TurfMap({
  stops = [],
  canvassers = [],
  showRoute = true,
  height = "400px",
  center,
  zoom = 15,
}: Props) {
  const initialViewState = useMemo(() => {
    const derived = deriveCenter(stops, canvassers, center);
    return { ...derived, zoom };
  }, [stops, canvassers, center, zoom]);

  const routeFC = useMemo(() => buildRouteGeoJSON(stops), [stops]);
  const stopsFC = useMemo(() => buildStopsGeoJSON(stops), [stops]);
  const canvasserFC = useMemo(() => buildCanvasserGeoJSON(canvassers), [canvassers]);

  return (
    <div style={{ height, width: "100%", borderRadius: 12, overflow: "hidden" }}>
      <PollCityMap mode="turf" initialViewState={initialViewState} height="100%">
        {/* Walk route */}
        {showRoute && stops.length > 1 && (
          <Source id="turf-route" type="geojson" data={routeFC}>
            <Layer
              id="turf-route-line"
              type="line"
              paint={{
                "line-color": "#1e40af",
                "line-width": 2.5,
                "line-opacity": 0.7,
                "line-dasharray": [6, 4],
              }}
            />
          </Source>
        )}

        {/* Stop markers */}
        {stops.length > 0 && (
          <Source id="turf-stops" type="geojson" data={stopsFC}>
            <Layer
              id="turf-stop-circles"
              type="circle"
              paint={{
                "circle-color": ["get", "color"] as never,
                "circle-radius": 14,
                "circle-stroke-width": 2.5,
                "circle-stroke-color": ["case", ["get", "visited"], "#065f46", "#1e3a8a"] as never,
              }}
            />
            <Layer
              id="turf-stop-labels"
              type="symbol"
              layout={{
                "text-field": ["to-string", ["get", "order"]] as never,
                "text-size": 10,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-anchor": "center",
              }}
              paint={{ "text-color": "#ffffff" }}
            />
          </Source>
        )}

        {/* Canvasser GPS pins */}
        {canvassers.length > 0 && (
          <Source id="turf-canvassers" type="geojson" data={canvasserFC}>
            <Layer
              id="turf-canvasser-circles"
              type="circle"
              paint={{
                "circle-color": "#f59e0b",
                "circle-radius": 16,
                "circle-stroke-width": 3,
                "circle-stroke-color": "#92400e",
              }}
            />
            <Layer
              id="turf-canvasser-labels"
              type="symbol"
              layout={{
                "text-field": ["get", "initials"],
                "text-size": 10,
                "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
                "text-anchor": "center",
              }}
              paint={{ "text-color": "#1c1917" }}
            />
          </Source>
        )}
      </PollCityMap>
    </div>
  );
}
