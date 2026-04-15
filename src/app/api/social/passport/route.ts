import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * GET /api/social/passport
 *
 * Returns the VoterPassport stats for the currently authenticated user.
 * If no passport record exists yet (user hasn't taken any civic actions),
 * returns zeros across all fields — never 404.
 *
 * Requires authentication. Unauthenticated requests get 401.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const passport = await prisma.voterPassport.findUnique({
    where: { userId: session!.user.id },
    select: {
      credits: true,
      badges: true,
      pollsParticipated: true,
      petitionsSigned: true,
      electionsParticipated: true,
      eventsAttended: true,
      volunteeredFor: true,
    },
  });

  return NextResponse.json({
    data: passport ?? {
      credits: 0,
      badges: [],
      pollsParticipated: 0,
      petitionsSigned: 0,
      electionsParticipated: 0,
      eventsAttended: 0,
      volunteeredFor: 0,
    },
  });
}
