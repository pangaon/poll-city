"use client";
/**
 * TurfMap — Leaflet map for turf visualization and canvasser GPS tracking.
 * Must be dynamically imported with ssr: false.
 */
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

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

export default function TurfMap({
  stops = [],
  canvassers = [],
  showRoute = true,
  height = "400px",
  center,
  zoom = 15,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    // Dynamic import to avoid SSR issues
    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix Leaflet default icon paths in webpack/Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      // Determine map center
      let mapCenter: [number, number] = center ?? [43.6532, -79.3832]; // default: Toronto
      if (!center && stops.length > 0) {
        const avgLat = stops.reduce((s, p) => s + p.lat, 0) / stops.length;
        const avgLng = stops.reduce((s, p) => s + p.lng, 0) / stops.length;
        mapCenter = [avgLat, avgLng];
      } else if (!center && canvassers.length > 0) {
        mapCenter = [canvassers[0].lat, canvassers[0].lng];
      }

      const map = L.map(mapRef.current!, { zoomControl: true }).setView(mapCenter, zoom);
      mapInstanceRef.current = map;

      // OpenStreetMap tiles
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Route polyline
      if (showRoute && stops.length > 1) {
        const sortedStops = [...stops].sort((a, b) => a.order - b.order);
        const routeCoords = sortedStops.map((s) => [s.lat, s.lng] as [number, number]);
        L.polyline(routeCoords, { color: "#1e40af", weight: 2.5, opacity: 0.7, dashArray: "6 4" }).addTo(map);
      }

      // Stop markers
      stops.forEach((stop) => {
        const color = stop.visited ? "#10b981" : "#1e40af";
        const borderColor = stop.visited ? "#065f46" : "#1e3a8a";

        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:28px;height:28px;border-radius:50%;
            background:${color};border:2.5px solid ${borderColor};
            color:white;font-size:10px;font-weight:700;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 2px 4px rgba(0,0,0,0.3);
          ">${stop.order + 1}</div>`,
          iconSize: [28, 28],
          iconAnchor: [14, 14],
          popupAnchor: [0, -16],
        });

        L.marker([stop.lat, stop.lng], { icon })
          .addTo(map)
          .bindPopup(`
            <div style="font-size:12px;min-width:140px">
              <strong>#${stop.order + 1} · ${stop.label}</strong>
              <br/><span style="color:${stop.visited ? "#10b981" : "#6b7280"}">${stop.visited ? "✓ Visited" : "Not visited"}</span>
            </div>
          `);
      });

      // Canvasser markers (GPS pins)
      const canvasserIcon = L.divIcon({
        className: "",
        html: `<div style="
          width:32px;height:32px;border-radius:50%;
          background:#f59e0b;border:3px solid #92400e;
          display:flex;align-items:center;justify-content:center;
          box-shadow:0 2px 6px rgba(0,0,0,0.4);
          font-size:14px;
        ">📍</div>`,
        iconSize: [32, 32],
        iconAnchor: [16, 16],
        popupAnchor: [0, -18],
      });

      canvassers.forEach((c) => {
        const mins = Math.round((Date.now() - new Date(c.updatedAt).getTime()) / 60000);
        L.marker([c.lat, c.lng], { icon: canvasserIcon })
          .addTo(map)
          .bindPopup(`
            <div style="font-size:12px;min-width:140px">
              <strong>${c.name}</strong>
              <br/><span style="color:#6b7280">Updated ${mins}m ago</span>
            </div>
          `);
      });

      // Fit bounds to all markers
      const allCoords: [number, number][] = [
        ...stops.map((s) => [s.lat, s.lng] as [number, number]),
        ...canvassers.map((c) => [c.lat, c.lng] as [number, number]),
      ];
      if (allCoords.length > 1) {
        map.fitBounds(allCoords, { padding: [32, 32] });
      }
    });

    return () => {
      if (mapInstanceRef.current) {
        (mapInstanceRef.current as { remove: () => void }).remove();
        mapInstanceRef.current = null;
      }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div
      ref={mapRef}
      style={{
        height,
        width: "100%",
        borderRadius: "12px",
        overflow: "hidden",
        position: "relative",
        zIndex: 0,
      }}
    />
  );
}
