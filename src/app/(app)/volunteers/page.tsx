import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import VolunteersClient from "./volunteers-client";
export const metadata = { title: "Volunteers — Poll City" };

export default async function VolunteersPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <VolunteersClient campaignId={campaignId} />;
}
