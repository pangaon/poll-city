import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const resultEntrySchema = z.object({
  province: z.string().min(1),
  municipality: z.string().min(1),
  ward: z.string().nullish(),
  office: z.string().min(1),
  candidateName: z.string().min(1),
  party: z.string().nullish(),
  votes: z.number().int().min(0),
  percentReporting: z.number().min(0).max(100).optional().default(0),
});

export async function POST(request: NextRequest) {
  const { session, error } = await apiAuth(request);
  if (error) return error;

  const rawBody = await request.json().catch(() => null);
  const parsed = resultEntrySchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }
  const body = parsed.data;

  // Check for existing first entry (match on province+municipality+ward+candidateName)
  const existing = await prisma.liveResult.findFirst({
    where: {
      province: body.province,
      municipality: body.municipality,
      ward: body.ward ?? null,
      candidateName: body.candidateName,
      entryTwoUserId: null, // not yet double-entered
    },
  });

  if (existing && existing.entryOneUserId !== session!.user.id) {
    // Second entry by different user
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
      province: body.province,
      municipality: body.municipality,
      ward: body.ward ?? null,
      office: body.office,
      candidateName: body.candidateName,
      party: body.party ?? null,
      votes: body.votes,
      percentReporting: body.percentReporting ?? 0,
      entryOneUserId: session!.user.id,
    },
  });

  return NextResponse.json({ data: result, verified: false, message: "Awaiting second entry" }, { status: 201 });
}
