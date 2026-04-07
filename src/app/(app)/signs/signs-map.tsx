"use client";

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { CheckCircle2, Truck, XCircle } from "lucide-react";

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
  requested: "#f59e0b",
  scheduled: "#3b82f6",
  installed: "#1D9E75",
  removed: "#6b7280",
  declined: "#ef4444",
};

function createIcon(status: SignStatus, isOpponent: boolean) {
  const color = isOpponent ? "#dc2626" : (STATUS_COLORS[status] || "#6b7280");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 32" width="24" height="32">
    <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20C24 5.4 18.6 0 12 0z" fill="${color}"/>
    <circle cx="12" cy="11" r="5" fill="white"/>
  </svg>`;
  return L.divIcon({
    html: svg,
    className: "",
    iconSize: [24, 32],
    iconAnchor: [12, 32],
    popupAnchor: [0, -32],
  });
}

function FitBounds({ signs }: { signs: SignPin[] }) {
  const map = useMap();
  const geoSigns = useMemo(() => signs.filter(s => s.lat != null && s.lng != null), [signs]);

  useEffect(() => {
    if (geoSigns.length === 0) return;
    const bounds = L.latLngBounds(geoSigns.map(s => [s.lat!, s.lng!] as [number, number]));
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 15 });
  }, [geoSigns, map]);

  return null;
}

export default function SignsMap({ signs, onStatusChange }: Props) {
  const geoSigns = useMemo(() => signs.filter(s => s.lat != null && s.lng != null), [signs]);

  if (geoSigns.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center text-gray-400">
        <svg className="w-12 h-12 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l5.447 2.724A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" /></svg>
        <p className="text-sm font-medium">No geocoded signs</p>
        <p className="text-xs mt-1">Signs need lat/lng coordinates to appear on the map.</p>
      </div>
    );
  }

  const center: [number, number] = [
    geoSigns.reduce((s, p) => s + p.lat!, 0) / geoSigns.length,
    geoSigns.reduce((s, p) => s + p.lng!, 0) / geoSigns.length,
  ];

  return (
    <MapContainer center={center} zoom={13} style={{ height: 500, width: "100%" }} className="rounded-xl z-0">
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <FitBounds signs={geoSigns} />
      {geoSigns.map(sign => (
        <Marker key={sign.id} position={[sign.lat!, sign.lng!]} icon={createIcon(sign.status, sign.isOpponent)}>
          <Popup>
            <div className="text-sm min-w-[180px]">
              <p className="font-semibold text-gray-900">{sign.address1}</p>
              {sign.city && <p className="text-gray-500 text-xs">{sign.city}</p>}
              <p className="text-xs mt-1 capitalize">
                <span className="font-medium">Status:</span> {sign.status}
                {sign.isOpponent && <span className="text-red-600 ml-1 font-medium">(Opponent)</span>}
              </p>
              <p className="text-xs"><span className="font-medium">Type:</span> {sign.signType}</p>
              {sign.assignedTeam && <p className="text-xs"><span className="font-medium">Team:</span> {sign.assignedTeam}</p>}
              {sign.contact && <p className="text-xs"><span className="font-medium">Contact:</span> {sign.contact.firstName} {sign.contact.lastName}</p>}
              <div className="flex gap-1 mt-2">
                {(sign.status === "requested" || sign.status === "scheduled") && (
                  <button
                    onClick={() => onStatusChange(sign.id, { status: "installed" })}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-600 text-white text-xs rounded hover:bg-emerald-700"
                  >
                    <CheckCircle2 className="w-3 h-3" /> Install
                  </button>
                )}
                {sign.status === "requested" && (
                  <button
                    onClick={() => onStatusChange(sign.id, { status: "scheduled" })}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600 text-white text-xs rounded hover:bg-blue-700"
                  >
                    <Truck className="w-3 h-3" /> Schedule
                  </button>
                )}
                {sign.status === "installed" && (
                  <button
                    onClick={() => onStatusChange(sign.id, { status: "removed" })}
                    className="inline-flex items-center gap-1 px-2 py-1 bg-gray-600 text-white text-xs rounded hover:bg-gray-700"
                  >
                    <XCircle className="w-3 h-3" /> Remove
                  </button>
                )}
              </div>
            </div>
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}
