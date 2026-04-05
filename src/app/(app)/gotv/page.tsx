import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import GotvClient from "./gotv-client";

export const metadata = { title: "GOTV Engine — Poll City" };
export const dynamic = "force-dynamic";

export default async function GotvPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <GotvClient campaignId={campaignId} />;
}
