import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

const updateSchema = z.object({
  commsCooldownHours: z.number().int().min(0).max(720),
  commsMaxPerWeek: z.number().int().min(1).max(100).nullable(),
  commsMaxPerMonth: z.number().int().min(1).max(200).nullable(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId =
    req.headers.get("x-campaign-id") ??
    (session!.user as { activeCampaignId?: string }).activeCampaignId ??
    null;
  if (!campaignId) return NextResponse.json({ error: "No campaign selected" }, { status: 400 });

  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!m || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(m.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { commsCooldownHours: true, commsMaxPerWeek: true, commsMaxPerMonth: true },
  });
  if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });

  return NextResponse.json(campaign);
}

export async function PUT(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId =
    req.headers.get("x-campaign-id") ??
    (session!.user as { activeCampaignId?: string }).activeCampaignId ??
    null;
  if (!campaignId) return NextResponse.json({ error: "No campaign selected" }, { status: 400 });

  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!m || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(m.role)) {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  let body: unknown;
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const updated = await prisma.campaign.update({
    where: { id: campaignId },
    data: parsed.data,
    select: { commsCooldownHours: true, commsMaxPerWeek: true, commsMaxPerMonth: true },
  });

  return NextResponse.json(updated);
}
