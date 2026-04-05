import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { enforceLimit } from "@/lib/rate-limit-redis";

function suggestionForPage(page: string): string[] {
  if (page.includes("contacts")) {
    return [
      "Focus on undecided contacts touched more than 10 days ago.",
      "Generate a callback list for high-support voters with no follow-up date.",
      "Identify streets with the weakest support density for turf assignment.",
    ];
  }
  if (page.includes("gotv")) {
    return [
      "Build a same-day pull list for strong support contacts with no voted flag.",
      "Queue volunteer reminder messages for top-priority GOTV turfs.",
      "Audit low-response polls and adjust outreach timing windows.",
    ];
  }
  if (page.includes("dashboard")) {
    return [
      "Compare supporter growth this week vs last week and flag soft spots.",
      "Run a risk check: open tasks due before election day.",
      "Create a 48-hour action plan for undecided-heavy neighborhoods.",
    ];
  }
  return [
    "Summarize campaign risk areas for the next 7 days.",
    "Draft 3 concrete actions to improve supporter conversion this week.",
    "Generate a concise volunteer recruitment push for this page context.",
  ];
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const limited = await enforceLimit(req, "adoni", session?.user?.id);
  if (limited) return limited;

  const page = req.nextUrl.searchParams.get("page") ?? "unknown";
  const userRow = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { activeCampaignId: true },
  });
  const campaignId = userRow?.activeCampaignId ?? null;

  const [campaign, contactCount, supporterCount, volunteerCount] = await Promise.all([
    campaignId
      ? prisma.campaign.findUnique({
          where: { id: campaignId },
          select: { name: true, electionDate: true },
        })
      : Promise.resolve(null),
    campaignId ? prisma.contact.count({ where: { campaignId } }) : Promise.resolve(0),
    campaignId
      ? prisma.contact.count({
          where: {
            campaignId,
            supportLevel: { in: ["strong_support", "leaning_support"] },
          },
        })
      : Promise.resolve(0),
    campaignId ? prisma.volunteerProfile.count({ where: { campaignId } }) : Promise.resolve(0),
  ]);

  const daysToElection = campaign?.electionDate
    ? Math.ceil((campaign.electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  return NextResponse.json({
    context: {
      page,
      campaignName: campaign?.name ?? "No active campaign",
      daysToElection,
      contactCount,
      supporterCount,
      volunteerCount,
      userName: session?.user?.name ?? session?.user?.email ?? "Team Member",
    },
    suggestions: suggestionForPage(page),
  });
}
