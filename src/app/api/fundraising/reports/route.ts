/**
 * Fundraising Reports API — Phase 6
 * GET ?campaignId=&format=json|csv&period=all|year|month|custom&from=&to=&groupBy=day|week|month
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

function parseDateParam(val: string | null): Date | undefined {
  if (!val) return undefined;
  const d = new Date(val);
  return isNaN(d.getTime()) ? undefined : d;
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const params = req.nextUrl.searchParams;
  const campaignId = params.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId);
  if (forbidden) return forbidden;

  const cid = campaignId!;
  const format = params.get("format") ?? "json";
  const period = params.get("period") ?? "year";
  const groupBy = params.get("groupBy") ?? "month";

  const now = new Date();
  let from: Date;
  let to: Date = now;

  if (period === "custom") {
    from = parseDateParam(params.get("from")) ?? new Date(now.getFullYear(), 0, 1);
    to = parseDateParam(params.get("to")) ?? now;
  } else if (period === "month") {
    from = new Date(now.getFullYear(), now.getMonth(), 1);
  } else if (period === "all") {
    from = new Date("2020-01-01");
  } else {
    from = new Date(now.getFullYear(), 0, 1);
  }

  // Parallel aggregations — inline where clauses to avoid readonly type inference issues
  const [donations, byMethod, bySource, byInitiative, byCompliance, topDonors] = await Promise.all([
    // All donations in range for time-series + CSV
    prisma.donation.findMany({
      where: {
        campaignId: cid,
        deletedAt: null,
        status: { notIn: ["cancelled", "failed"] },
        donationDate: { gte: from, lte: to },
      },
      select: {
        id: true,
        amount: true,
        netAmount: true,
        feeAmount: true,
        refundedAmount: true,
        donationDate: true,
        paymentMethod: true,
        method: true,
        donationType: true,
        complianceStatus: true,
        isRecurring: true,
        isAnonymous: true,
        contact: { select: { id: true, firstName: true, lastName: true } },
        source: { select: { id: true, name: true } },
        fundraisingCampaign: { select: { id: true, name: true } },
      },
      orderBy: { donationDate: "asc" },
    }),
    // By payment method
    prisma.donation.groupBy({
      by: ["paymentMethod"],
      where: {
        campaignId: cid,
        deletedAt: null,
        status: { notIn: ["cancelled", "failed"] },
        donationDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // By source
    prisma.donation.groupBy({
      by: ["sourceId"],
      where: {
        campaignId: cid,
        deletedAt: null,
        status: { notIn: ["cancelled", "failed"] },
        donationDate: { gte: from, lte: to },
        sourceId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
    // By fundraising initiative
    prisma.donation.groupBy({
      by: ["fundraisingCampaignId"],
      where: {
        campaignId: cid,
        deletedAt: null,
        status: { notIn: ["cancelled", "failed"] },
        donationDate: { gte: from, lte: to },
        fundraisingCampaignId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
    }),
    // By compliance status
    prisma.donation.groupBy({
      by: ["complianceStatus"],
      where: {
        campaignId: cid,
        deletedAt: null,
        donationDate: { gte: from, lte: to },
      },
      _sum: { amount: true },
      _count: { id: true },
    }),
    // Top donors
    prisma.donation.groupBy({
      by: ["contactId"],
      where: {
        campaignId: cid,
        deletedAt: null,
        status: { notIn: ["cancelled", "failed"] },
        donationDate: { gte: from, lte: to },
        contactId: { not: null },
      },
      _sum: { amount: true },
      _count: { id: true },
      orderBy: { _sum: { amount: "desc" } },
      take: 10,
    }),
  ]);

  // Enrich source names
  const sourceIds = bySource.map((r) => r.sourceId).filter(Boolean) as string[];
  const sources = sourceIds.length
    ? await prisma.donationSource.findMany({ where: { id: { in: sourceIds } }, select: { id: true, name: true } })
    : [];
  const sourceMap = Object.fromEntries(sources.map((s) => [s.id, s.name]));

  // Enrich initiative names
  const initiativeIds = byInitiative.map((r) => r.fundraisingCampaignId).filter(Boolean) as string[];
  const initiatives = initiativeIds.length
    ? await prisma.fundraisingCampaign.findMany({ where: { id: { in: initiativeIds } }, select: { id: true, name: true } })
    : [];
  const initiativeMap = Object.fromEntries(initiatives.map((i) => [i.id, i.name]));

  // Enrich top donor names
  const contactIds = topDonors.map((r) => r.contactId).filter(Boolean) as string[];
  const contacts = contactIds.length
    ? await prisma.contact.findMany({ where: { id: { in: contactIds } }, select: { id: true, firstName: true, lastName: true } })
    : [];
  const contactMap = Object.fromEntries(contacts.map((c) => [c.id, `${c.firstName} ${c.lastName}`]));

  // Build time-series buckets
  function bucketKey(d: Date): string {
    if (groupBy === "day") return d.toISOString().slice(0, 10);
    if (groupBy === "week") {
      const day = d.getDay();
      const diff = d.getDate() - day + (day === 0 ? -6 : 1);
      const monday = new Date(d);
      monday.setDate(diff);
      return monday.toISOString().slice(0, 10);
    }
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
  }

  const timeSeriesMap = new Map<string, { amount: number; net: number; count: number }>();
  for (const d of donations) {
    const key = bucketKey(new Date(d.donationDate));
    const existing = timeSeriesMap.get(key) ?? { amount: 0, net: 0, count: 0 };
    existing.amount += d.amount;
    existing.net += d.netAmount ?? d.amount;
    existing.count += 1;
    timeSeriesMap.set(key, existing);
  }

  const timeSeries = Array.from(timeSeriesMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([p, v]) => ({ period: p, ...v }));

  const totalRaised = donations.reduce((sum, d) => sum + d.amount, 0);
  const totalNet = donations.reduce((sum, d) => sum + (d.netAmount ?? d.amount), 0);
  const totalFees = donations.reduce((sum, d) => sum + (d.feeAmount ?? 0), 0);
  const totalRefunded = donations.reduce((sum, d) => sum + (d.refundedAmount ?? 0), 0);
  const avgGift = donations.length > 0 ? totalRaised / donations.length : 0;
  const uniqueDonors = new Set(donations.map((d) => d.contact?.id).filter(Boolean)).size;

  const responseData = {
    summary: {
      period: { from: from.toISOString(), to: to.toISOString() },
      totalRaised,
      totalNet,
      totalFees,
      totalRefunded,
      totalDonations: donations.length,
      avgGift,
      uniqueDonors,
    },
    timeSeries,
    byMethod: byMethod
      .map((r) => ({ method: r.paymentMethod ?? "unknown", amount: r._sum.amount ?? 0, count: r._count.id }))
      .sort((a, b) => b.amount - a.amount),
    bySource: bySource.map((r) => ({
      sourceId: r.sourceId,
      name: sourceMap[r.sourceId!] ?? "Unknown",
      amount: r._sum.amount ?? 0,
      count: r._count.id,
    })),
    byInitiative: byInitiative.map((r) => ({
      initiativeId: r.fundraisingCampaignId,
      name: initiativeMap[r.fundraisingCampaignId!] ?? "Unknown",
      amount: r._sum.amount ?? 0,
      count: r._count.id,
    })),
    byCompliance: byCompliance.map((r) => ({
      status: r.complianceStatus,
      amount: r._sum.amount ?? 0,
      count: r._count.id,
    })),
    topDonors: topDonors.map((r) => ({
      contactId: r.contactId,
      name: contactMap[r.contactId!] ?? "Anonymous",
      amount: r._sum.amount ?? 0,
      count: r._count.id,
    })),
  };

  if (format === "csv") {
    const rows = [
      ["Date", "Donor", "Amount", "Net", "Method", "Type", "Source", "Initiative", "Compliance", "Anonymous", "Recurring"],
      ...donations.map((d) => [
        new Date(d.donationDate).toLocaleDateString("en-CA"),
        d.isAnonymous ? "Anonymous" : d.contact ? `${d.contact.firstName} ${d.contact.lastName}` : "—",
        d.amount.toFixed(2),
        (d.netAmount ?? d.amount).toFixed(2),
        d.paymentMethod ?? d.method ?? "—",
        d.donationType,
        d.source?.name ?? "—",
        d.fundraisingCampaign?.name ?? "—",
        d.complianceStatus,
        d.isAnonymous ? "Yes" : "No",
        d.isRecurring ? "Yes" : "No",
      ]),
    ];
    const csv = rows.map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",")).join("\n");
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="fundraising-report-${from.toISOString().slice(0, 10)}-${to.toISOString().slice(0, 10)}.csv"`,
      },
    });
  }

  return NextResponse.json({ data: responseData });
}
