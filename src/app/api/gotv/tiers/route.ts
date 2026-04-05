import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { computeGotvScore, type GotvTier } from "@/lib/gotv/score";
import { z } from "zod";

export const dynamic = "force-dynamic";

const querySchema = z.object({
  campaignId: z.string().min(1),
  tier: z.enum(["1", "2", "3", "4"]).optional(),
});

// GET /api/gotv/tiers?campaignId=...&tier=1
// Returns contacts in the requested tier (or all tiers grouped if no tier).
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const parsed = querySchema.safeParse({
    campaignId: req.nextUrl.searchParams.get("campaignId"),
    tier: req.nextUrl.searchParams.get("tier") ?? undefined,
  });
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { campaignId, tier: tierFilter } = parsed.data;
  const m = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!m) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const contacts = await prisma.contact.findMany({
    where: { campaignId, isDeceased: false, doNotContact: false },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      phone: true,
      address1: true,
      ward: true,
      supportLevel: true,
      gotvStatus: true,
      signRequested: true,
      volunteerInterest: true,
      lastContactedAt: true,
      voted: true,
      votedAt: true,
    },
    take: 5000,
  });

  const scored = contacts.map((c) => {
    const b = computeGotvScore(c);
    return { ...c, gotvScore: b.score, tier: b.tier };
  });

  // Summary counts by tier + voted breakdown
  const summary = {
    totals: { t1: 0, t2: 0, t3: 0, t4: 0, all: scored.length },
    voted: { t1: 0, t2: 0, t3: 0, t4: 0, all: 0 },
  };
  for (const c of scored) {
    const key = (`t${c.tier}` as keyof typeof summary.totals);
    summary.totals[key] += 1;
    if (c.voted) {
      summary.voted[key as keyof typeof summary.voted] += 1;
      summary.voted.all += 1;
    }
  }

  let filtered = scored;
  if (tierFilter) {
    const t = Number.parseInt(tierFilter, 10) as GotvTier;
    if (t >= 1 && t <= 4) {
      filtered = scored.filter((c) => c.tier === t);
    }
  }

  // Sort highest score first, skip voted unless asking for everyone
  filtered.sort((a, b) => {
    if (a.voted !== b.voted) return a.voted ? 1 : -1;
    return b.gotvScore - a.gotvScore;
  });

  return NextResponse.json({
    summary,
    contacts: filtered.slice(0, 500),
    totalInTier: filtered.length,
  });
}
