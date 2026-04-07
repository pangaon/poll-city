/**
 * GET /api/campaign-cost — Campaign cost calculator.
 * Estimates total campaign cost based on contacts, signs, print, comms, events.
 * Uses Ontario municipal 2026 rules as defaults.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "budget:read");
  if (error) return error;

  const campaignId = session.user.activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const [campaign, contactCount, signCount, printJobCount, eventCount, donationTotal, expenseTotal] = await Promise.all([
    prisma.campaign.findUnique({ where: { id: campaignId }, select: { spendingLimit: true, electionType: true } }),
    prisma.contact.count({ where: { campaignId } }),
    prisma.sign.count({ where: { campaignId } }),
    prisma.printJob.count({ where: { campaignId } }),
    prisma.event.count({ where: { campaignId } }),
    prisma.donation.aggregate({ where: { campaignId }, _sum: { amount: true } }),
    prisma.budgetItem.aggregate({ where: { campaignId, itemType: "expense" }, _sum: { amount: true } }),
  ]);

  // Cost estimates (Ontario municipal defaults)
  const estimates = {
    signs: { quantity: signCount, unitCost: 12.5, total: signCount * 12.5, label: "Lawn signs ($12.50 ea)" },
    doorHangers: { quantity: contactCount, unitCost: 0.35, total: contactCount * 0.35, label: "Door hangers ($0.35 ea)" },
    printJobs: { quantity: printJobCount, avgCost: 150, total: printJobCount * 150, label: "Print jobs (~$150 ea)" },
    events: { quantity: eventCount, avgCost: 200, total: eventCount * 200, label: "Events (~$200 ea)" },
    emailPlatform: { monthly: 30, months: 6, total: 180, label: "Email platform ($30/mo x 6)" },
    smsCost: { perMessage: 0.02, estimatedMessages: contactCount * 3, total: contactCount * 3 * 0.02, label: "SMS ($0.02/msg, 3 per contact)" },
    websiteHosting: { monthly: 20, months: 6, total: 120, label: "Website hosting ($20/mo x 6)" },
    miscellaneous: { total: 500, label: "Miscellaneous (food, supplies)" },
  };

  const estimatedTotal = Object.values(estimates).reduce((sum, item) => sum + (item.total ?? 0), 0);
  const spendingLimit = campaign?.spendingLimit ?? 25000;
  const spentSoFar = Number(expenseTotal._sum.amount ?? 0);
  const donationsRaised = Number(donationTotal._sum.amount ?? 0);
  const remaining = spendingLimit - spentSoFar;
  const fundingGap = estimatedTotal - donationsRaised;

  return NextResponse.json({
    estimates,
    summary: {
      estimatedTotal: Math.round(estimatedTotal),
      spendingLimit,
      spentSoFar: Math.round(spentSoFar),
      remaining: Math.round(remaining),
      donationsRaised: Math.round(donationsRaised),
      fundingGap: Math.round(Math.max(0, fundingGap)),
      utilizationPct: spendingLimit > 0 ? Math.round((spentSoFar / spendingLimit) * 100) : 0,
    },
  });
}
