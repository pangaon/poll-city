import type { Metadata } from "next";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import CalendarTabsClient from "./calendar-tabs-client";

export const metadata: Metadata = { title: "Campaign Calendar — Poll City" };

export default async function CalendarPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <CalendarTabsClient campaignId={campaignId} />;
}
