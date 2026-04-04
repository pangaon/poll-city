import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { switchCampaign, getUserCampaigns } from "@/lib/auth/campaign-resolver";
import type { Role } from "@prisma/client";

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

  let body: { campaignId?: string };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  if (!body.campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const success = await switchCampaign(session!.user.id, body.campaignId);
  if (!success) return NextResponse.json({ error: "You are not a member of that campaign" }, { status: 403 });

  return NextResponse.json({ data: { activeCampaignId: body.campaignId, message: "Switched. Please refresh." } });
}
