"use client";
/**
 * TurfDrawMap — Leaflet map for drawing polygon turfs by clicking vertices.
 * Must be dynamically imported with ssr: false.
 */
import { useEffect, useRef } from "react";
import "leaflet/dist/leaflet.css";

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
}

function supportColor(level: string | null): string {
  switch (level) {
    case "strong_support":   return "#1D9E75"; // Green
    case "lean_support":     return "#6ee7b7";
    case "undecided":        return "#EF9F27"; // Amber
    case "lean_oppose":      return "#fca5a5";
    case "strong_oppose":    return "#E24B4A"; // Red
    default:                 return "#94a3b8"; // Slate
  }
}

export default function TurfDrawMap({
  contacts,
  vertices,
  center = [43.6532, -79.3832],
  zoom = 13,
  onAddVertex,
}: Props) {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const polygonLayerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vertexMarkersRef = useRef<any[]>([]);
  // Keep a stable ref to the callback so the click handler always has the latest
  const onAddVertexRef = useRef(onAddVertex);
  onAddVertexRef.current = onAddVertex;

  // Init map once
  useEffect(() => {
    if (!mapRef.current || mapInstanceRef.current) return;

    import("leaflet").then((L) => {
      if (!mapRef.current || mapInstanceRef.current) return;

      // Fix Leaflet icon URLs in webpack/Next.js
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      delete (L.Icon.Default.prototype as unknown as Record<string, unknown>)._getIconUrl;
      L.Icon.Default.mergeOptions({
        iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
        iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
        shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
      });

      const map = L.map(mapRef.current!, {
        zoomControl: true,
      }).setView(center, zoom);
      // cursor set via CSS on the container element
      if (mapRef.current) mapRef.current.style.cursor = "crosshair";

      mapInstanceRef.current = map;

      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        attribution: "© OpenStreetMap contributors",
        maxZoom: 19,
      }).addTo(map);

      // Map click → add vertex
      map.on("click", (e: { latlng: { lat: number; lng: number } }) => {
        onAddVertexRef.current([e.latlng.lat, e.latlng.lng]);
      });
    });

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync contact dots whenever contacts list changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // Remove old contact layers (stored on map as _contactLayer)
      if (map._contactLayer) {
        map.removeLayer(map._contactLayer);
      }

      const group = L.layerGroup();
      contacts.forEach((c) => {
        const color = supportColor(c.supportLevel);
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:10px;height:10px;border-radius:50%;
            background:${color};border:1.5px solid rgba(0,0,0,0.25);
            box-shadow:0 1px 3px rgba(0,0,0,0.2);
          "></div>`,
          iconSize: [10, 10],
          iconAnchor: [5, 5],
        });
        L.marker([c.lat, c.lng], { icon }).addTo(group);
      });

      group.addTo(map);
      map._contactLayer = group;
    });
  }, [contacts]);

  // Sync polygon + vertex markers whenever vertices change
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    import("leaflet").then((L) => {
      const map = mapInstanceRef.current;
      if (!map) return;

      // Remove previous polygon
      if (polygonLayerRef.current) {
        map.removeLayer(polygonLayerRef.current);
        polygonLayerRef.current = null;
      }

      // Remove previous vertex markers
      vertexMarkersRef.current.forEach((m) => map.removeLayer(m));
      vertexMarkersRef.current = [];

      if (vertices.length === 0) return;

      // Draw polygon (closes automatically with react-leaflet Polygon equivalent)
      if (vertices.length >= 3) {
        const poly = L.polygon(vertices, {
          color: "#0A2342",
          fillColor: "#0A2342",
          fillOpacity: 0.15,
          weight: 2.5,
          dashArray: "6 4",
        }).addTo(map);
        polygonLayerRef.current = poly;
      } else if (vertices.length >= 2) {
        // Draw a polyline until we have enough vertices for a polygon
        const poly = L.polyline(vertices, {
          color: "#0A2342",
          weight: 2.5,
          dashArray: "6 4",
        }).addTo(map);
        polygonLayerRef.current = poly;
      }

      // Draw vertex markers
      vertices.forEach((v, idx) => {
        const isFirst = idx === 0;
        const icon = L.divIcon({
          className: "",
          html: `<div style="
            width:${isFirst ? 14 : 10}px;
            height:${isFirst ? 14 : 10}px;
            border-radius:50%;
            background:${isFirst ? "#EF9F27" : "#0A2342"};
            border:2px solid white;
            box-shadow:0 1px 4px rgba(0,0,0,0.4);
          "></div>`,
          iconSize: [isFirst ? 14 : 10, isFirst ? 14 : 10],
          iconAnchor: [isFirst ? 7 : 5, isFirst ? 7 : 5],
        });
        const marker = L.marker(v, { icon, interactive: false }).addTo(map);
        vertexMarkersRef.current.push(marker);
      });
    });
  }, [vertices]);

  return (
    <div
      ref={mapRef}
      style={{
        height: "360px",
        width: "100%",
        borderRadius: "8px",
        overflow: "hidden",
        position: "relative",
        zIndex: 0,
        cursor: "crosshair",
      }}
    />
  );
}
