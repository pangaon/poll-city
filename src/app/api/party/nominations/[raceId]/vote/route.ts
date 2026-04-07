import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { computeRankedBallotResult } from "@/lib/party/ranked-ballot";

export async function GET(req: NextRequest, { params }: { params: { raceId: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const race = await prisma.nominationRace.findUnique({
    where: { id: params.raceId },
    include: { nominees: true },
  });

  if (!race) return NextResponse.json({ error: "Race not found" }, { status: 404 });

  const votes = await prisma.nominationVote.findMany({
    where: { raceId: params.raceId },
  });

  const ballots = votes.map(v => ({
    voterId: v.voterId,
    rankings: v.rankings as { nomineeId: string; rank: number }[],
  }));

  const result = computeRankedBallotResult(ballots);

  return NextResponse.json({ race, result });
}

export async function POST(req: NextRequest, { params }: { params: { raceId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const body = await req.json();

  if (!Array.isArray(body.rankings) || body.rankings.length === 0) {
    return NextResponse.json({ error: "rankings array is required" }, { status: 400 });
  }

  const race = await prisma.nominationRace.findUnique({ where: { id: params.raceId } });
  if (!race) return NextResponse.json({ error: "Race not found" }, { status: 404 });
  if (race.status !== "open") {
    return NextResponse.json({ error: "Race is not open for voting" }, { status: 400 });
  }

  // Check for duplicate vote
  const existing = await prisma.nominationVote.findFirst({
    where: { raceId: params.raceId, voterId: userId },
  });
  if (existing) {
    return NextResponse.json({ error: "You have already voted in this race" }, { status: 409 });
  }

  const vote = await prisma.nominationVote.create({
    data: {
      raceId: params.raceId,
      voterId: userId,
      rankings: body.rankings,
    },
  });

  return NextResponse.json({ vote }, { status: 201 });
}
