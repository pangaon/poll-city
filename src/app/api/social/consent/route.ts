import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * GET /api/social/consent
 *
 * Returns all ConsentLog records for the currently authenticated user.
 * Used by /social/profile to show the user what they have consented to.
 *
 * Returns only non-revoked records by default.
 * Pass ?include_revoked=true to include revoked records.
 *
 * Security: only returns records for session.user.id — users cannot see
 * each other's consent records. No campaignId from client is trusted.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const includeRevoked = req.nextUrl.searchParams.get("include_revoked") === "true";

  const consents = await prisma.consentLog.findMany({
    where: {
      userId: session!.user.id,
      ...(includeRevoked ? {} : { revokedAt: null }),
    },
    select: {
      id:            true,
      campaignId:    true,
      signalType:    true,
      consentScope:  true,
      fieldsXferred: true,
      contactId:     true,
      revokedAt:     true,
      createdAt:     true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch campaign names separately to avoid leaking campaign-private data
  // Only return: campaign name + slug (public-facing info)
  const campaignIds = Array.from(new Set(consents.map(c => c.campaignId)));
  const campaigns = await prisma.campaign.findMany({
    where: { id: { in: campaignIds } },
    select: { id: true, name: true, slug: true },
  });
  const campaignMap = Object.fromEntries(campaigns.map(c => [c.id, c]));

  const result = consents.map(c => ({
    id:            c.id,
    campaign: {
      id:   c.campaignId,
      name: campaignMap[c.campaignId]?.name ?? "Unknown Campaign",
      slug: campaignMap[c.campaignId]?.slug ?? "",
    },
    signalType:    c.signalType,
    consentScope:  c.consentScope,
    fieldsShared:  c.fieldsXferred,
    isActive:      c.revokedAt === null,
    revokedAt:     c.revokedAt,
    createdAt:     c.createdAt,
  }));

  return NextResponse.json({ data: result });
}
