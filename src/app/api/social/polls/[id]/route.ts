import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/social/polls/[id]
 * Public endpoint: returns community poll data + current vote counts.
 * Used by the feed card after voting to show live results.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    select: {
      id: true,
      question: true,
      type: true,
      totalResponses: true,
      isActive: true,
      endsAt: true,
      targetRegion: true,
      createdByUserId: true,
      campaignId: true,
      officialId: true,
      options: { orderBy: { order: "asc" }, select: { id: true, text: true, order: true } },
    },
  });

  if (!poll) return NextResponse.json({ error: "Poll not found" }, { status: 404 });

  // Only expose community polls (no campaign / official attachment)
  if (poll.campaignId || poll.officialId) {
    return NextResponse.json({ error: "Poll not found" }, { status: 404 });
  }

  // Compute per-option counts for the result bars
  let counts: Record<string, number> = {};

  if (poll.totalResponses > 0) {
    if (poll.type === "binary") {
      const rows = await prisma.pollResponse.groupBy({
        by: ["value"],
        where: { pollId: params.id },
        _count: true,
      });
      for (const r of rows) {
        if (r.value) counts[r.value] = r._count;
      }
    } else if (poll.type === "multiple_choice") {
      const rows = await prisma.pollResponse.groupBy({
        by: ["optionId"],
        where: { pollId: params.id, optionId: { not: null } },
        _count: true,
      });
      for (const r of rows) {
        if (r.optionId) counts[r.optionId] = r._count;
      }
    }
  }

  return NextResponse.json({ data: { ...poll, counts } });
}
