/**
 * GET /api/gotv/rides — Contacts who need a ride and haven't voted yet.
 *
 * From SUBJECT-MATTER-BIBLE: "A campaign that systematically offers
 * rides can increase their supported turnout by 5-15%."
 *
 * Searches notes for "ride"/"transportation", plus accessibilityFlag contacts.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contacts = await prisma.contact.findMany({
    where: {
      campaignId,
      voted: false,
      supportLevel: { in: ["strong_support", "leaning_support"] as any[] },
      OR: [
        { notes: { contains: "ride", mode: "insensitive" } },
        { notes: { contains: "transportation", mode: "insensitive" } },
        { notes: { contains: "needs ride", mode: "insensitive" } },
        { accessibilityFlag: true },
      ],
    },
    select: {
      id: true, firstName: true, lastName: true, phone: true,
      address1: true, city: true, postalCode: true, notes: true, accessibilityFlag: true,
    },
    orderBy: { postalCode: "asc" },
  });

  return NextResponse.json({
    contacts: contacts.map((c) => ({
      id: c.id,
      name: `${c.firstName} ${c.lastName}`,
      phone: c.phone,
      address: [c.address1, c.city, c.postalCode].filter(Boolean).join(", "),
      accessibilityNeeds: c.accessibilityFlag,
      notes: c.notes,
    })),
    total: contacts.length,
  });
}
