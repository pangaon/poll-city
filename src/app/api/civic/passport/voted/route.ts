import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { awardCivicCredits, CIVIC_CREDITS } from "@/lib/civic-credits";

const ELECTION_TYPES = {
  municipal: "VOTED_MUNICIPAL",
  provincial: "VOTED_PROVINCIAL",
  federal: "VOTED_FEDERAL",
} as const;

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const body = await req.json();

  const electionType = body.electionType as string;
  if (!electionType || !(electionType in ELECTION_TYPES)) {
    return NextResponse.json(
      { error: "electionType must be one of: municipal, provincial, federal" },
      { status: 400 }
    );
  }

  const action = ELECTION_TYPES[electionType as keyof typeof ELECTION_TYPES] as keyof typeof CIVIC_CREDITS;

  const { credits, newBadges } = await awardCivicCredits(
    userId,
    action,
    `Self-reported voting in ${electionType} election`
  );

  // Increment electionsParticipated
  await prisma.voterPassport.update({
    where: { userId },
    data: { electionsParticipated: { increment: 1 } },
  });

  return NextResponse.json({ creditsAwarded: credits, newBadges });
}
