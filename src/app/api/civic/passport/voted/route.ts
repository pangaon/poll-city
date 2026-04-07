import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { awardCivicCredits, CIVIC_CREDITS } from "@/lib/civic-credits";
import { z } from "zod";

const ELECTION_TYPES = {
  municipal: "VOTED_MUNICIPAL",
  provincial: "VOTED_PROVINCIAL",
  federal: "VOTED_FEDERAL",
} as const;

const votedSchema = z.object({
  electionType: z.enum(["municipal", "provincial", "federal"]),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const body = await req.json();
  const parsed = votedSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const action = ELECTION_TYPES[parsed.data.electionType] as keyof typeof CIVIC_CREDITS;

  const { credits, newBadges } = await awardCivicCredits(
    userId,
    action,
    `Self-reported voting in ${parsed.data.electionType} election`
  );

  // Increment electionsParticipated
  await prisma.voterPassport.update({
    where: { userId },
    data: { electionsParticipated: { increment: 1 } },
  });

  return NextResponse.json({ creditsAwarded: credits, newBadges });
}
