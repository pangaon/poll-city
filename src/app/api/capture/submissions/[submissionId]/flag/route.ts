import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const flagSchema = z.object({
  reason: z.string().min(1).max(500),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sub = await prisma.captureSubmission.findUnique({
    where: { id: params.submissionId },
    include: { event: { select: { campaignId: true } } },
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

  const body = await req.json().catch(() => null);
  const parsed = flagSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "reason required" }, { status: 400 });

  const updated = await prisma.captureSubmission.update({
    where: { id: params.submissionId },
    data: {
      status: "flagged",
      issueFlag: true,
      notes: sub.notes
        ? `${sub.notes}\n[Flagged by reviewer: ${parsed.data.reason}]`
        : `[Flagged by reviewer: ${parsed.data.reason}]`,
    },
  });

  return NextResponse.json({ data: updated });
}
