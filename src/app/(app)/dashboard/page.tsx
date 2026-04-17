import { redirect } from "next/navigation";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import DashboardStudio from "@/components/dashboard/dashboard-studio";

export const metadata = { title: "Dashboard Studio — Poll City" };

export default async function DashboardPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { logoUrl: true, electionType: true, onboardingComplete: true, isDemo: true, createdAt: true },
  });

  // Resume onboarding wizard if not yet completed.
  // Guard: only for non-demo campaigns created after the wizard launched (2026-04-16).
  // Existing campaigns keep working — run scripts/mark-campaigns-onboarded.ts to backfill.
  const WIZARD_LAUNCH = new Date("2026-04-16T00:00:00Z");
  if (
    campaign &&
    !campaign.onboardingComplete &&
    !campaign.isDemo &&
    campaign.createdAt >= WIZARD_LAUNCH
  ) {
    redirect("/onboarding");
  }

  return (
    <DashboardStudio
      campaignId={campaignId}
      campaignName={campaignName}
      campaignLogoUrl={campaign?.logoUrl ?? undefined}
      campaignType={(["municipal", "provincial", "federal", "by_election", "other"].includes(campaign?.electionType ?? "") ? campaign?.electionType : "other") as "municipal" | "provincial" | "federal" | "by_election" | "other"}
    />
  );
}
