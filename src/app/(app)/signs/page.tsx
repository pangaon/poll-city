import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import SignsClient from "./signs-client";
export const metadata = { title: "Signs — Poll City" };

export default async function SignsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <SignsClient campaignId={campaignId} />;
}
