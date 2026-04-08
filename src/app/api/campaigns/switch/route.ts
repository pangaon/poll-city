import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { switchCampaign, getUserCampaigns } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import type { Role } from "@prisma/client";
import { z } from "zod";

const switchSchema = z.object({
  campaignId: z.string().min(1),
});

/**
 * GET /api/campaigns/switch
 * List all campaigns the current user belongs to
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const user = session!.user as {
    id: string;
    role: Role;
    activeCampaignId: string | null;
  };

  const campaigns = await getUserCampaigns(user.id);
  return NextResponse.json({
    data: campaigns.map(m => ({
      campaignId: m.campaignId,
      campaignName: m.campaign.name,
      electionType: m.campaign.electionType,
      role: m.role,
      isActive: m.campaignId === user.activeCampaignId,
    })),
  });
}

/**
 * POST /api/campaigns/switch
 * Switch the active campaign for the current user
 * Body: { campaignId: string }
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = switchSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { campaignId } = parsed.data;

  const user = session!.user as { id: string; role: Role };

  // SUPER_ADMIN can switch to any campaign without membership check
  if (user.role === "SUPER_ADMIN") {
    const campaign = await prisma.campaign.findUnique({ where: { id: campaignId }, select: { id: true } });
    if (!campaign) return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    await prisma.user.update({ where: { id: user.id }, data: { activeCampaignId: campaignId } });
    return NextResponse.json({ data: { activeCampaignId: campaignId, message: "Campaign switched successfully." } });
  }

  const success = await switchCampaign(session!.user.id, campaignId);
  if (!success) return NextResponse.json({ error: "You are not a member of that campaign" }, { status: 403 });

  return NextResponse.json({ data: { activeCampaignId: campaignId, message: "Campaign switched successfully." } });
}
