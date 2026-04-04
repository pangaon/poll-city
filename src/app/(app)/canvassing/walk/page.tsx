import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getSession } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { redirect } from "next/navigation";
import HouseholdWalkList from "@/components/canvassing/household-walk-list";
export const metadata = { title: "Walk List" };

export default async function WalkListPage() {
  const { campaignId, role, userId } = await resolveActiveCampaign();
  
  return <HouseholdWalkList campaignId={campaignId} />;
}
