import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { Prisma } from "@prisma/client";

const submitSchema = z.object({
  locationId: z.string().min(1),
  results: z.array(z.object({
    candidateId: z.string().min(1),
    votes: z.number().int().min(0),
  })).min(1),
  totalVotes: z.number().int().min(0).nullish(),
  rejectedBallots: z.number().int().min(0).nullish(),
  percentReporting: z.number().min(0).max(100).default(100),
  notes: z.string().max(2000).nullish(),
  captureMode: z.enum(["manual", "ocr", "import"]).default("manual"),
  // For draft saves
  isDraft: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  // Load the event and validate membership in one round-trip
  const event = await prisma.captureEvent.findFirst({
    where: { id: params.eventId, deletedAt: null },
    include: {
      candidates: { where: { isWithdrawn: false } },
    },
  });
  if (!event) return NextResponse.json({ error: "Event not found" }, { status: 404 });
  if (event.status === "locked" || event.status === "archived") {
    return NextResponse.json({ error: "This event is closed for submissions" }, { status: 409 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  const parsed = submitSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", issues: parsed.error.issues }, { status: 400 });
  }
  const data = parsed.data;

  // Validate location belongs to event
  const location = await prisma.captureLocation.findFirst({
    where: { id: data.locationId, eventId: params.eventId },
  });
  if (!location) return NextResponse.json({ error: "Location not found in this event" }, { status: 400 });

  // Validate all candidate IDs belong to this event
  const validCandidateIds = new Set(event.candidates.map((c) => c.id));
  const invalidCandidates = data.results.filter((r) => !validCandidateIds.has(r.candidateId));
  if (invalidCandidates.length > 0) {
    return NextResponse.json({ error: "Invalid candidate IDs in results" }, { status: 400 });
  }

  // Anomaly detection — flag if any candidate vote count seems out of range
  let issueFlag = false;
  if (event.anomalyThreshold && data.totalVotes) {
    const expectedPerCandidate = data.totalVotes / (event.candidates.length || 1);
    const anomalous = data.results.some((r) => {
      const deviation = Math.abs(r.votes - expectedPerCandidate) / (expectedPerCandidate || 1);
      return deviation > (event.anomalyThreshold! / 100);
    });
    if (anomalous) issueFlag = true;
  }

  // Compute totalVotes from results if not provided
  const computedTotal = data.totalVotes ?? data.results.reduce((sum, r) => sum + r.votes, 0);

  const submissionStatus = data.isDraft
    ? ("draft" as const)
    : issueFlag
    ? ("flagged" as const)
    : ("pending_review" as const);

  // Double-entry logic: find an existing pending submission for this location by a different user
  let pairedSubmissionId: string | null = null;
  let finalStatus: "draft" | "pending_review" | "flagged" | "approved" = submissionStatus;

  if (!data.isDraft && event.requireDoubleEntry) {
    const existing = await prisma.captureSubmission.findFirst({
      where: {
        eventId: params.eventId,
        locationId: data.locationId,
        isFirstEntry: true,
        pairedSubmissionId: null,
        submittedById: { not: session!.user.id },
        status: { in: ["pending_review", "flagged"] },
      },
      include: { results: true },
    });

    if (existing) {
      // Compare vote totals per candidate
      const existingMap = new Map(existing.results.map((r) => [r.candidateId, r.votes]));
      const allMatch = data.results.every((r) => existingMap.get(r.candidateId) === r.votes);

      if (allMatch) {
        // Verified — auto-approve both
        pairedSubmissionId = existing.id;
        finalStatus = "approved" as const;
        await prisma.captureSubmission.update({
          where: { id: existing.id },
          data: { status: "approved", pairedSubmissionId: "PENDING_NEW_ID" },
        });
      } else {
        // Mismatch — flag both
        finalStatus = "flagged" as const;
        await prisma.captureSubmission.update({
          where: { id: existing.id },
          data: { status: "flagged" },
        });
      }
    }
  }

  // Create submission with results in a transaction
  const submission = await prisma.$transaction(async (tx) => {
    const sub = await tx.captureSubmission.create({
      data: {
        eventId: params.eventId,
        locationId: data.locationId,
        campaignId: event.campaignId,
        submittedById: session!.user.id,
        status: finalStatus,
        captureMode: data.captureMode,
        notes: data.notes ?? null,
        issueFlag,
        totalVotes: computedTotal,
        rejectedBallots: data.rejectedBallots ?? null,
        percentReporting: data.percentReporting,
        isFirstEntry: !pairedSubmissionId,
        pairedSubmissionId,
        submittedAt: data.isDraft ? null : new Date(),
        results: {
          create: data.results.map((r) => ({
            candidateId: r.candidateId,
            votes: r.votes,
          })),
        },
      },
      include: { results: true },
    });

    // Back-link the paired submission
    if (pairedSubmissionId && pairedSubmissionId !== "PENDING_NEW_ID") {
      await tx.captureSubmission.update({
        where: { id: pairedSubmissionId },
        data: { pairedSubmissionId: sub.id },
      });
    } else if (pairedSubmissionId === "PENDING_NEW_ID") {
      // Find the existing one and update
      await tx.captureSubmission.updateMany({
        where: {
          eventId: params.eventId,
          locationId: data.locationId,
          isFirstEntry: true,
          pairedSubmissionId: "PENDING_NEW_ID",
        },
        data: { pairedSubmissionId: sub.id },
      });
    }

    // Update location status when approved
    if (finalStatus === "approved") {
      await tx.captureLocation.update({
        where: { id: data.locationId },
        data: { status: "completed" },
      });
    }

    return sub;
  });

  return NextResponse.json(
    {
      data: submission,
      verified: finalStatus === "approved",
      mismatch: finalStatus === "flagged" && !!pairedSubmissionId,
      message: data.isDraft
        ? "Draft saved"
        : finalStatus === "approved"
        ? "Results verified and approved"
        : finalStatus === "flagged"
        ? "Flagged for review — mismatch or anomaly detected"
        : "Submitted — awaiting review",
    },
    { status: 201 }
  );
}
