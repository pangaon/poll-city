import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import VolunteerShiftsClient from "./volunteer-shifts-client";

export const metadata = { title: "Volunteer Shifts" };

export default async function VolunteerShiftsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <VolunteerShiftsClient campaignId={campaignId} />;
}
