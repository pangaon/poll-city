import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "analytics:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });

  const logs = await prisma.notificationLog.findMany({
    where: { campaignId, status: "sent" },
    select: {
      totalSubscribers: true,
      deliveredCount: true,
      failedCount: true,
      sentAt: true,
      title: true,
    },
    orderBy: { sentAt: "desc" },
    take: 30,
  });

  const totals = logs.reduce(
    (acc: { total: number; delivered: number; failed: number }, row: (typeof logs)[number]) => {
      acc.total += row.totalSubscribers;
      acc.delivered += row.deliveredCount;
      acc.failed += row.failedCount;
      return acc;
    },
    { total: 0, delivered: 0, failed: 0 }
  );

  const deliveryRate = totals.total > 0 ? Number(((totals.delivered / totals.total) * 100).toFixed(1)) : 0;

  return NextResponse.json({
    data: {
      totals,
      deliveryRate,
      recent: logs,
    },
  }, { headers: NO_STORE_HEADERS });
}
