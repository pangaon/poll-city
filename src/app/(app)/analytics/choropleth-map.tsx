"use client";
/**
 * ChoroplethMap — renders a real GIS choropleth map using Leaflet + GeoJSON boundaries.
 * Loaded dynamically with ssr:false from analytics-client.tsx.
 *
 * Falls back to a message box if no boundary data exists in the DB yet
 * (i.e., the GIS seed script has not been run).
 */
import { useEffect, useRef } from "react";

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

function bucketColour(bucket: string | undefined, percentage: number | null | undefined): string {
  const pct = percentage ?? 0;
  if (!bucket || bucket === "no-data") return "#E5E7EB";
  if (bucket === "dominant") return `rgba(30,58,138,${Math.min(0.9, 0.35 + (pct - 60) / 80)})`;
  if (bucket === "moderate") return `rgba(59,130,246,${Math.min(0.8, 0.25 + (pct - 40) / 100)})`;
  return `rgba(220,38,38,${Math.min(0.7, 0.15 + (60 - pct) / 120)})`;
}

export default function ChoroplethMap({ geojson, year }: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !mapRef.current) return;

    // Dynamically import Leaflet to avoid SSR issues
    import("leaflet").then((L) => {
      // Destroy previous instance if re-mounting
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }

      const map = L.map(mapRef.current!, {
        center: [44.2, -78.5], // Ontario centre
        zoom: 6,
        scrollWheelZoom: true,
      });

      mapInstanceRef.current = map;

      // Tile layer — OSM
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 18,
      }).addTo(map);

      if (!geojson || geojson.features.length === 0) return;

      // GeoJSON layer with choropleth styling
      const layer = L.geoJSON(
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        geojson as any,
        {
          style: (feature) => {
            const p = feature?.properties as ElectionFeatureProps | undefined;
            return {
              fillColor: bucketColour(p?.bucket, p?.percentage),
              weight: 1,
              opacity: 0.8,
              color: "#ffffff",
              fillOpacity: 0.75,
            };
          },
          onEachFeature: (feature, lyr) => {
            const p = feature.properties as ElectionFeatureProps;
            const tooltip = p.hasElectionData
              ? `<strong>${p.name}</strong><br>${p.candidateName ?? "—"}<br>${p.percentage?.toFixed(1) ?? "—"}% · ${p.totalVotesCast?.toLocaleString() ?? "—"} votes`
              : `<strong>${p.name}</strong><br>No ${year} election data`;
            lyr.bindTooltip(tooltip, { sticky: true });
          },
        }
      ).addTo(map);

      // Fit to bounds if features exist
      try {
        const bounds = layer.getBounds();
        if (bounds.isValid()) map.fitBounds(bounds, { padding: [20, 20] });
      } catch {
        // noop
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, [geojson, year]);

  if (!geojson || geojson.features.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-80 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center p-8">
        <div className="text-4xl mb-3">🗺️</div>
        <p className="font-semibold text-gray-700 mb-1">GIS Boundary Data Not Yet Loaded</p>
        <p className="text-sm text-gray-500 max-w-md">
          Run <code className="bg-gray-100 px-1.5 py-0.5 rounded text-xs font-mono">npm run db:seed:boundaries:gis</code> from
          Railway (requires network access to opendata.arcgis.com and represent.opennorth.ca) to import
          Ontario municipal boundary polygons. The heat grid below is available now.
        </p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden border border-gray-100" style={{ height: 480 }}>
      <link
        rel="stylesheet"
        href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
      />
      <div ref={mapRef} style={{ height: "100%", width: "100%" }} />
      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-[1000] bg-white/90 backdrop-blur-sm rounded-lg shadow p-2.5 text-xs space-y-1">
        <p className="font-semibold text-gray-700 mb-1">Winner margin</p>
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
