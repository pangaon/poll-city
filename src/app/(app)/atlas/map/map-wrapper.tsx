"use client";

import dynamic from "next/dynamic";

const AtlasAllMapClient = dynamic(
  () => import("@/components/atlas/atlas-all-map-client"),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-screen w-full items-center justify-center bg-slate-950">
        <div className="text-slate-400 text-sm tracking-widest uppercase animate-pulse">
          Loading GTA map…
        </div>
      </div>
    ),
  },
);

// Break out of the app layout's padding wrapper and give the map a definite
// height. Without this, height:100% inside AtlasAllMapClient resolves to 0
// (the padding div has no explicit height), causing MapLibre's ResizeObserver
// to loop continuously and the map to appear as if it never stops moving.
export default function MapWrapper() {
  return (
    <div
      className="-m-3 sm:-m-4 md:-m-6"
      style={{ height: "calc(100dvh - 3.5rem)" }}
    >
      <AtlasAllMapClient />
    </div>
  );
}
