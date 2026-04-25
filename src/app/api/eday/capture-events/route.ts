import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const isSuperAdmin = session!.user.role === "SUPER_ADMIN";

  if (!isSuperAdmin) {
    const membership = await prisma.membership.findUnique({
      where: { userId_campaignId: { userId: session!.user.id, campaignId } },
      select: { status: true, role: true },
    });
    if (!membership || membership.status !== "active") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const membership = isSuperAdmin ? null : await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    select: { role: true },
  });

  const isManager = isSuperAdmin || ["ADMIN", "CAMPAIGN_MANAGER"].includes(membership?.role ?? "");

  const events = await prisma.captureEvent.findMany({
    where: { campaignId, status: "active", deletedAt: null },
    include: {
      candidates: {
        where: { isWithdrawn: false },
        orderBy: { ballotOrder: "asc" },
        select: { id: true, name: true, party: true, ballotOrder: true },
      },
      _count: { select: { locations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({
    isManager,
    events: events.map((e) => ({
      id: e.id,
      name: e.name,
      eventType: e.eventType,
      office: e.office,
      ward: e.ward,
      municipality: e.municipality,
      requireDoubleEntry: e.requireDoubleEntry,
      allowPartialSubmit: e.allowPartialSubmit,
      candidates: e.candidates,
      locationCount: e._count.locations,
    })),
  });
}
