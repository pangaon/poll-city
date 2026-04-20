"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";

const PollCityMap = dynamic(() => import("@/components/maps/poll-city-map"), { ssr: false });

interface ElectionFeatureProps {
  id: string;
  name: string | null;
  province: string | null;
  hasElectionData: boolean;
  jurisdiction?: string | null;
  candidateName?: string | null;
  percentage?: number | null;
  totalVotesCast?: number | null;
  votesReceived?: number | null;
  intensity?: number;
  bucket?: string;
}

interface GeoFeature {
  type: "Feature";
  properties: ElectionFeatureProps;
  geometry: object;
}

interface GeoJsonCollection {
  type: "FeatureCollection";
  features: GeoFeature[];
}

interface Props {
  geojson: GeoJsonCollection | null;
  year: string;
}

function bucketFillColor(pct: number, bucket: string): string {
  if (bucket === "dominant") return `rgba(30,58,138,${Math.min(0.9, 0.35 + (pct - 60) / 80)})`;
  if (bucket === "moderate") return `rgba(59,130,246,${Math.min(0.8, 0.25 + (pct - 40) / 100)})`;
  return `rgba(220,38,38,${Math.min(0.7, 0.15 + (60 - pct) / 120)})`;
}

function enrichGeoJSON(geojson: GeoJsonCollection): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: geojson.features.map((f) => {
      const p = f.properties;
      const pct = p.percentage ?? 0;
      const bucket = p.bucket ?? "no-data";
      const fillColor = !p.hasElectionData || bucket === "no-data"
        ? "#E5E7EB"
        : bucketFillColor(pct, bucket);
      return {
        ...f,
        properties: {
          ...p,
          _fillColor: fillColor,
          _label: p.hasElectionData
            ? `${p.name ?? ""} — ${p.candidateName ?? "—"} ${pct.toFixed(1)}%`
            : `${p.name ?? ""} — No ${p.province ?? ""} data`,
        },
      } as GeoJSON.Feature;
    }),
  };
}

function deriveInitialView(geojson: GeoJsonCollection): { longitude: number; latitude: number; zoom: number } {
  if (geojson.features.length === 0) return { longitude: -78.5, latitude: 44.2, zoom: 6 };
  return { longitude: -78.5, latitude: 44.2, zoom: 6 };
}

function ChoroplethMapInner({ geojson, year }: Props) {
  const enriched = useMemo(
    () => (geojson ? enrichGeoJSON(geojson) : null),
    [geojson],
  );
  const initialView = useMemo(
    () => (geojson ? deriveInitialView(geojson) : { longitude: -78.5, latitude: 44.2, zoom: 6 }),
    [geojson],
  );

  if (!geojson || geojson.features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center p-8">
        <div className="text-4xl mb-3">🗺️</div>
        <p className="font-semibold text-gray-700 mb-1">GIS Boundary Data Not Yet Loaded</p>
        <p className="text-sm text-gray-500 max-w-md">
          Run <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">npm run db:seed:boundaries:gis</code> to
          import Ontario municipal boundary polygons.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-100" style={{ height: 480 }}>
      <PollCityMap mode="analytics" initialViewState={initialView} height="100%">
        {enriched && (
          <Source id="choropleth" type="geojson" data={enriched}>
            <Layer
              id="choropleth-fill"
              type="fill"
              paint={{
                "fill-color": ["get", "_fillColor"] as never,
                "fill-opacity": 0.75,
              }}
            />
            <Layer
              id="choropleth-outline"
              type="line"
              paint={{
                "line-color": "#ffffff",
                "line-width": 1,
                "line-opacity": 0.8,
              }}
            />
          </Source>
        )}
      </PollCityMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur-sm rounded-lg shadow p-2.5 text-xs space-y-1">
        <p className="font-semibold text-gray-700 mb-1">Winner margin — {year}</p>
        {[
          { colour: "rgba(220,38,38,0.5)", label: "Close race (<40%)" },
          { colour: "rgba(59,130,246,0.6)", label: "Moderate (40–60%)" },
          { colour: "rgba(30,58,138,0.8)", label: "Dominant (>60%)" },
          { colour: "#E5E7EB", label: "No data" },
        ].map(({ colour, label }) => (
          <div key={label} className="flex items-center gap-2">
            <div className="w-4 h-3 rounded-sm border border-gray-200 flex-shrink-0" style={{ backgroundColor: colour }} />
            <span className="text-gray-600">{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function ChoroplethMap(props: Props) {
  return <ChoroplethMapInner {...props} />;
}
