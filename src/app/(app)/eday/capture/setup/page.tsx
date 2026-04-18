import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import SetupClient from "./setup-client";

export const metadata = { title: "Quick Capture Setup — Poll City" };

export default async function CaptureSetupPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.activeCampaignId) redirect("/login");

  const campaignId = session.user.activeCampaignId;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
    select: { role: true, status: true },
  });

  if (!membership || membership.status !== "active" ||
    !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    redirect("/eday");
  }

  const events = await prisma.captureEvent.findMany({
    where: { campaignId, deletedAt: null },
    include: {
      _count: { select: { locations: true, candidates: true, submissions: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      candidateName: true,
      candidateTitle: true,
      jurisdiction: true,
      electionDate: true,
      advanceVoteStart: true,
      advanceVoteEnd: true,
    },
  });

  return (
    <SetupClient
      campaignId={campaignId}
      initialEvents={events.map((e) => ({
        ...e,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString(),
        startDate: e.startDate?.toISOString() ?? null,
        endDate: e.endDate?.toISOString() ?? null,
        deletedAt: e.deletedAt?.toISOString() ?? null,
      }))}
      campaign={{
        candidateName: campaign?.candidateName ?? "",
        candidateTitle: campaign?.candidateTitle ?? "",
        jurisdiction: campaign?.jurisdiction ?? "",
        electionDate: campaign?.electionDate?.toISOString() ?? null,
        advanceVoteStart: campaign?.advanceVoteStart?.toISOString() ?? null,
        advanceVoteEnd: campaign?.advanceVoteEnd?.toISOString() ?? null,
      }}
    />
  );
}
