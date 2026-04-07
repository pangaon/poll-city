import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { awardCivicCredits } from "@/lib/civic-credits";
import { z } from "zod";

const signPetitionSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().nullish(),
  isPublic: z.boolean().optional().default(false),
});

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const petitionId = params.id;

  const petition = await prisma.petition.findUnique({ where: { id: petitionId } });
  if (!petition) {
    return NextResponse.json({ error: "Petition not found" }, { status: 404 });
  }

  if (petition.status !== "active") {
    return NextResponse.json({ error: "Petition is not active" }, { status: 400 });
  }

  // Check if already signed
  const existing = await prisma.petitionSignature.findFirst({
    where: { petitionId, userId },
  });
  if (existing) {
    return NextResponse.json({ error: "Already signed" }, { status: 409 });
  }

  const body = await req.json();
  const parsed = signPetitionSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const signature = await prisma.petitionSignature.create({
    data: {
      petitionId,
      userId,
      name: parsed.data.name ?? session!.user!.name ?? "Anonymous",
      email: parsed.data.email ?? null,
      isPublic: parsed.data.isPublic,
    },
  });

  const { credits, newBadges } = await awardCivicCredits(
    userId,
    "SIGN_PETITION",
    `Signed petition: ${petition.title}`
  );

  // Update passport
  await prisma.voterPassport.upsert({
    where: { userId },
    create: { userId, petitionsSigned: 1 },
    update: { petitionsSigned: { increment: 1 } },
  });

  return NextResponse.json({ signature, creditsAwarded: credits, newBadges }, { status: 201 });
}
