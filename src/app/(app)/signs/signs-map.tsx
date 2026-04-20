"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";
import { Source, Layer } from "react-map-gl/maplibre";
import { CheckCircle2, Truck, XCircle } from "lucide-react";

const PollCityMap = dynamic(() => import("@/components/maps/poll-city-map"), { ssr: false });

type SignStatus = "requested" | "scheduled" | "installed" | "removed" | "declined";

interface SignPin {
  id: string;
  address1: string;
  city: string | null;
  lat: number | null;
  lng: number | null;
  signType: string;
  status: SignStatus;
  isOpponent: boolean;
  assignedTeam: string | null;
  quantity: number;
  contact: { firstName: string; lastName: string } | null;
}

interface Props {
  signs: SignPin[];
  onStatusChange: (id: string, data: Record<string, unknown>) => Promise<void>;
}

const STATUS_COLORS: Record<SignStatus, string> = {
  requested: "#EF9F27",
  scheduled: "#3b82f6",
  installed: "#1D9E75",
  removed: "#6b7280",
  declined: "#E24B4A",
};

function signsToGeoJSON(signs: SignPin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: signs
      .filter((s) => s.lat != null && s.lng != null)
      .map((s) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: [s.lng!, s.lat!] },
        properties: {
          id: s.id,
          address1: s.address1,
          city: s.city ?? "",
          status: s.status,
          isOpponent: s.isOpponent,
          signType: s.signType,
          assignedTeam: s.assignedTeam ?? "",
          contactName: s.contact ? `${s.contact.firstName} ${s.contact.lastName}` : "",
          color: s.isOpponent ? "#dc2626" : (STATUS_COLORS[s.status] ?? "#6b7280"),
        },
      })),
  };
}

function deriveCenter(signs: SignPin[]): { longitude: number; latitude: number; zoom: number } {
  const geo = signs.filter((s) => s.lat != null && s.lng != null);
  if (geo.length === 0) return { longitude: -79.3832, latitude: 43.6532, zoom: 13 };
  const lng = geo.reduce((s, p) => s + p.lng!, 0) / geo.length;
  const lat = geo.reduce((s, p) => s + p.lat!, 0) / geo.length;
  return { longitude: lng, latitude: lat, zoom: 13 };
}

function SignsMapInner({ signs, onStatusChange }: Props) {
  const geoSigns = useMemo(() => signs.filter((s) => s.lat != null && s.lng != null), [signs]);
  const geojson = useMemo(() => signsToGeoJSON(signs), [signs]);
  const center = useMemo(() => deriveCenter(signs), [signs]);

  if (geoSigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
        </svg>
        <p className="text-sm font-medium">No geocoded signs</p>
        <p className="text-xs mt-1">Signs need lat/lng coordinates to appear on the map.</p>
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden" style={{ height: 500 }}>
      <PollCityMap initialViewState={center} height="100%" mode="signs">
        <Source id="signs-data" type="geojson" data={geojson} cluster clusterMaxZoom={14} clusterRadius={40}>
          <Layer
            id="signs-clusters"
            type="circle"
            filter={["has", "point_count"]}
            paint={{
              "circle-color": "#1D9E75",
              "circle-radius": ["step", ["get", "point_count"], 16, 10, 22, 50, 28] as never,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
            }}
          />
          <Layer
            id="signs-cluster-count"
            type="symbol"
            filter={["has", "point_count"]}
            layout={{
              "text-field": ["get", "point_count_abbreviated"],
              "text-size": 12,
              "text-font": ["Open Sans Bold", "Arial Unicode MS Bold"],
            }}
            paint={{ "text-color": "#ffffff" }}
          />
          <Layer
            id="signs-pins"
            type="circle"
            filter={["!", ["has", "point_count"]]}
            paint={{
              "circle-color": ["get", "color"] as never,
              "circle-radius": 9,
              "circle-stroke-width": 2,
              "circle-stroke-color": "#ffffff",
              "circle-opacity": 0.95,
            }}
          />
        </Source>
      </PollCityMap>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white/90 backdrop-blur rounded-lg shadow p-2.5 text-xs space-y-1">
        {(Object.entries(STATUS_COLORS) as [SignStatus, string][]).map(([status, color]) => (
          <div key={status} className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ background: color }} />
            <span className="capitalize text-slate-700">{status}</span>
          </div>
        ))}
      </div>

      {/* Quick-action buttons for each sign (rendered as overlay list) */}
      <div className="absolute top-3 right-3 z-10 max-h-72 overflow-y-auto space-y-1 w-52">
        {geoSigns.slice(0, 8).map((sign) => (
          <div key={sign.id} className="bg-white/90 backdrop-blur rounded-lg p-2 shadow text-xs">
            <p className="font-semibold text-slate-900 truncate">{sign.address1}</p>
            <div className="flex gap-1 mt-1">
              {(sign.status === "requested" || sign.status === "scheduled") && (
                <button
                  type="button"
                  onClick={() => void onStatusChange(sign.id, { status: "installed" })}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-emerald-600 text-white rounded hover:bg-emerald-700"
                >
                  <CheckCircle2 className="w-3 h-3" /> Install
                </button>
              )}
              {sign.status === "requested" && (
                <button
                  type="button"
                  onClick={() => void onStatusChange(sign.id, { status: "scheduled" })}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Truck className="w-3 h-3" /> Schedule
                </button>
              )}
              {sign.status === "installed" && (
                <button
                  type="button"
                  onClick={() => void onStatusChange(sign.id, { status: "removed" })}
                  className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-gray-600 text-white rounded hover:bg-gray-700"
                >
                  <XCircle className="w-3 h-3" /> Remove
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function SignsMap(props: Props) {
  return <SignsMapInner {...props} />;
}
