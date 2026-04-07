import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import CalendarClient from "./calendar-client";

export const metadata = { title: "Campaign Calendar" };

export default async function CalendarPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <CalendarClient campaignId={campaignId} />;
}
