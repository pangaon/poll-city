import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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
    (acc, row) => {
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
  });
}
