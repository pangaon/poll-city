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
        officialId: true,
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

  // Fetch social context for campaigns that came through the claim flow
  let officialContext: { followerCount: number; questionCount: number; photoUrl: string | null } | null = null;
  if (campaign.officialId) {
    const official = await prisma.official.findUnique({
      where: { id: campaign.officialId },
      select: {
        photoUrl: true,
        _count: { select: { follows: true, questions: true } },
      },
    });
    if (official) {
      officialContext = {
        followerCount: official._count.follows,
        questionCount: official._count.questions,
        photoUrl: official.photoUrl,
      };
    }
  }

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
      officialContext={officialContext ?? undefined}
    />
  );
}
