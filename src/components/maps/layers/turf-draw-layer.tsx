"use client";

import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import type { ContactDot } from "@/components/maps/turf-draw-map";
import { SUPPORT_COLORS } from "@/components/maps/lib/map-utils";

interface Props {
  vertices: [number, number][];
  contacts: ContactDot[];
}

export default function TurfDrawLayer({ vertices, contacts }: Props) {
  const polygonGeoJSON = useMemo((): GeoJSON.FeatureCollection => {
    if (vertices.length < 2) {
      return { type: "FeatureCollection", features: [] };
    }
    const coords =
      vertices.length >= 3
        ? [...vertices, vertices[0]].map(([lat, lng]) => [lng, lat])
        : vertices.map(([lat, lng]) => [lng, lat]);
    const geomType = vertices.length >= 3 ? "Polygon" : "LineString";
    return {
      type: "FeatureCollection",
      features: [
        {
          type: "Feature",
          geometry:
            geomType === "Polygon"
              ? { type: "Polygon", coordinates: [coords] }
              : { type: "LineString", coordinates: coords },
          properties: {},
        },
      ],
    };
  }, [vertices]);

  const vertexGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: vertices.map(([lat, lng], i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [lng, lat] },
      properties: { isFirst: i === 0 },
    })),
  }), [vertices]);

  const contactGeoJSON = useMemo((): GeoJSON.FeatureCollection => ({
    type: "FeatureCollection",
    features: contacts.map((c) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [c.lng, c.lat] },
      properties: { supportLevel: c.supportLevel ?? "default" },
    })),
  }), [contacts]);

  const supportColorExpr = [
    "match",
    ["get", "supportLevel"],
    "strong_support", SUPPORT_COLORS.strong_support,
    "lean_support", SUPPORT_COLORS.lean_support,
    "undecided", SUPPORT_COLORS.undecided,
    "lean_oppose", SUPPORT_COLORS.lean_oppose,
    "strong_oppose", SUPPORT_COLORS.strong_oppose,
    SUPPORT_COLORS.default,
  ];

  return (
    <>
      {/* Contact dots */}
      <Source id="draw-contacts" type="geojson" data={contactGeoJSON}>
        <Layer
          id="draw-contact-dots"
          type="circle"
          paint={{
            "circle-color": supportColorExpr as never,
            "circle-radius": 5,
            "circle-opacity": 0.8,
            "circle-stroke-width": 1,
            "circle-stroke-color": "#ffffff",
          }}
        />
      </Source>

      {/* Polygon being drawn */}
      {vertices.length >= 2 && (
        <Source id="draw-polygon" type="geojson" data={polygonGeoJSON}>
          {vertices.length >= 3 && (
            <Layer
              id="draw-fill"
              type="fill"
              paint={{
                "fill-color": "#0A2342",
                "fill-opacity": 0.15,
              }}
            />
          )}
          <Layer
            id="draw-line"
            type="line"
            paint={{
              "line-color": "#0A2342",
              "line-width": 2.5,
              "line-dasharray": [6, 4],
            }}
          />
        </Source>
      )}

      {/* Vertex markers */}
      {vertices.length > 0 && (
        <Source id="draw-vertices" type="geojson" data={vertexGeoJSON}>
          <Layer
            id="draw-vertex-dots"
            type="circle"
            paint={{
              "circle-radius": ["case", ["get", "isFirst"], 7, 5] as never,
              "circle-color": ["case", ["get", "isFirst"], "#EF9F27", "#0A2342"] as never,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
        </Source>
      )}
    </>
  );
}
