import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import OnboardingWizard from "./onboarding-wizard";

export const metadata = {
  title: "Set up your campaign — Poll City",
};

export default async function OnboardingPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const campaignId = session.user.activeCampaignId;

  // If no campaign yet, send them to create one first
  if (!campaignId) redirect("/campaigns/new");

  const [campaign, contactCount, memberCount] = await Promise.all([
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: {
        id: true,
        name: true,
        candidateName: true,
        electionType: true,
        jurisdiction: true,
        stripeOnboarded: true,
        onboardingComplete: true,
      },
    }),
    prisma.contact.count({
      where: { campaignId, deletedAt: null },
    }),
    prisma.membership.count({
      where: { campaignId },
    }),
  ]);

  if (!campaign) redirect("/campaigns/new");

  // Already completed — send to dashboard
  if (campaign.onboardingComplete) redirect("/dashboard");

  return (
    <OnboardingWizard
      campaignId={campaign.id}
      campaignName={campaign.name}
      candidateName={campaign.candidateName ?? undefined}
      electionType={campaign.electionType}
      jurisdiction={campaign.jurisdiction ?? undefined}
      contactCount={contactCount}
      memberCount={memberCount}
      stripeOnboarded={campaign.stripeOnboarded}
    />
  );
}
