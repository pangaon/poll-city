import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * GET /api/social/my-notifications
 *
 * Returns all campaigns the authenticated user has opted into for push
 * notifications (active opt-ins only — revokedAt = null).
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user.id;

  const consents = await prisma.consentLog.findMany({
    where: {
      userId,
      signalType: "notification_opt_in",
      revokedAt: null,
    },
    select: { id: true, campaignId: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  if (consents.length === 0) {
    return NextResponse.json({ data: [] });
  }

  const campaignIds = consents.map((c) => c.campaignId);
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, name: true, slug: true, candidateName: true, logoUrl: true },
  });
  const campaignMap = Object.fromEntries(campaigns.map((c) => [c.id, c]));

  const result = consents.map((c) => ({
    id: c.id,
    campaignId: c.campaignId,
    campaign: campaignMap[c.campaignId] ?? {
      id: c.campaignId,
      name: "Unknown Campaign",
      slug: "",
      candidateName: null,
      logoUrl: null,
    },
    createdAt: c.createdAt,
  }));

  return NextResponse.json({ data: result });
}
