import type { Metadata } from "next";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import LayersClient from "./layers-client";

export const metadata: Metadata = {
  title: "Map Layers — Poll City",
  description: "Manage campaign map overlays: polling stations, signs, and contact data.",
};

export default async function MapLayersPage() {
  await resolveActiveCampaign();
  return <LayersClient />;
}
