import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function POST(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sub = await prisma.captureSubmission.findUnique({
    where: { id: params.submissionId },
    include: { event: { select: { campaignId: true, lockAfterApproval: true } } },
  });
  if (!sub) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: sub.event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (sub.status === "approved") {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  const [updated] = await prisma.$transaction([
    prisma.captureSubmission.update({
      where: { id: params.submissionId },
      data: {
        status: "approved",
        reviewedAt: new Date(),
        reviewedById: session!.user.id,
      },
    }),
    // Mark location completed
    prisma.captureLocation.update({
      where: { id: sub.locationId },
      data: { status: "completed" },
    }),
  ]);

  return NextResponse.json({ data: updated });
}
