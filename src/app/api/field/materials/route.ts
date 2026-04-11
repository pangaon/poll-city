import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/materials?campaignId=X ───────────────────────────────────
// Returns print inventory available for field distribution

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const inventory = await prisma.printInventory.findMany({
    where: { campaignId, availableQty: { gt: 0 } },
    orderBy: [{ productType: "asc" }, { sku: "asc" }],
    select: {
      id: true,
      sku: true,
      productType: true,
      description: true,
      totalQty: true,
      availableQty: true,
      reservedQty: true,
      depletedQty: true,
      location: true,
      notes: true,
    },
  });

  return NextResponse.json({ data: inventory });
}
