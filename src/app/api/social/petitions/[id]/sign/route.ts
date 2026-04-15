import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { rateLimit } from "@/lib/rate-limit";
import { z } from "zod";

const CREDITS_FOR_PETITION = 15;

const signSchema = z.object({
  name:  z.string().min(1).max(100),
  email: z.string().email().optional(),
});

/**
 * POST /api/social/petitions/[id]/sign
 *
 * Signs a petition for the current authenticated user.
 * - Returns 409 if already signed.
 * - Awards +15 civic credits to VoterPassport (upsert).
 * - Writes a CivicCredit ledger record.
 * - Requires authentication — anonymous signing is out of scope.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user.id;
  const petitionId = params.id;

  let body: unknown;
  try { body = await req.json(); }
  catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const parsed = signSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten() },
      { status: 422 }
    );
  }

  // Load petition
  const petition = await prisma.petition.findUnique({
    where: { id: petitionId },
    select: { id: true, isPublic: true, status: true },
  });

  if (!petition || !petition.isPublic || petition.status !== "active") {
    return NextResponse.json({ error: "Petition not found or closed" }, { status: 404 });
  }

  // Idempotency — prevent double signing
  const existing = await prisma.petitionSignature.findFirst({
    where: { petitionId, userId },
    select: { id: true },
  });
  if (existing) {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }

  // Sign + award credits atomically
  await prisma.$transaction([
    prisma.petitionSignature.create({
      data: {
        petitionId,
        userId,
        name:    parsed.data.name,
        email:   parsed.data.email ?? null,
        isPublic: false,
      },
    }),
    prisma.voterPassport.upsert({
      where:  { userId },
      create: {
        userId,
        credits:         CREDITS_FOR_PETITION,
        petitionsSigned: 1,
        badges:          [],
      },
      update: {
        credits:         { increment: CREDITS_FOR_PETITION },
        petitionsSigned: { increment: 1 },
      },
    }),
    prisma.civicCredit.create({
      data: {
        userId,
        action:      "petition_signed",
        credits:     CREDITS_FOR_PETITION,
        description: `Signed petition: ${petitionId}`,
      },
    }),
  ]);

  return NextResponse.json({ data: { signed: true } }, { status: 201 });
}
