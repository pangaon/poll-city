import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import VolunteersGroupsClient from "./volunteers-groups-client";

export const metadata = { title: "Volunteer Groups" };

export default async function VolunteerGroupsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <VolunteersGroupsClient campaignId={campaignId} />;
}
