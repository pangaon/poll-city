import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const limitParam = sp.get("limit");
  const limit = Math.min(100, Math.max(1, parseInt(limitParam ?? "50", 10) || 50));

  if (!campaignId) {
    return NextResponse.json({ error: "campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const stops = await prisma.turfStop.findMany({
    where: {
      turf: { campaignId },
      visited: true,
      visitedAt: { not: null },
    },
    orderBy: { visitedAt: "desc" },
    take: limit,
    include: {
      turf: {
        select: {
          id: true,
          name: true,
          assignedUser: { select: { id: true, name: true } },
        },
      },
      contact: {
        select: {
          firstName: true,
          lastName: true,
          address1: true,
        },
      },
    },
  });

  return NextResponse.json({
    events: stops.map((s) => ({
      id: s.id,
      type: "door_knocked" as const,
      turfId: s.turf.id,
      turfName: s.turf.name,
      userId: s.turf.assignedUser?.id ?? null,
      userName: s.turf.assignedUser?.name ?? null,
      address:
        s.contact.address1 ??
        `${s.contact.firstName} ${s.contact.lastName}`.trim(),
      notes: s.notes ?? null,
      createdAt: s.visitedAt!.toISOString(),
    })),
  });
}
