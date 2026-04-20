"use client";

import dynamic from "next/dynamic";
import { useCallback } from "react";
import TurfDrawLayer from "@/components/maps/layers/turf-draw-layer";

const PollCityMap = dynamic(() => import("@/components/maps/poll-city-map"), { ssr: false });

export interface ContactDot {
  id: string;
  lat: number;
  lng: number;
  supportLevel: string | null;
}

interface Props {
  contacts: ContactDot[];
  vertices: [number, number][];
  center?: [number, number];
  zoom?: number;
  onAddVertex: (latlng: [number, number]) => void;
  wardGeoJSON?: GeoJSON.FeatureCollection | GeoJSON.Feature | null;
}

export default function TurfDrawMap({
  contacts,
  vertices,
  center = [43.6532, -79.3832],
  zoom = 13,
  onAddVertex,
  wardGeoJSON,
}: Props) {
  const handleMapClick = useCallback(
    (lngLat: { lng: number; lat: number }) => {
      onAddVertex([lngLat.lat, lngLat.lng]);
    },
    [onAddVertex],
  );

  return (
    <div style={{ height: 360, position: "relative", borderRadius: 8, overflow: "hidden" }}>
      {/* Draw mode instruction */}
      <div className="pointer-events-none absolute top-3 left-1/2 -translate-x-1/2 z-10 rounded-full bg-slate-900/80 px-4 py-1.5 text-xs font-semibold text-white backdrop-blur">
        Click to place points · Double-click to close
      </div>

      <PollCityMap
        mode="turf"
        wardGeoJSON={wardGeoJSON}
        initialViewState={{
          latitude: center[0],
          longitude: center[1],
          zoom,
        }}
        height="100%"
        cursor="crosshair"
        onMapClick={handleMapClick}
      >
        <TurfDrawLayer vertices={vertices} contacts={contacts} />
      </PollCityMap>
    </div>
  );
}
