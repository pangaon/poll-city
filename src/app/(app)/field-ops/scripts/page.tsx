import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import ScriptsClient from "@/app/(app)/canvassing/scripts/scripts-client";
export const metadata = { title: "Scripts — Field Ops — Poll City" };

export default async function FieldOpsScriptsPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <ScriptsClient campaignId={campaignId} />;
}
