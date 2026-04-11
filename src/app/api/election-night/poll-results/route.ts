/**
 * GET /api/election-night/poll-results — Per-poll breakdown on election night.
 *
 * Shows which polls have reported, which are outstanding,
 * and the support level in each poll area.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { SupportLevel } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "gotv:read");
  if (forbidden) return forbidden;

  const cid = campaignId!;

  // Group contacts by municipal poll
  const pollData = await prisma.contact.groupBy({
    by: ["municipalPoll"],
    where: { campaignId: cid, municipalPoll: { not: null } },
    _count: { _all: true },
  });

  const votedByPoll = await prisma.contact.groupBy({
    by: ["municipalPoll"],
    where: { campaignId: cid, municipalPoll: { not: null }, voted: true },
    _count: { _all: true },
  });

  const supportersByPoll = await prisma.contact.groupBy({
    by: ["municipalPoll"],
    where: { campaignId: cid, municipalPoll: { not: null }, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } },
    _count: { _all: true },
  });

  const supportersVotedByPoll = await prisma.contact.groupBy({
    by: ["municipalPoll"],
    where: { campaignId: cid, municipalPoll: { not: null }, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] }, voted: true },
    _count: { _all: true },
  });

  const votedMap = new Map(votedByPoll.map((v) => [v.municipalPoll, v._count._all]));
  const suppMap = new Map(supportersByPoll.map((s) => [s.municipalPoll, s._count._all]));
  const suppVotedMap = new Map(supportersVotedByPoll.map((s) => [s.municipalPoll, s._count._all]));

  const polls = pollData.map((p) => {
    const total = p._count._all;
    const voted = votedMap.get(p.municipalPoll) ?? 0;
    const supporters = suppMap.get(p.municipalPoll) ?? 0;
    const supportersVoted = suppVotedMap.get(p.municipalPoll) ?? 0;
    const turnout = total > 0 ? Math.round((voted / total) * 100) : 0;
    const supporterTurnout = supporters > 0 ? Math.round((supportersVoted / supporters) * 100) : 0;

    return {
      poll: p.municipalPoll,
      total,
      voted,
      turnout,
      supporters,
      supportersVoted,
      supporterTurnout,
      outstanding: supporters - supportersVoted,
      status: voted > 0 ? "reporting" : "pending",
    };
  }).sort((a, b) => (b.outstanding) - (a.outstanding)); // Most outstanding supporters first

  const totalPolls = polls.length;
  const reporting = polls.filter((p) => p.status === "reporting").length;

  return NextResponse.json({
    polls,
    summary: { totalPolls, reporting, pending: totalPolls - reporting },
  });
}
