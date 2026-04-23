"use client";

import AtlasMapClient, { type MunicipalityConfig } from "@/components/atlas/atlas-map-client";

const CONFIG: MunicipalityConfig = {
  displayName: "TOWN OF WHITBY",
  displayLocation: "Whitby, Ontario",
  loadingText: "Loading Whitby…",
  dataAttribution: "Source: Whitby GeoHub (official)",
  footerText: "Durham Region · Ontario Municipal 2026",
  addressSourceKey: "whitby-geohub",
  addressSourceLabel: "Whitby GeoHub",
  initialView: { longitude: -78.959477, latitude: 43.942973, zoom: 11 },
  wardsApi: "/api/atlas/whitby-wards",
  addressesApi: "/api/atlas/whitby-addresses",
  electionResultsApi: "/api/atlas/election-results?municipality=Whitby+T",
  features: {
    commercialFilter: true,
    canvassingModes: true,
    timeEnforcement: true,
    wardSearch: true,
  },
};

export default function WhitbyMapClient() {
  return <AtlasMapClient config={CONFIG} />;
}
