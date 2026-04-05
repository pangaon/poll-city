import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { computeGotvScore } from "@/lib/gotv/score";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  campaignId: z.string().min(1),
});

// Election day command centre metrics: hourly voting rate, predicted total,
// percentage of Priority 1 contacts who've voted, volunteer field activity.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const parsed = querySchema.safeParse({
    campaignId: req.nextUrl.searchParams.get("campaignId"),
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { campaignId } = parsed.data;

  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!m) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contacts = await prisma.contact.findMany({
    where: { campaignId, isDeceased: false },
    select: {
      id: true,
      supportLevel: true,
      gotvStatus: true,
      signRequested: true,
      volunteerInterest: true,
      lastContactedAt: true,
      voted: true,
      votedAt: true,
    },
  });

  const scored = contacts.map((c) => ({ ...c, ...computeGotvScore(c) }));
  const p1 = scored.filter((c) => c.tier === 1);
  const p1Voted = p1.filter((c) => c.voted).length;
  const totalVoted = scored.filter((c) => c.voted).length;
  const totalVoters = scored.length;

  // Hourly voted rate — last 12 hours, bucketed by hour.
  const now = Date.now();
  const hours: Array<{ hour: string; voted: number }> = [];
  for (let i = 11; i >= 0; i--) {
    const end = new Date(now - i * 60 * 60 * 1000);
    end.setMinutes(0, 0, 0);
    const start = new Date(end.getTime() - 60 * 60 * 1000);
    const count = scored.filter((c) => c.votedAt && c.votedAt >= start && c.votedAt < end).length;
    hours.push({
      hour: end.toLocaleTimeString([], { hour: "numeric" }),
      voted: count,
    });
  }

  // Very simple projection: current vote pace × remaining hours (assumes poll close 20:00)
  const pollClose = new Date();
  pollClose.setHours(20, 30, 0, 0);
  const hoursToClose = Math.max(0, (pollClose.getTime() - now) / (1000 * 60 * 60));
  const recentRate = hours.slice(-3).reduce((s, h) => s + h.voted, 0) / 3;
  const projectedAdditional = Math.round(recentRate * hoursToClose);
  const projectedTotal = totalVoted + projectedAdditional;

  // Outstanding P1 supporters (not voted, have phone)
  const outstandingP1 = scored.filter((c) => c.tier === 1 && !c.voted).length;

  // Recent interactions from last 12h for activity pulse
  const sinceTwelveHours = new Date(now - 12 * 60 * 60 * 1000);
  const recentInteractions = await prisma.interaction.count({
    where: { contact: { campaignId }, createdAt: { gte: sinceTwelveHours } },
  });

  return NextResponse.json({
    summary: {
      totalVoters,
      totalVoted,
      votedPct: totalVoters ? Math.round((totalVoted / totalVoters) * 100) : 0,
      p1Total: p1.length,
      p1Voted,
      p1VotedPct: p1.length ? Math.round((p1Voted / p1.length) * 100) : 0,
      outstandingP1,
      projectedTotal,
      hoursToClose: Math.round(hoursToClose * 10) / 10,
    },
    hourlyVotes: hours,
    recentInteractions,
    electionDayReady: p1.length > 0,
  });
}
