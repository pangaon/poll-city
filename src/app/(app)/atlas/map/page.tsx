import type { Metadata } from "next";
import MapWrapper from "./map-wrapper";

export const metadata: Metadata = {
  title: "Ontario Map — Poll City",
  description: "Interactive GTA ward boundary map — Whitby, Toronto, and Markham on one unified pan map.",
};

export default function AtlasMapPage() {
  return <MapWrapper />;
}
