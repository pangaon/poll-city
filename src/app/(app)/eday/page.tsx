import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import EdayClient from "./eday-client";

export const metadata = { title: "Election Day — Poll City" };
export const dynamic = "force-dynamic";

export default async function EdayPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <EdayClient campaignId={campaignId} />;
}
