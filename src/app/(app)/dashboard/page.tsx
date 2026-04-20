import { redirect } from "next/navigation";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import DashboardStudio from "@/components/dashboard/dashboard-studio";
import { Role } from "@prisma/client";

export const metadata = { title: "Dashboard Studio — Poll City" };

export default async function DashboardPage() {
  // Super admins with no explicitly chosen campaign go to /ops — their home.
  const session = await getServerSession(authOptions);
  const user = session?.user as typeof session.user & { role?: Role; activeCampaignId?: string | null };
  if (user?.role === Role.SUPER_ADMIN && !user?.activeCampaignId) {
    redirect("/ops");
  }

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
