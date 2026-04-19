import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/social/questions
 *
 * Returns PublicQuestions for the active campaign's linked official.
 * Accepts ?answered=true|false to filter.
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const activeCampaignId = session!.user.activeCampaignId as string | null;
  if (!activeCampaignId) {
    return NextResponse.json({ error: "No active campaign" }, { status: 403 });
  }

  const url = new URL(req.url);
  const answeredParam = url.searchParams.get("answered");

  // Verify membership
  const membership = await prisma.membership.findFirst({
    where: { campaignId: activeCampaignId, userId: session!.user.id },
    select: { id: true },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: activeCampaignId },
    select: { officialId: true, candidateName: true, name: true },
  });

  if (!campaign?.officialId) {
    return NextResponse.json({ data: [], meta: { officialLinked: false } });
  }

  const answeredFilter =
    answeredParam === "true"
      ? { answer: { not: null } }
      : answeredParam === "false"
      ? { answer: null }
      : {};

  const questions = await prisma.publicQuestion.findMany({
    where: { officialId: campaign.officialId, isPublic: true, ...answeredFilter },
    orderBy: [{ upvotes: "desc" }, { createdAt: "desc" }],
    take: 100,
    select: {
      id: true,
      question: true,
      answer: true,
      answeredAt: true,
      upvotes: true,
      createdAt: true,
      user: { select: { name: true } },
    },
  });

  return NextResponse.json({
    data: questions,
    meta: {
      officialLinked: true,
      officialId: campaign.officialId,
      candidateName: campaign.candidateName ?? campaign.name,
    },
  });
}
