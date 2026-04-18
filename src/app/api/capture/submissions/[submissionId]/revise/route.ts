import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const reviseSchema = z.object({
  reason: z.string().min(1).max(500),
  results: z.array(z.object({
    candidateId: z.string().min(1),
    votes: z.number().int().min(0),
  })).min(1),
  notes: z.string().max(2000).nullish(),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { submissionId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sub = await prisma.captureSubmission.findUnique({
    where: { id: params.submissionId },
    include: {
      event: { select: { campaignId: true, allowCorrections: true } },
      results: true,
    },
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
  if (sub.status === "approved" && !sub.event.allowCorrections) {
    return NextResponse.json({ error: "Corrections not allowed on this event after approval" }, { status: 409 });
  }

  const body = await req.json().catch(() => null);
  const parsed = reviseSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Invalid input" }, { status: 400 });

  const previousValues: Prisma.InputJsonValue = sub.results.map((r) => ({
    candidateId: r.candidateId,
    votes: r.votes,
  }));
  const newValues: Prisma.InputJsonValue = parsed.data.results;
  const newTotal = parsed.data.results.reduce((s, r) => s + r.votes, 0);

  await prisma.$transaction(async (tx) => {
    // Write revision record for audit trail
    await tx.captureSubmissionRevision.create({
      data: {
        submissionId: params.submissionId,
        revisedById: session!.user.id,
        reason: parsed.data.reason,
        previousValues,
        newValues,
      },
    });

    // Delete and recreate results (simpler than upsert for the full set)
    await tx.captureSubmissionResult.deleteMany({ where: { submissionId: params.submissionId } });
    await tx.captureSubmissionResult.createMany({
      data: parsed.data.results.map((r) => ({
        submissionId: params.submissionId,
        candidateId: r.candidateId,
        votes: r.votes,
      })),
    });

    // Update submission totals and re-set to pending review
    await tx.captureSubmission.update({
      where: { id: params.submissionId },
      data: {
        totalVotes: newTotal,
        status: "pending_review",
        issueFlag: false,
        reviewedAt: null,
        reviewedById: null,
        notes: parsed.data.notes !== undefined ? (parsed.data.notes ?? null) : sub.notes,
      },
    });
  });

  const updated = await prisma.captureSubmission.findUnique({
    where: { id: params.submissionId },
    include: { results: { include: { candidate: { select: { id: true, name: true } } } } },
  });

  return NextResponse.json({ data: updated });
}
