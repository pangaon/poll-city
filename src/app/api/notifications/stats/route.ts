import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "analytics:read");
  if (forbidden) return forbidden;

  const logs = await prisma.notificationLog.findMany({
    where: { campaignId: campaignId!, status: "sent" },
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
