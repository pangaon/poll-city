import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const resultEntrySchema = z.object({
  campaignId: z.string().min(1),
  province: z.string().min(1).max(2),
  municipality: z.string().min(1).max(200),
  ward: z.string().max(100).nullish(),
  office: z.string().min(1).max(200),
  candidateName: z.string().min(1).max(200),
  party: z.string().max(100).nullish(),
  votes: z.number().int().min(0),
  percentReporting: z.number().min(0).max(100).optional().default(0),
  ocrAssisted: z.boolean().optional().default(false),
});

export async function POST(request: NextRequest) {
  const { session, error } = await apiAuth(request);
  if (error) return error;

  const rawBody = await request.json().catch(() => null);
  const parsed = resultEntrySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }
  const body = parsed.data;
  const { campaignId, ocrAssisted } = body;

  // Verify user is an active member of this campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
    select: { status: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check for existing first entry — scoped to this campaign to prevent cross-campaign matching
  const existing = await prisma.liveResult.findFirst({
    where: {
      campaignId,
      province: body.province,
      municipality: body.municipality,
      ward: body.ward ?? null,
      candidateName: body.candidateName,
      entryTwoUserId: null, // not yet double-entered
    },
  });

  if (existing && existing.entryOneUserId !== session!.user.id) {
    // Second entry by a different user in the same campaign
    if (existing.votes === body.votes) {
      // Match — verify
      const updated = await prisma.liveResult.update({
        where: { id: existing.id },
        data: {
          entryTwoUserId: session!.user.id,
          isVerified: true,
          percentReporting: body.percentReporting ?? existing.percentReporting,
        },
      });
      return NextResponse.json({ data: updated, verified: true });
    } else {
      // Mismatch — flag for review
      return NextResponse.json({
        error: "Vote count mismatch",
        existingVotes: existing.votes,
        submittedVotes: body.votes,
        resultId: existing.id,
      }, { status: 409 });
    }
  }

  // First entry
  const result = await prisma.liveResult.create({
    data: {
      campaignId,
      province: body.province,
      municipality: body.municipality,
      ward: body.ward ?? null,
      office: body.office,
      candidateName: body.candidateName,
      party: body.party ?? null,
      votes: body.votes,
      percentReporting: body.percentReporting ?? 0,
      entryOneUserId: session!.user.id,
      ocrAssisted,
    },
  });

  return NextResponse.json({ data: result, verified: false, message: "Awaiting second entry" }, { status: 201 });
}
