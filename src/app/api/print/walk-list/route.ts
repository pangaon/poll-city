import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

/**
 * GET /api/print/walk-list
 * Returns contacts formatted for a printable walk list.
 * Query params:
 *   campaignId  — required
 *   ids         — optional, comma-separated contact IDs
 *   wardId      — optional, filter by ward
 *   canvassingTurfId — optional, filter by turf (contacts in that turf)
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const idsParam = sp.get("ids");
  const wardId = sp.get("wardId");
  const canvassingTurfId = sp.get("canvassingTurfId");

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "contacts:read");
  if (forbidden) return forbidden;

  // Build where clause
  const where: Record<string, unknown> = {
    campaignId,
    isDeceased: false,
    doNotContact: false,
  };

  // Filter by specific IDs
  if (idsParam) {
    const ids = idsParam.split(",").map((id) => id.trim()).filter(Boolean);
    if (ids.length > 0) {
      where.id = { in: ids };
    }
  }

  // Filter by ward
  if (wardId) {
    where.ward = wardId;
  }

  // Filter by canvassing turf — find contact IDs via TurfStop records
  if (canvassingTurfId) {
    const stops = await prisma.turfStop.findMany({
      where: { turfId: canvassingTurfId, turf: { campaignId } },
      select: { contactId: true },
    });
    const turfContactIds = stops.map((s) => s.contactId);
    if (turfContactIds.length > 0) {
      // Merge with any existing id filter
      if (where.id && typeof where.id === "object" && "in" in (where.id as object)) {
        const existingIds = (where.id as { in: string[] }).in;
        where.id = { in: existingIds.filter((id) => turfContactIds.includes(id)) };
      } else {
        where.id = { in: turfContactIds };
      }
    }
  }

  const contacts = await prisma.contact.findMany({
    where,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      address1: true,
      address2: true,
      city: true,
      ward: true,
      supportLevel: true,
      followUpNeeded: true,
      notes: true,
      signRequested: true,
      signPlaced: true,
    },
    orderBy: [{ address1: "asc" }, { lastName: "asc" }],
  });

  const data = contacts.map((c) => ({
    id: c.id,
    firstName: c.firstName,
    lastName: c.lastName,
    phone: c.phone,
    address1: c.address1,
    address2: c.address2,
    city: c.city,
    ward: c.ward,
    supportLevel: c.supportLevel,
    followUpNeeded: c.followUpNeeded,
    notes: c.notes,
    signRequested: c.signRequested,
    hasSign: c.signPlaced,
  }));

  return NextResponse.json({ data });
}
