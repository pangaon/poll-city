import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * POST /api/social/candidates/[id]/support
 *
 * Records general support for a candidate on Poll City Social.
 * - Creates a SupportSignal (public aggregate)
 * - If the candidate is linked to an Official, delegates to OfficialFollow (full consent bridge)
 * - If no Official link, records signal only (campaign CRM bridge fires when they claim their profile)
 *
 * Idempotent: returns current state if called multiple times.
 *
 * DELETE: Remove support signal.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: params.id },
    select: { id: true, fullName: true, officialId: true, campaignStatus: true },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const userId = session!.user.id;

  // If candidate is already linked to an Official, use the full OfficialFollow flow
  if (candidate.officialId) {
    const existing = await prisma.officialFollow.findUnique({
      where: { userId_officialId: { userId, officialId: candidate.officialId } },
    });
    if (existing) {
      return NextResponse.json({ supporting: true, candidateId: params.id });
    }
    await prisma.officialFollow.create({
      data: { userId, officialId: candidate.officialId },
    });
    return NextResponse.json({ supporting: true, candidateId: params.id });
  }

  // No Official link — record SupportSignal against candidateProfileId (stored in message field)
  const existing = await prisma.supportSignal.findFirst({
    where: { userId, type: "general_support", message: `candidate:${params.id}` },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ supporting: true, candidateId: params.id });
  }

  await prisma.supportSignal.create({
    data: {
      userId,
      type: "general_support",
      message: `candidate:${params.id}`,
      isPublic: true,
    },
  });

  return NextResponse.json({ supporting: true, candidateId: params.id });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "form");
  if (rateLimitResponse) return rateLimitResponse;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const candidate = await prisma.candidateProfile.findUnique({
    where: { id: params.id },
    select: { id: true, officialId: true },
  });
  if (!candidate) {
    return NextResponse.json({ error: "Candidate not found" }, { status: 404 });
  }

  const userId = session!.user.id;

  if (candidate.officialId) {
    await prisma.officialFollow.deleteMany({
      where: { userId, officialId: candidate.officialId },
    });
  } else {
    await prisma.supportSignal.deleteMany({
      where: { userId, type: "general_support", message: `candidate:${params.id}` },
    });
  }

  return NextResponse.json({ supporting: false, candidateId: params.id });
}
