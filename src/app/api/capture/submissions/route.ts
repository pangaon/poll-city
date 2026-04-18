import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const eventId = req.nextUrl.searchParams.get("eventId");
  const statusParam = req.nextUrl.searchParams.get("status");

  if (!eventId) return NextResponse.json({ error: "eventId required" }, { status: 400 });

  const event = await prisma.captureEvent.findFirst({
    where: { id: eventId, deletedAt: null },
    select: { campaignId: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const statuses = statusParam ? statusParam.split(",").map((s) => s.trim()) : undefined;

  const submissions = await prisma.captureSubmission.findMany({
    where: {
      eventId,
      ...(statuses && statuses.length > 0 ? { status: { in: statuses as ("draft" | "pending_review" | "approved" | "rejected" | "flagged")[] } } : {}),
      status: { not: "draft" },
    },
    include: {
      results: { include: { candidate: { select: { id: true, name: true, party: true } } } },
      submittedBy: { select: { id: true, name: true } },
      location: { select: { id: true, name: true, ward: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    data: submissions.map((s) => ({
      ...s,
      submittedAt: s.submittedAt?.toISOString() ?? null,
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
      reviewedAt: s.reviewedAt?.toISOString() ?? null,
    })),
  });
}
