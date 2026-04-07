import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { awardCivicCredits } from "@/lib/civic-credits";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const userId = session!.user!.id as string;
  const promiseId = params.id;

  const promise = await prisma.officialPromise.findUnique({ where: { id: promiseId } });
  if (!promise) {
    return NextResponse.json({ error: "Promise not found" }, { status: 404 });
  }

  // Check if already tracking
  const existing = await prisma.promiseTracker.findUnique({
    where: { promiseId_userId: { promiseId, userId } },
  });
  if (existing) {
    return NextResponse.json({ error: "Already tracking this promise" }, { status: 409 });
  }

  const tracker = await prisma.promiseTracker.create({
    data: { promiseId, userId },
  });

  const { credits, newBadges } = await awardCivicCredits(
    userId,
    "TRACK_PROMISE",
    `Tracking promise: ${promise.promise.slice(0, 50)}`
  );

  return NextResponse.json({ tracker, creditsAwarded: credits, newBadges }, { status: 201 });
}
