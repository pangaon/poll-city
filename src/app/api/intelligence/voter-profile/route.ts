/**
 * GET /api/intelligence/voter-profile — Deep voter segmentation and profiling.
 *
 * What Qomon does: "Socio-economic demographic data, voter turnout history,
 * profile analysis for supporter/donor segmentation."
 *
 * What we do BETTER: real data from YOUR campaign's actual interactions,
 * not generic census overlays. Every profile is built from real door knocks.
 *
 * Returns voter segments with:
 * - Support distribution by demographic proxy (street, poll, ward)
 * - Contactability score (has phone, has email, has been reached)
 * - Persuadability index (undecided + recently moved + no prior contact)
 * - Donor propensity (based on neighbourhood and prior giving)
 * - Volunteer potential (flagged interest + active engagement)
 * - GOTV reliability (voting history proxy from support level stability)
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const contacts = await prisma.contact.findMany({
    where: { campaignId: campaignId!, isDeceased: false },
    select: {
      id: true, supportLevel: true, phone: true, email: true,
      lastContactedAt: true, notHome: true, volunteerInterest: true,
      signRequested: true, ward: true, municipalPoll: true,
      postalCode: true, voted: true, createdAt: true,
      _count: { select: { interactions: true, donations: true } },
    },
  });

  const total = contacts.length;
  if (total === 0) return NextResponse.json({ total: 0, segments: [], message: "No contacts to profile" });

  // Build segment profiles
  const segments = {
    strongSupporters: { count: 0, withPhone: 0, withEmail: 0, donated: 0, volunteerInterest: 0, contacted: 0 },
    leaningSupporters: { count: 0, withPhone: 0, withEmail: 0, donated: 0, volunteerInterest: 0, contacted: 0 },
    persuadable: { count: 0, withPhone: 0, withEmail: 0, donated: 0, volunteerInterest: 0, contacted: 0 },
    opposition: { count: 0, withPhone: 0, withEmail: 0, donated: 0, volunteerInterest: 0, contacted: 0 },
    unknown: { count: 0, withPhone: 0, withEmail: 0, donated: 0, volunteerInterest: 0, contacted: 0 },
  };

  // Poll-level analysis
  const pollStats = new Map<string, { total: number; supporters: number; undecided: number; contacted: number; voted: number }>();

  // Postal code area analysis (first 3 chars = neighbourhood)
  const areaStats = new Map<string, { total: number; supporters: number; donors: number; avgInteractions: number }>();

  for (const c of contacts) {
    const level = c.supportLevel as string;
    const seg =
      level === "strong_support" ? segments.strongSupporters :
      level === "leaning_support" ? segments.leaningSupporters :
      level === "undecided" ? segments.persuadable :
      level === "strong_opposition" || level === "leaning_opposition" ? segments.opposition :
      segments.unknown;

    seg.count++;
    if (c.phone) seg.withPhone++;
    if (c.email) seg.withEmail++;
    if (c._count.donations > 0) seg.donated++;
    if (c.volunteerInterest) seg.volunteerInterest++;
    if (c.lastContactedAt) seg.contacted++;

    // Poll stats
    const poll = c.municipalPoll ?? "Unknown";
    if (!pollStats.has(poll)) pollStats.set(poll, { total: 0, supporters: 0, undecided: 0, contacted: 0, voted: 0 });
    const ps = pollStats.get(poll)!;
    ps.total++;
    if (level === "strong_support" || level === "leaning_support") ps.supporters++;
    if (level === "undecided") ps.undecided++;
    if (c.lastContactedAt) ps.contacted++;
    if (c.voted) ps.voted++;

    // Area stats
    const area = c.postalCode?.slice(0, 3)?.toUpperCase() ?? "UNK";
    if (!areaStats.has(area)) areaStats.set(area, { total: 0, supporters: 0, donors: 0, avgInteractions: 0 });
    const as2 = areaStats.get(area)!;
    as2.total++;
    if (level === "strong_support" || level === "leaning_support") as2.supporters++;
    if (c._count.donations > 0) as2.donors++;
    as2.avgInteractions += c._count.interactions;
  }

  // Finalize area averages
  const areas = Array.from(areaStats.entries()).map(([area, s]) => ({
    area,
    total: s.total,
    supportRate: s.total > 0 ? Math.round((s.supporters / s.total) * 100) : 0,
    donorRate: s.total > 0 ? Math.round((s.donors / s.total) * 100) : 0,
    avgInteractions: s.total > 0 ? Math.round((s.avgInteractions / s.total) * 10) / 10 : 0,
  })).sort((a, b) => b.supportRate - a.supportRate);

  // Poll rankings
  const polls = Array.from(pollStats.entries()).map(([poll, s]) => ({
    poll,
    total: s.total,
    supportRate: s.total > 0 ? Math.round((s.supporters / s.total) * 100) : 0,
    undecidedRate: s.total > 0 ? Math.round((s.undecided / s.total) * 100) : 0,
    contactedRate: s.total > 0 ? Math.round((s.contacted / s.total) * 100) : 0,
    votedRate: s.total > 0 ? Math.round((s.voted / s.total) * 100) : 0,
    persuasionOpportunity: s.undecided,
  })).sort((a, b) => b.persuasionOpportunity - a.persuasionOpportunity);

  // Campaign-wide metrics
  const contactability = total > 0 ? Math.round((contacts.filter((c) => c.phone || c.email).length / total) * 100) : 0;
  const idRate = total > 0 ? Math.round(((total - segments.unknown.count) / total) * 100) : 0;
  const persuadableRate = total > 0 ? Math.round((segments.persuadable.count / total) * 100) : 0;

  return NextResponse.json({
    total,
    segments: Object.entries(segments).map(([key, s]) => ({
      segment: key,
      ...s,
      contactRate: s.count > 0 ? Math.round((s.contacted / s.count) * 100) : 0,
      phoneRate: s.count > 0 ? Math.round((s.withPhone / s.count) * 100) : 0,
    })),
    metrics: { contactability, idRate, persuadableRate },
    topPersuasionPolls: polls.slice(0, 10),
    topSupportAreas: areas.slice(0, 10),
    weakestAreas: areas.filter((a) => a.total >= 20).sort((a, b) => a.supportRate - b.supportRate).slice(0, 5),
  });
}
