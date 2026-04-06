import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

/**
 * GET /api/contacts/streets?campaignId=xxx&q=ban
 * Returns distinct street names in a campaign (for canvassing filter)
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "contacts:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const q = req.nextUrl.searchParams.get("q")?.trim().toUpperCase() ?? "";

  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Get distinct street names
  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
      isDeceased: false,
      streetName: q ? { contains: q, mode: "insensitive" } : { not: null },
    },
    select: { streetName: true },
    distinct: ["streetName"],
    orderBy: { streetName: "asc" },
    take: 50,
  });

  const streets = contacts
    .map(c => c.streetName?.toUpperCase())
    .filter(Boolean) as string[];

  return NextResponse.json({ data: streets });
}
