/**
 * GET /api/benchmarks — Campaign health benchmarks.
 *
 * "Am I on track?" — the question every first-time candidate asks.
 *
 * Compares the current campaign's metrics against ideal benchmarks
 * for their election type and days-to-election phase.
 * Based on George's 35 years of Canadian campaign experience.
 *
 * Returns: where you are, where you should be, what to focus on.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { SupportLevel } from "@prisma/client";

/** Benchmarks by days-to-election phase */
const BENCHMARKS: Record<string, {
  contacts: number;
  idRate: number;
  doorsPerWeek: number;
  volunteers: number;
  donations: number;
  signs: number;
  supportRate: number;
  description: string;
}> = {
  "180+": {
    contacts: 500, idRate: 10, doorsPerWeek: 0, volunteers: 5,
    donations: 10, signs: 0, supportRate: 5,
    description: "Foundation — get your voter list imported, recruit your first volunteers, set up your brand.",
  },
  "90-180": {
    contacts: 2000, idRate: 20, doorsPerWeek: 50, volunteers: 10,
    donations: 30, signs: 0, supportRate: 15,
    description: "Building — canvass every weekend, start fundraising, identify your supporters.",
  },
  "30-90": {
    contacts: 4000, idRate: 45, doorsPerWeek: 150, volunteers: 20,
    donations: 80, signs: 20, supportRate: 25,
    description: "Momentum — canvass 5 days a week, deploy signs, increase comms frequency.",
  },
  "10-30": {
    contacts: 5000, idRate: 60, doorsPerWeek: 300, volunteers: 30,
    donations: 120, signs: 50, supportRate: 35,
    description: "GOTV prep — build priority lists, confirm supporters, arrange rides, final fundraising push.",
  },
  "0-10": {
    contacts: 5000, idRate: 70, doorsPerWeek: 200, volunteers: 40,
    donations: 140, signs: 75, supportRate: 40,
    description: "GOTV final — every action is about getting confirmed supporters to the polls. Nothing else matters.",
  },
};

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "analytics:read");
  if (forbidden) return forbidden;

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { electionDate: true, electionType: true, spendingLimit: true },
  });

  const daysToElection = campaign?.electionDate
    ? Math.ceil((campaign.electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const phase = !daysToElection ? "180+"
    : daysToElection > 180 ? "180+"
    : daysToElection > 90 ? "90-180"
    : daysToElection > 30 ? "30-90"
    : daysToElection > 10 ? "10-30" : "0-10";

  const benchmark = BENCHMARKS[phase];
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  const [totalContacts, identified, supporters, doorsThisWeek, volunteers, donations, signs] = await Promise.all([
    prisma.contact.count({ where: { campaignId } }),
    prisma.contact.count({ where: { campaignId, supportLevel: { not: SupportLevel.unknown } } }),
    prisma.contact.count({ where: { campaignId, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } } }),
    prisma.interaction.count({ where: { contact: { campaignId }, createdAt: { gte: weekAgo } } }),
    prisma.volunteerProfile.count({ where: { campaignId } }),
    prisma.donation.count({ where: { campaignId } }),
    prisma.sign.count({ where: { campaignId } }),
  ]);

  const idRate = totalContacts > 0 ? Math.round((identified / totalContacts) * 100) : 0;
  const supportRate = totalContacts > 0 ? Math.round((supporters / totalContacts) * 100) : 0;

  function score(actual: number, target: number): { actual: number; target: number; pct: number; status: "ahead" | "on_track" | "behind" | "critical" } {
    const pct = target > 0 ? Math.round((actual / target) * 100) : actual > 0 ? 100 : 0;
    const status = pct >= 100 ? "ahead" : pct >= 70 ? "on_track" : pct >= 40 ? "behind" : "critical";
    return { actual, target, pct, status };
  }

  const metrics = {
    contacts: score(totalContacts, benchmark.contacts),
    idRate: score(idRate, benchmark.idRate),
    doorsPerWeek: score(doorsThisWeek, benchmark.doorsPerWeek),
    volunteers: score(volunteers, benchmark.volunteers),
    donations: score(donations, benchmark.donations),
    signs: score(signs, benchmark.signs),
    supportRate: score(supportRate, benchmark.supportRate),
  };

  // Overall readiness score
  const allPcts = Object.values(metrics).map((m) => Math.min(100, m.pct));
  const readiness = Math.round(allPcts.reduce((s, p) => s + p, 0) / allPcts.length);

  // Top recommendation
  const weakest = Object.entries(metrics).sort((a, b) => a[1].pct - b[1].pct)[0];
  const recommendations: Record<string, string> = {
    contacts: "Import your voter list. This is the foundation everything else depends on.",
    idRate: "Knock more doors. Every conversation identifies a voter and builds your intelligence.",
    doorsPerWeek: "Increase your canvassing pace. Recruit more volunteers for evening and weekend shifts.",
    volunteers: "Recruit volunteers at every event, every door knock, every social media post.",
    donations: "Ask for donations. Be specific: '$50 by Friday for lawn signs.'",
    signs: "Deploy lawn signs. They signal viability and create conversation.",
    supportRate: "Focus on undecided voters. They are your growth opportunity.",
  };

  return NextResponse.json({
    phase,
    daysToElection,
    phaseDescription: benchmark.description,
    readiness,
    readinessGrade: readiness >= 80 ? "A" : readiness >= 65 ? "B" : readiness >= 50 ? "C" : readiness >= 35 ? "D" : "F",
    metrics,
    topRecommendation: weakest ? { metric: weakest[0], ...weakest[1], advice: recommendations[weakest[0]] } : null,
  });
}
