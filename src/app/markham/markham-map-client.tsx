"use client";

import AtlasMapClient, { type MunicipalityConfig } from "@/components/atlas/atlas-map-client";

const CONFIG: MunicipalityConfig = {
  displayName: "CITY OF MARKHAM",
  displayLocation: "Markham, Ontario",
  loadingText: "Loading Markham…",
  dataAttribution: "Source: Markham Open Data (official)",
  footerText: "York Region · Ontario Municipal 2026",
  addressSourceKey: "markham-geohub",
  addressSourceLabel: "Markham Open Data",
  initialView: { longitude: -79.2624, latitude: 43.8561, zoom: 11 },
  wardsApi: "/api/atlas/markham-wards",
  addressesApi: "/api/atlas/markham-addresses",
};

export default function MarkhamMapClient() {
  return <AtlasMapClient config={CONFIG} />;
}
