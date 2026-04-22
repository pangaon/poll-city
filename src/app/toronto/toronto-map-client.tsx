"use client";

import AtlasMapClient, { type MunicipalityConfig } from "@/components/atlas/atlas-map-client";

const CONFIG: MunicipalityConfig = {
  displayName: "CITY OF TORONTO",
  displayLocation: "Toronto, Ontario",
  loadingText: "Loading Toronto…",
  dataAttribution: "Source: Toronto Open Data (official)",
  footerText: "City of Toronto · Ontario Municipal 2026",
  addressSourceKey: "toronto-opendata",
  addressSourceLabel: "Toronto Open Data",
  initialView: { longitude: -79.3832, latitude: 43.6532, zoom: 10 },
  wardsApi: "/api/atlas/toronto-wards",
  addressesApi: "/api/atlas/toronto-addresses",
  schoolWardsApi: "/api/atlas/toronto-school-wards",
  features: {
    wardSearch: true,
  },
};

export default function TorontoMapClient() {
  return <AtlasMapClient config={CONFIG} />;
}
