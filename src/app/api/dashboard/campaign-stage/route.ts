/**
 * GET /api/dashboard/campaign-stage
 *
 * Returns the current lifecycle stage of the campaign plus contextual next actions.
 * Used by the dashboard StageBanner to surface the right guidance at the right time.
 *
 * Requires: campaignId query param, valid session with campaign membership.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export type CampaignStage =
  | "empty"
  | "building"
  | "active"
  | "gotv"
  | "election_day";

export interface CampaignStageResponse {
  stage: CampaignStage;
  nextActions: Array<{
    label: string;
    href: string;
  }>;
  daysUntilElection: number | null;
  contactCount: number;
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }

  // Verify membership — knowing a campaignId is not authorisation
  const membership = await prisma.membership.findUnique({
    where: {
      userId_campaignId: {
        userId: session!.user.id as string,
        campaignId,
      },
    },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();

  const [
    contactCount,
    interactionCount,
    donationCount,
    campaign,
    p1p2Count,
  ] = await Promise.all([
    // Total active contacts
    prisma.contact.count({
      where: { campaignId, deletedAt: null },
    }),

    // Total interactions (canvassing, calls, etc.)
    prisma.interaction.count({
      where: { contact: { campaignId } },
    }),

    // Total donations
    prisma.donation.count({
      where: { campaignId, deletedAt: null },
    }),

    // Campaign electionDate
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { electionDate: true },
    }),

    // P1 + P2 supporters (strong + leaning) — used for GOTV gap proxy
    prisma.contact.count({
      where: {
        campaignId,
        deletedAt: null,
        supportLevel: { in: ["strong_support", "leaning_support"] },
      },
    }),
  ]);

  // ── Days until election ─────────────────────────────────────────────────────
  let daysUntilElection: number | null = null;
  let isElectionDay = false;
  let isGotvWindow = false;

  if (campaign?.electionDate) {
    const electionDate = new Date(campaign.electionDate);
    // Normalise both dates to midnight to get clean day arithmetic
    const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const electionMidnight = new Date(
      electionDate.getFullYear(),
      electionDate.getMonth(),
      electionDate.getDate(),
    );
    const diffMs = electionMidnight.getTime() - todayMidnight.getTime();
    daysUntilElection = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
    isElectionDay = daysUntilElection === 0;
    isGotvWindow = daysUntilElection <= 30 && !isElectionDay;
  }

  // GOTV gap: supporters who haven't voted yet (proxy: p1+p2 minus contacts marked voted)
  const votedCount = await prisma.contact.count({
    where: {
      campaignId,
      deletedAt: null,
      supportLevel: { in: ["strong_support", "leaning_support"] },
      voted: true,
    },
  });
  const gotvGap = Math.max(0, p1p2Count - votedCount);

  // ── Stage detection ─────────────────────────────────────────────────────────
  let stage: CampaignStage;
  let nextActions: Array<{ label: string; href: string }>;

  if (isElectionDay) {
    stage = "election_day";
    nextActions = [
      { label: "Strike off voters as they vote", href: "/gotv" },
      { label: "Deploy final GOTV push", href: "/gotv/rides" },
      { label: "Monitor live results", href: "/election-night" },
    ];
  } else if (isGotvWindow || gotvGap > 0) {
    stage = "gotv";
    nextActions = [
      { label: "Upload voted list", href: "/gotv" },
      { label: "Dispatch GOTV rides", href: "/gotv/rides" },
      { label: "Call undecided voters", href: "/contacts?filter=undecided" },
    ];
  } else if (contactCount === 0) {
    stage = "empty";
    nextActions = [
      { label: "Import your voter list", href: "/import-export" },
      { label: "Add your first contact", href: "/contacts" },
    ];
  } else if (contactCount < 100 || interactionCount === 0) {
    stage = "building";
    nextActions = [
      { label: "Start canvassing", href: "/canvassing" },
      { label: "Send first email to supporters", href: "/communications" },
    ];
  } else {
    stage = "active";
    nextActions = [
      { label: "Review GOTV gap", href: "/gotv" },
      { label: "Check volunteer hours", href: "/volunteers" },
      { label: "Follow up on pledges", href: "/contacts?filter=followUp" },
    ];
  }

  const response: CampaignStageResponse = {
    stage,
    nextActions,
    daysUntilElection,
    contactCount,
  };

  return NextResponse.json(response, {
    headers: { "Cache-Control": "no-store" },
  });
}
