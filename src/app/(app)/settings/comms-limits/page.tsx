import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import CommsLimitsClient from "./comms-limits-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Comms Limits — Poll City" };

export default async function CommsLimitsPage() {
  const { campaignId } = await resolveActiveCampaign();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { commsCooldownHours: true, commsMaxPerWeek: true, commsMaxPerMonth: true },
  });

  return (
    <CommsLimitsClient
      commsCooldownHours={campaign?.commsCooldownHours ?? 24}
      commsMaxPerWeek={campaign?.commsMaxPerWeek ?? null}
      commsMaxPerMonth={campaign?.commsMaxPerMonth ?? null}
    />
  );
}
