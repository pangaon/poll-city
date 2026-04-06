"use client";

import { MapContainer, Marker, Polygon, TileLayer, Popup } from "react-leaflet";

type Point = { id: string; label: string; lat: number; lng: number };

interface CandidateWardMapProps {
  boundaryGeoJSON: unknown;
  eventPoints: Point[];
  officePoint: { lat: number; lng: number } | null;
}

function toLatLngPairs(boundaryGeoJSON: unknown): [number, number][] {
  if (!boundaryGeoJSON || typeof boundaryGeoJSON !== "object") return [];

  const obj = boundaryGeoJSON as Record<string, unknown>;
  const coordinates = obj.coordinates;
  if (!Array.isArray(coordinates) || coordinates.length === 0) return [];

  const polygon = coordinates[0];
  if (!Array.isArray(polygon)) return [];

  return polygon
    .filter((point): point is [number, number] => Array.isArray(point) && point.length >= 2)
    .map((point): [number, number] => [Number(point[1]), Number(point[0])])
    .filter((pair) => Number.isFinite(pair[0]) && Number.isFinite(pair[1]));
}

export default function CandidateWardMap({ boundaryGeoJSON, eventPoints, officePoint }: CandidateWardMapProps) {
  const polygon = toLatLngPairs(boundaryGeoJSON);

  const fallbackCenter: [number, number] = [43.6532, -79.3832];
  const center: [number, number] =
    polygon[0] ||
    (eventPoints[0] ? [eventPoints[0].lat, eventPoints[0].lng] : null) ||
    (officePoint ? [officePoint.lat, officePoint.lng] : fallbackCenter);

  return (
    <MapContainer center={center} zoom={12} className="h-[300px] md:h-[420px] w-full" scrollWheelZoom>
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />

      {polygon.length > 2 ? <Polygon positions={polygon} pathOptions={{ color: "#1a4782", fillOpacity: 0.12 }} /> : null}

      {officePoint ? (
        <Marker position={[officePoint.lat, officePoint.lng]}>
          <Popup>Campaign office</Popup>
        </Marker>
      ) : null}

      {eventPoints.map((eventPoint) => (
        <Marker key={eventPoint.id} position={[eventPoint.lat, eventPoint.lng]}>
          <Popup>{eventPoint.label}</Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
