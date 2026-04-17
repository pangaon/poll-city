import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import FundraisingClient from "./fundraising-client";
export const metadata = { title: "Fundraising — Poll City" };

export default async function FundraisingPage() {
  const { campaignId } = await resolveActiveCampaign();
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { electionType: true, jurisdiction: true },
  });
  return (
    <FundraisingClient
      campaignId={campaignId}
      electionType={campaign?.electionType ?? "municipal"}
      jurisdiction={campaign?.jurisdiction ?? null}
    />
  );
}
