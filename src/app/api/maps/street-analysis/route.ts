/**
 * GET /api/maps/street-analysis?street=Oak+Street — Per-street contact analysis.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "contacts:read");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const street = req.nextUrl.searchParams.get("street");
  if (!street) return NextResponse.json({ error: "street param required" }, { status: 400 });

  const contacts = await prisma.contact.findMany({
    where: { campaignId, deletedAt: null, address1: { contains: street, mode: "insensitive" } },
    select: { id: true, firstName: true, lastName: true, address1: true, supportLevel: true, lastContactedAt: true, phone: true },
    orderBy: { address1: "asc" },
  });

  const total = contacts.length;
  const contacted = contacts.filter((c) => c.lastContactedAt).length;
  const supporters = contacts.filter((c) => c.supportLevel === "strong_support" || c.supportLevel === "leaning_support").length;
  const notContacted = total - contacted;

  return NextResponse.json({
    street,
    total,
    contacted,
    notContacted,
    supporters,
    supportRate: total > 0 ? Math.round((supporters / total) * 100) : 0,
    contacts,
  });
}
