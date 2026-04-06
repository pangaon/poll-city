import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { matchLists } from "@/lib/import/fuzzy-matcher";
import { parseAnyFile, parseExcelFile, detectFileType } from "@/lib/import/file-parser";
import { SupportLevel } from "@prisma/client";

const SUPPORTER_LEVELS: SupportLevel[] = [SupportLevel.strong_support, SupportLevel.leaning_support];

/**
 * GET /api/gotv?campaignId=xxx
 * Returns GOTV stats: % pulled, batches, recent strikes
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Total supporters
  const totalSupporters = await prisma.contact.count({
    where: { campaignId, supportLevel: { in: SUPPORTER_LEVELS }, isDeceased: false },
  });

  // Confirmed voted (contacts matched on a voted list)
  const confirmedVoted = await prisma.contact.count({
    where: { campaignId, supportLevel: { in: SUPPORTER_LEVELS }, gotvStatus: "voted", isDeceased: false },
  });

  // All GOTV batches for this campaign today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const batches = await prisma.gotvBatch.findMany({
    where: { campaignId, createdAt: { gte: today } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, createdAt: true, totalRecords: true, matchedCount: true, struckCount: true },
  });

  // Recent strikes (last 20)
  const recentGotvRecords = await prisma.gotvRecord.findMany({
    where: { batch: { campaignId }, contactId: { not: null } },
    orderBy: { createdAt: "desc" },
    take: 20,
    include: { contact: { select: { firstName: true, lastName: true, address1: true } } },
  });

  // Total voted in riding (all records across all batches today)
  const totalVotedInRiding = await prisma.gotvRecord.count({
    where: { batch: { campaignId, createdAt: { gte: today } } },
  });

  const unknownVoted = await prisma.gotvRecord.count({
    where: { batch: { campaignId, createdAt: { gte: today } }, contactId: null },
  });

  return NextResponse.json({
    data: {
      totalSupporters,
      confirmedVoted,
      stillNeeded: totalSupporters - confirmedVoted,
      percentagePulled: totalSupporters > 0 ? Math.round((confirmedVoted / totalSupporters) * 100 * 10) / 10 : 0,
      totalVotedInRiding,
      unknownVoted,
      batches: batches.map(b => ({ ...b, uploadedAt: b.createdAt.toISOString() })),
      recentStrikes: recentGotvRecords.map(r => ({
        contactName: r.contact ? `${r.contact.firstName} ${r.contact.lastName}` : "Unknown",
        address: r.contact?.address1 ?? r.address ?? "",
        struckAt: r.createdAt.toISOString(),
        matchScore: Math.round(r.matchScore ?? 0),
      })),
    },
  });
}
