import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "analytics:read");
  if (forbidden) return forbidden;

  try {
    const notifications = await prisma.notificationLog.findMany({
      where: {
        campaignId: campaignId!,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
      skip: offset,
    });

    const total = await prisma.notificationLog.count({
      where: {
        campaignId: campaignId!,
      },
    });

    return NextResponse.json({
      data: notifications.map((n: (typeof notifications)[number]) => ({
        id: n.id,
        title: n.title,
        body: n.body,
        filters: n.audience,
        sent: n.deliveredCount,
        failed: n.failedCount,
        total: n.totalSubscribers,
        sentBy: n.user?.name ?? "System",
        sentAt: n.sentAt ?? n.createdAt,
      })),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("Failed to fetch notification history:", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}
