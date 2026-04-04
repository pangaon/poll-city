import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import SuperSupportersClient from "./super-supporters-client";

export const metadata = { title: "Super Supporters" };

export default async function SuperSupportersPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <SuperSupportersClient campaignId={campaignId} />;
}
