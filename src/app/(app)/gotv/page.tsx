import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import GotvWarRoom from "@/components/gotv/gotv-war-room";

export const metadata = { title: "GOTV Engine — Poll City" };
export const dynamic = "force-dynamic";

export default async function GotvPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <GotvWarRoom campaignId={campaignId} />;
}
