"use client";

import dynamic from "next/dynamic";
import { useState, useCallback, useEffect, useRef } from "react";
import { Source, Layer, useMap } from "react-map-gl/maplibre";
import { SUPPORT_COLORS } from "@/components/maps/lib/map-utils";

const PollCityMap = dynamic(() => import("@/components/maps/poll-city-map"), { ssr: false });

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

function buildContactFC(contacts: ContactPin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: contacts.map((c) => {
      const mins = c.lastContacted
        ? Math.round((Date.now() - new Date(c.lastContacted).getTime()) / 60000)
        : null;
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [c.lng, c.lat] },
        properties: {
          id: c.id,
          name: c.name,
          address: c.address ?? "",
          supportLevel: c.supportLevel,
          voted: c.voted,
          hasSign: c.hasSign,
          wantsSign: c.wantsSign,
          lastContacted: c.lastContacted ?? "",
          isRecent: mins !== null && mins < 30,
          color: SUPPORT_COLORS[c.supportLevel] ?? SUPPORT_COLORS.default,
        },
      };
    }),
  };
}

function buildSignFC(signs: SignPin[]): GeoJSON.FeatureCollection {
  return {
    type: "FeatureCollection",
    features: signs.map((s, i) => ({
      type: "Feature",
      geometry: { type: "Point", coordinates: [s.lng, s.lat] },
      properties: { id: `sign-${i}`, address: s.address, signType: s.signType },
    })),
  };
}

function BoundsWatcher({ onBoundsChange }: { onBoundsChange: (b: { south: number; north: number; west: number; east: number }) => void }) {
  const { current: mapRef } = useMap();

  useEffect(() => {
    if (!mapRef) return;
    const map = mapRef.getMap();
    function fire() {
      const b = map.getBounds();
      if (b) onBoundsChange({ south: b.getSouth(), north: b.getNorth(), west: b.getWest(), east: b.getEast() });
    }
    fire();
    map.on("moveend", fire);
    return () => { map.off("moveend", fire); };
  }, [mapRef, onBoundsChange]);

  return null;
}

function LiveInsightMapInner({ campaignId }: { campaignId: string }) {
  const [data, setData] = useState<PinResponse>({ contacts: [], signs: [], total: 0 });
  const [selected, setSelected] = useState<ContactPin | null>(null);
  const [loading, setLoading] = useState(true);
  const loadingRef = useRef(false);

  const load = useCallback(
    (bounds: { south: number; north: number; west: number; east: number }) => {
      if (loadingRef.current) return;
      loadingRef.current = true;
      setLoading(true);
      const q = new URLSearchParams({
        campaignId,
        south: String(bounds.south),
        north: String(bounds.north),
        west: String(bounds.west),
        east: String(bounds.east),
        limit: "2500",
      });
      fetch(`/api/maps/live-pins?${q.toString()}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((payload: PinResponse | null) => {
          if (payload) setData(payload);
        })
        .catch(() => null)
        .finally(() => {
          setLoading(false);
          loadingRef.current = false;
        });
    },
    [campaignId],
  );

  const contactFC = buildContactFC(data.contacts);
  const signFC = buildSignFC(data.signs);

  return (
    <div className="relative z-0 h-[26rem] overflow-hidden rounded-xl border border-slate-200 bg-slate-100">
      <PollCityMap mode="dashboard" height="100%">
        <BoundsWatcher onBoundsChange={load} />

        {/* Heatmap */}
        <Source id="live-contacts-heat" type="geojson" data={contactFC}>
          <Layer
            id="live-heat"
            type="heatmap"
            maxzoom={15}
            paint={{
              "heatmap-radius": 20,
              "heatmap-opacity": 0.6,
            }}
          />
        </Source>

        {/* Contact dots */}
        <Source id="live-contacts" type="geojson" data={contactFC}>
          <Layer
            id="live-dots"
            type="circle"
            paint={{
              "circle-color": ["get", "color"] as never,
              "circle-radius": 5.5,
              "circle-opacity": 0.9,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#0f172a",
            }}
          />
        </Source>

        {/* Sign dots */}
        <Source id="live-signs" type="geojson" data={signFC}>
          <Layer
            id="live-sign-dots"
            type="circle"
            paint={{
              "circle-color": "#ef4444",
              "circle-radius": 3.5,
              "circle-opacity": 0.85,
              "circle-stroke-width": 1,
              "circle-stroke-color": "#7f1d1d",
            }}
          />
        </Source>
      </PollCityMap>

      {/* Viewport counter */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-lg border border-white/40 bg-white/70 px-2 py-1 text-[11px] font-semibold text-slate-700 backdrop-blur">
        {loading ? "Loading pins..." : `${data.total.toLocaleString()} contacts in view`}
      </div>

      {/* Legend */}
      <div className="absolute bottom-10 left-3 z-10 bg-white/90 backdrop-blur rounded-lg p-2 text-xs space-y-1">
        {Object.entries(SUPPORT_COLORS)
          .filter(([k]) => k !== "default")
          .map(([level, color]) => (
            <div key={level} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: color }} />
              <span className="text-slate-600 capitalize">{level.replace(/_/g, " ")}</span>
            </div>
          ))}
      </div>

      {selected && (
        <aside className="absolute inset-y-0 right-0 w-72 border-l border-slate-200 bg-white/80 p-3 backdrop-blur z-10">
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

export default function LiveInsightMap({ campaignId }: { campaignId: string }) {
  return <LiveInsightMapInner campaignId={campaignId} />;
}
