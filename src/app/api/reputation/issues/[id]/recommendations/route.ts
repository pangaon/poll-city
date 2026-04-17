import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { generateIssueRecommendations } from "@/lib/reputation/issue-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const recommendations = await prisma.reputationRecommendation.findMany({
    where: { issueId: params.id, issue: { campaignId: campaignId! } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ recommendations });
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const campaignId = body.campaignId as string;
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  // Verify issue belongs to campaign
  const issue = await prisma.reputationIssue.findUnique({
    where: { id: params.id, campaignId },
    select: { id: true },
  });
  if (!issue) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const recs = await generateIssueRecommendations(params.id, campaignId);
  return NextResponse.json({ recommendations: recs }, { status: 201 });
}

// Dismiss a recommendation
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json();
  const { recommendationId, campaignId } = body as { recommendationId: string; campaignId: string };
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  const rec = await prisma.reputationRecommendation.findUnique({
    where: { id: recommendationId },
    include: { issue: { select: { campaignId: true } } },
  });
  if (!rec || rec.issue.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  await prisma.reputationRecommendation.update({
    where: { id: recommendationId },
    data: { isDismissed: true },
  });

  return NextResponse.json({ ok: true });
}
