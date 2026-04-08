import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

// In-memory dedup: cleared on process restart, good enough for live townhalls
const upvoteDedup = new Map<string, boolean>();

function getIp(req: NextRequest): string {
  return (
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    "unknown"
  );
}

export async function POST(
  req: NextRequest,
  { params }: { params: { eventId: string; qid: string } },
) {
  const ip = getIp(req);
  const dedupKey = `${params.qid}:${ip}`;

  if (upvoteDedup.has(dedupKey)) {
    return NextResponse.json({ error: "Already upvoted" }, { status: 409 });
  }

  const question = await prisma.townhallQuestion.findUnique({
    where: { id: params.qid },
    select: { id: true, eventId: true, isHidden: true },
  });

  if (!question || question.eventId !== params.eventId || question.isHidden) {
    return NextResponse.json({ error: "Question not found" }, { status: 404 });
  }

  const updated = await prisma.townhallQuestion.update({
    where: { id: params.qid },
    data: { upvotes: { increment: 1 } },
    select: { upvotes: true },
  });

  upvoteDedup.set(dedupKey, true);

  return NextResponse.json({ upvotes: updated.upvotes });
}
