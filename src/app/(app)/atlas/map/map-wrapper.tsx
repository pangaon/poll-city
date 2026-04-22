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

export default function MapWrapper() {
  return <AtlasAllMapClient />;
}
