import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/social/leaderboard
 *
 * Returns the top civic credits leaders from VoterPassport.
 * Names are anonymized: first name + last initial (e.g. "Sarah M.").
 * Only users with at least 1 credit appear.
 *
 * Query params:
 *   limit — max entries (default 10, max 25)
 */
export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "read");
  if (limited) return limited;

  const sp = req.nextUrl.searchParams;
  const rawLimit = parseInt(sp.get("limit") ?? "10", 10);
  const limit = Math.min(Math.max(rawLimit, 1), 25);

  const entries = await prisma.voterPassport.findMany({
    where: { credits: { gt: 0 } },
    orderBy: { credits: "desc" },
    take: limit,
    select: {
      credits: true,
      badges:  true,
      user: {
        select: { name: true },
      },
    },
  });

  const data = entries.map((e, i) => {
    const fullName = e.user.name ?? "Anonymous";
    const parts = fullName.trim().split(/\s+/);
    const firstName = parts[0] ?? "Civic";
    const lastInitial = parts.length > 1 ? `${parts[parts.length - 1][0]}.` : "";
    const displayName = lastInitial ? `${firstName} ${lastInitial}` : firstName;

    return {
      rank:   i + 1,
      name:   displayName,
      credits: e.credits,
      badges:  e.badges.length,
    };
  });

  return NextResponse.json({ data });
}
