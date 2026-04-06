/**
 * GET /api/analytics/campaign — Campaign-wide analytics overview.
 * Returns aggregate stats for contacts, canvassing, support, volunteers, finance, signs.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuthWithPermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuthWithPermission(req, "analytics:read");
  if (error) return error;

  const campaignId = (session.user as any).activeCampaignId as string;
  if (!campaignId) return NextResponse.json({ error: "No active campaign" }, { status: 403 });

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  const monthAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

  const [
    totalContacts,
    supportBreakdown,
    doorsToday,
    doorsThisWeek,
    doorsTotal,
    activeVolunteers,
    totalSigns,
    donationStats,
    eventsUpcoming,
    contactsThisWeek,
    contactsThisMonth,
  ] = await Promise.all([
    prisma.contact.count({ where: { campaignId } }),
    prisma.contact.groupBy({ by: ["supportLevel"], where: { campaignId }, _count: true }),
    prisma.interaction.count({ where: { contact: { campaignId }, createdAt: { gte: today } } }),
    prisma.interaction.count({ where: { contact: { campaignId }, createdAt: { gte: weekAgo } } }),
    prisma.interaction.count({ where: { contact: { campaignId } } }),
    prisma.volunteerProfile.count({ where: { campaignId } }),
    prisma.sign.count({ where: { campaignId } }),
    prisma.donation.aggregate({ where: { campaignId }, _sum: { amount: true }, _count: true }),
    prisma.event.count({ where: { campaignId, eventDate: { gte: today } } }),
    prisma.contact.count({ where: { campaignId, createdAt: { gte: weekAgo } } }),
    prisma.contact.count({ where: { campaignId, createdAt: { gte: monthAgo } } }),
  ]);

  const support: Record<string, number> = {};
  for (const s of supportBreakdown) support[s.supportLevel] = s._count;

  const supporters = (support["strong_support"] ?? 0) + (support["leaning_support"] ?? 0);
  const against = (support["leaning_against"] ?? 0) + (support["against"] ?? 0);
  const undecided = support["undecided"] ?? 0;
  const unknown = support["unknown"] ?? 0;
  const supportRate = totalContacts > 0 ? Math.round((supporters / totalContacts) * 100) : 0;
  const idRate = totalContacts > 0 ? Math.round(((totalContacts - unknown) / totalContacts) * 100) : 0;

  return NextResponse.json({
    contacts: { total: totalContacts, thisWeek: contactsThisWeek, thisMonth: contactsThisMonth },
    support: { supporters, against, undecided, unknown, supportRate, idRate, breakdown: support },
    canvassing: { doorsToday, doorsThisWeek, doorsTotal },
    team: { activeVolunteers },
    signs: { total: totalSigns },
    finance: { donationTotal: Number(donationStats._sum.amount ?? 0), donationCount: donationStats._count },
    events: { upcoming: eventsUpcoming },
  });
}
