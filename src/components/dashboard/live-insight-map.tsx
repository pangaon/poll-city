"use client";

import { Fragment, useEffect, useMemo, useState } from "react";
import {
  MapContainer,
  TileLayer,
  CircleMarker,
  Circle,
  useMapEvents,
} from "react-leaflet";
import "leaflet/dist/leaflet.css";

type ContactPin = {
  id: string;
  lat: number;
  lng: number;
  name: string;
  address: string | null;
  supportLevel: string;
  voted: boolean;
  hasSign: boolean;
  wantsSign: boolean;
  lastContacted: string | null;
  notHome: boolean;
  hasPhone: boolean;
};

type SignPin = {
  type: "sign_intel";
  lat: number;
  lng: number;
  signType: string;
  address: string;
};

type PinResponse = {
  contacts: ContactPin[];
  signs: SignPin[];
  total: number;
};

function supportColor(level: string) {
  if (level === "strong_support" || level === "leaning_support") return "#22c55e";
  if (level === "undecided") return "#eab308";
  if (level.includes("opposition") || level.includes("against")) return "#ef4444";
  return "#9ca3af";
}

function centroid(points: Array<{ lat: number; lng: number }>) {
  if (points.length === 0) return null;
  const sum = points.reduce((acc, p) => ({ lat: acc.lat + p.lat, lng: acc.lng + p.lng }), { lat: 0, lng: 0 });
  return { lat: sum.lat / points.length, lng: sum.lng / points.length };
}

export default function LiveInsightMap({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<PinResponse>({ contacts: [], signs: [], total: 0 });
  const [selected, setSelected] = useState<ContactPin | null>(null);
  const [loading, setLoading] = useState(true);

  async function load(bounds: { south: number; north: number; west: number; east: number }) {
    setLoading(true);
    try {
      const q = new URLSearchParams({
        campaignId,
        south: String(bounds.south),
        north: String(bounds.north),
        west: String(bounds.west),
        east: String(bounds.east),
        limit: "2500",
      });
      const res = await fetch(`/api/maps/live-pins?${q.toString()}`, { cache: "no-store" });
      if (!res.ok) return;
      const payload = (await res.json()) as PinResponse;
      setData(payload);
    } finally {
      setLoading(false);
    }
  }

  const supporterCenter = useMemo(
    () => centroid(data.contacts.filter((c) => c.supportLevel.includes("support")).map((c) => ({ lat: c.lat, lng: c.lng }))),
    [data.contacts],
  );
  const oppositionCenter = useMemo(
    () => centroid(data.contacts.filter((c) => c.supportLevel.includes("opposition") || c.supportLevel.includes("against")).map((c) => ({ lat: c.lat, lng: c.lng }))),
    [data.contacts],
  );
  const opponentSignCenter = useMemo(
    () => centroid(data.signs.filter((s) => String(s.signType).includes("opponent")).map((s) => ({ lat: s.lat, lng: s.lng }))),
    [data.signs],
  );

  return (
    <div className="relative z-0 h-[26rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <MapContainer center={[43.6532, -79.3832]} zoom={12} className="h-full w-full" zoomControl>
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <MapBoundsLoader onBoundsChange={load} />

        {supporterCenter && (
          <Circle center={[supporterCenter.lat, supporterCenter.lng]} radius={900} pathOptions={{ color: "#22c55e", fillOpacity: 0.12, weight: 2 }} />
        )}
        {oppositionCenter && (
          <Circle center={[oppositionCenter.lat, oppositionCenter.lng]} radius={850} pathOptions={{ color: "#ef4444", fillOpacity: 0.1, weight: 2 }} />
        )}
        {opponentSignCenter && (
          <Circle center={[opponentSignCenter.lat, opponentSignCenter.lng]} radius={700} pathOptions={{ color: "#dc2626", fillOpacity: 0.16, weight: 2 }} />
        )}

        {data.contacts.map((contact) => {
          const recentlyContacted = !!contact.lastContacted && Date.now() - new Date(contact.lastContacted).getTime() < 30 * 60 * 1000;
            return (
              <Fragment key={contact.id}>
              {recentlyContacted && (
                <Circle
                  key={`${contact.id}-pulse`}
                  center={[contact.lat, contact.lng]}
                  radius={120}
                  pathOptions={{ color: "#38bdf8", weight: 1, fillOpacity: 0.08 }}
                />
              )}
              <CircleMarker
                key={contact.id}
                center={[contact.lat, contact.lng]}
                radius={contact.voted ? 4 : recentlyContacted ? 7 : 5.5}
                pathOptions={{
                  color: "#0f172a",
                  weight: 1,
                  fillColor: supportColor(contact.supportLevel),
                  fillOpacity: contact.voted ? 0.6 : 0.95,
                }}
                eventHandlers={{ click: () => setSelected(contact) }}
              />
              </Fragment>
          );
        })}

        {data.signs.map((sign, i) => (
          <CircleMarker
            key={`sign-${i}`}
            center={[sign.lat, sign.lng]}
            radius={3.5}
            pathOptions={{ color: "#7f1d1d", fillColor: "#ef4444", fillOpacity: 0.85, weight: 1 }}
          />
        ))}
      </MapContainer>

      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/40 bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur">
        {loading ? "Loading pins..." : `${data.total.toLocaleString()} contacts in viewport`}
      </div>

      {selected && (
        <aside className="absolute inset-y-0 right-0 w-72 border-l border-slate-200 bg-white/80 p-3 backdrop-blur">
          <p className="text-sm font-black text-slate-900">{selected.name}</p>
          <p className="mt-0.5 text-xs text-slate-600">{selected.address ?? "Address unavailable"}</p>
          <div className="mt-3 space-y-1 text-xs text-slate-700">
            <p>Support: <span className="font-semibold">{selected.supportLevel}</span></p>
            <p>Voted: <span className="font-semibold">{selected.voted ? "Yes" : "No"}</span></p>
            <p>Sign placed: <span className="font-semibold">{selected.hasSign ? "Yes" : "No"}</span></p>
            <p>Wants sign: <span className="font-semibold">{selected.wantsSign ? "Yes" : "No"}</span></p>
            <p>Last contacted: <span className="font-semibold">{selected.lastContacted ? new Date(selected.lastContacted).toLocaleString() : "Never"}</span></p>
          </div>
          <button
            type="button"
            onClick={() => setSelected(null)}
            className="mt-3 rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700"
          >
            Close
          </button>
        </aside>
      )}
    </div>
  );
}

function MapBoundsLoader({ onBoundsChange }: { onBoundsChange: (bounds: { south: number; north: number; west: number; east: number }) => void }) {
  const map = useMapEvents({
    load: () => {
      const b = map.getBounds();
      onBoundsChange({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast() });
    },
    moveend: () => {
      const b = map.getBounds();
      onBoundsChange({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast() });
    },
  });
  return null;
}
