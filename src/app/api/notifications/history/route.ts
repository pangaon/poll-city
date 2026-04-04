import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { searchParams } = new URL(req.url);
  const campaignId = searchParams.get("campaignId");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);
  const offset = parseInt(searchParams.get("offset") || "0");

  if (!campaignId) {
    return NextResponse.json({ error: "Missing campaignId" }, { status: 400 });
  }

  // Verify user has access to this campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const notifications = await prisma.activityLog.findMany({
      where: {
        campaignId,
        action: "push_notification_sent",
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

    const total = await prisma.activityLog.count({
      where: {
        campaignId,
        action: "push_notification_sent",
      },
    });

    return NextResponse.json({
      data: notifications.map(n => {
        const details = n.details as any;
        return {
          id: n.id,
          title: details?.title,
          body: details?.body,
          filters: details?.filters,
          sent: details?.sent,
          failed: details?.failed,
          total: details?.total,
          sentBy: n.user.name,
          sentAt: n.createdAt,
        };
      }),
      pagination: {
        total,
        limit,
        offset,
        hasMore: offset + limit < total,
      },
    });
  } catch (err) {
    console.error("Failed to fetch notification history:", err);
    return NextResponse.json({ error: "Failed to fetch history" }, { status: 500 });
  }
}