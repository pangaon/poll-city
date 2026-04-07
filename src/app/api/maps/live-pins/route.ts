/**
 * GET /api/maps/live-pins — Real-time map pins with contact intelligence.
 *
 * Returns every geocoded contact as a map pin with:
 * - Position (lat/lng from household)
 * - Support level (colour coding)
 * - Sign status (our sign, opponent sign, no sign)
 * - Last contacted date
 * - Voted status
 *
 * For the interactive insight map that George wants.
 * Click a pin → see the contact. See the street. See the intelligence.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:read");
  if (permError) return permError;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  // Bounding box filter for viewport-based loading
  const south = Number(sp.get("south") || "-90");
  const north = Number(sp.get("north") || "90");
  const west = Number(sp.get("west") || "-180");
  const east = Number(sp.get("east") || "180");
  const limit = Math.min(5000, Number(sp.get("limit") || "2000"));

  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
      household: {
        lat: { gte: south, lte: north },
        lng: { gte: west, lte: east },
      },
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      address1: true,
      supportLevel: true,
      voted: true,
      signRequested: true,
      signPlaced: true,
      lastContactedAt: true,
      notHome: true,
      phone: true,
      household: { select: { lat: true, lng: true } },
    },
    take: limit,
  });

  // Also get sign intelligence from activity log
  const signIntel = await prisma.activityLog.findMany({
    where: { campaignId, action: "sign_intelligence" },
    select: { details: true },
    take: 1000,
  });

  const signPins = signIntel
    .map((s) => s.details as Record<string, unknown>)
    .filter((d) => d?.lat && d?.lng)
    .map((d) => ({
      type: "sign_intel" as const,
      lat: d.lat as number,
      lng: d.lng as number,
      signType: d.signType as string,
      address: d.address as string,
    }));

  const contactPins = contacts
    .filter((c) => c.household?.lat && c.household?.lng)
    .map((c) => ({
      type: "contact" as const,
      id: c.id,
      lat: c.household!.lat!,
      lng: c.household!.lng!,
      name: `${c.firstName} ${c.lastName}`,
      address: c.address1,
      supportLevel: c.supportLevel,
      voted: c.voted,
      hasSign: c.signPlaced,
      wantsSign: c.signRequested && !c.signPlaced,
      lastContacted: c.lastContactedAt,
      notHome: c.notHome,
      hasPhone: !!c.phone,
    }));

  return NextResponse.json({
    contacts: contactPins,
    signs: signPins,
    total: contactPins.length,
  }, {
    headers: { "Cache-Control": "s-maxage=30, stale-while-revalidate=30" },
  });
}
