/**
 * GET /api/briefing/health-score — Campaign health composite score (0-100).
 *
 * This is the single number that tells a candidate "how am I doing?"
 * Weighted composite of:
 * - Contact coverage (do you have enough contacts?) — 20%
 * - Voter ID rate (do you know who supports you?) — 25%
 * - Canvassing pace (are you knocking enough doors?) — 20%
 * - Volunteer strength (do you have enough people?) — 15%
 * - Finance health (are you on budget?) — 10%
 * - Sign coverage (are you visible?) — 10%
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { SupportLevel } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "analytics:read");
  if (forbidden) return forbidden;

  const cid = campaignId!;
  const campaign = await prisma.campaign.findUnique({
    where: { id: cid },
    select: { electionDate: true, spendingLimit: true },
  });

  const daysToElection = campaign?.electionDate
    ? Math.ceil((campaign.electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    : null;

  const [
    totalContacts,
    identifiedContacts,
    supporters,
    doorsThisWeek,
    activeVolunteers,
    totalSigns,
    totalSpent,
  ] = await Promise.all([
    prisma.contact.count({ where: { campaignId: cid } }),
    prisma.contact.count({ where: { campaignId: cid, supportLevel: { not: SupportLevel.unknown } } }),
    prisma.contact.count({ where: { campaignId: cid, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } } }),
    prisma.interaction.count({
      where: { contact: { campaignId: cid }, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }),
    prisma.volunteerProfile.count({ where: { campaignId: cid } }),
    prisma.sign.count({ where: { campaignId: cid } }),
    prisma.budgetItem.aggregate({ where: { campaignId: cid, itemType: "expense" }, _sum: { amount: true } }).then((r) => Number(r._sum.amount ?? 0)),
  ]);

  // Scoring (each 0-100, then weighted)
  const spendingLimit = campaign?.spendingLimit ?? 25000;

  // Contact coverage: 500+ contacts = 100, 0 = 0
  const contactScore = Math.min(100, Math.round((totalContacts / 500) * 100));

  // Voter ID rate: identified / total
  const idRate = totalContacts > 0 ? identifiedContacts / totalContacts : 0;
  const idScore = Math.min(100, Math.round(idRate * 130)); // 77% ID = 100

  // Canvassing pace: 100+ doors/week = great
  const paceTarget = daysToElection && daysToElection < 30 ? 200 : 100;
  const paceScore = Math.min(100, Math.round((doorsThisWeek / paceTarget) * 100));

  // Volunteer strength: 10+ = great
  const volTarget = daysToElection && daysToElection < 30 ? 20 : 10;
  const volScore = Math.min(100, Math.round((activeVolunteers / volTarget) * 100));

  // Finance: spending under 80% of limit = healthy
  const spendRatio = spendingLimit > 0 ? totalSpent / spendingLimit : 0;
  const financeScore = spendRatio <= 0.8 ? 100 : spendRatio <= 0.95 ? 60 : 20;

  // Signs: 20+ = solid
  const signScore = Math.min(100, Math.round((totalSigns / 20) * 100));

  // Weighted composite
  const healthScore = Math.round(
    contactScore * 0.20 +
    idScore * 0.25 +
    paceScore * 0.20 +
    volScore * 0.15 +
    financeScore * 0.10 +
    signScore * 0.10
  );

  const grade =
    healthScore >= 80 ? "A" :
    healthScore >= 65 ? "B" :
    healthScore >= 50 ? "C" :
    healthScore >= 35 ? "D" : "F";

  return NextResponse.json({
    healthScore,
    grade,
    breakdown: {
      contacts: { score: contactScore, weight: 20, value: totalContacts, label: "Contact coverage" },
      voterID: { score: idScore, weight: 25, value: Math.round(idRate * 100), label: "Voter ID rate", unit: "%" },
      canvassing: { score: paceScore, weight: 20, value: doorsThisWeek, label: "Doors this week" },
      volunteers: { score: volScore, weight: 15, value: activeVolunteers, label: "Active volunteers" },
      finance: { score: financeScore, weight: 10, value: Math.round(spendRatio * 100), label: "Budget usage", unit: "%" },
      signs: { score: signScore, weight: 10, value: totalSigns, label: "Signs deployed" },
    },
    daysToElection,
  }, { headers: { "Cache-Control": "no-store" } });
}
