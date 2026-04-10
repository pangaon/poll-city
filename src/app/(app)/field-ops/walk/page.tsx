import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import WalkShell from "@/app/(app)/canvassing/walk/walk-shell";
export const metadata = { title: "Walk — Field Ops — Poll City" };

export default async function FieldOpsWalkPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <WalkShell campaignId={campaignId} />;
}
