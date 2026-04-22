import type { Metadata } from "next";
import dynamic from "next/dynamic";

export const metadata: Metadata = {
  title: "Toronto Ward Map — Poll City",
  description: "Interactive ward boundary map for the City of Toronto, Ontario.",
};

const TorontoMapClient = dynamic(() => import("./toronto-map-client"), {
  ssr: false,
  loading: () => (
    <div className="flex h-screen w-full items-center justify-center bg-slate-950">
      <div className="text-slate-400 text-sm tracking-widest uppercase animate-pulse">
        Loading map…
      </div>
    </div>
  ),
});

export default function TorontoPage() {
  return <TorontoMapClient />;
}
