import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import EventsClient from "./events-client";

export const metadata = { title: "Events" };

export default async function EventsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <EventsClient campaignId={campaignId} />;
}
