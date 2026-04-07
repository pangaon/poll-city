/**
 * GET /api/newsletters/campaigns — List newsletter campaigns.
 * POST /api/newsletters/campaigns — Create a newsletter campaign.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "email:read");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const campaigns = await prisma.newsletterCampaign.findMany({
    where: { campaignId },
    orderBy: { createdAt: "desc" },
    include: { createdBy: { select: { name: true } } },
  });

  return NextResponse.json({ campaigns });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "email:write");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const body = await req.json();
  const { subject, bodyHtml, scheduledFor } = body;

  if (!subject?.trim() || !bodyHtml?.trim()) {
    return NextResponse.json({ error: "subject and body are required" }, { status: 400 });
  }

  const newsletter = await prisma.newsletterCampaign.create({
    data: {
      campaignId,
      subject: subject.trim(),
      body: bodyHtml.trim(),
      status: scheduledFor ? "scheduled" : "draft",
      scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      createdById: session.user.id as string,
    },
  });

  return NextResponse.json({ newsletter }, { status: 201 });
}
