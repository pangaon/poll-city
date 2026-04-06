import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { configureWebPush, sendPushBatch } from "@/lib/notifications/push";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: {
    campaignId: string;
    title: string;
    body: string;
    filters?: {
      ward?: string;
      riding?: string;
      role?: string[];
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { campaignId, title, body: messageBody, filters } = body;

  if (!campaignId || !title || !messageBody) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  // Verify user has admin/manager access to this campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  const pushConfig = configureWebPush();
  if (!pushConfig.ok) {
    return NextResponse.json({ error: pushConfig.error }, { status: 500, headers: NO_STORE_HEADERS });
  }

  try {
    // Build query for push subscriptions
    const where: any = {
      campaignId,
      user: {
        pushEnabled: true,
        isActive: true,
      },
    };

    // Add filters
    if (filters?.ward) {
      where.user.ward = filters.ward;
    }
    if (filters?.riding) {
      where.user.riding = filters.riding;
    }
    if (filters?.role && filters.role.length > 0) {
      where.user.memberships = {
        some: {
          campaignId,
          role: { in: filters.role },
        },
      };
    }

    const subscriptions = await prisma.pushSubscription.findMany({
      where,
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    if (subscriptions.length === 0) {
      return NextResponse.json({ data: { sent: 0, message: "No subscribers found" } }, { headers: NO_STORE_HEADERS });
    }

    const delivery = await sendPushBatch({
      subscriptions: subscriptions.map((sub: (typeof subscriptions)[number]) => ({
        id: sub.id,
        userId: sub.userId,
        endpoint: sub.endpoint,
        p256dh: sub.p256dh,
        auth: sub.auth,
      })),
      title,
      body: messageBody,
      data: { campaignId },
    });

    await prisma.notificationLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        title,
        body: messageBody,
        audience: filters ? JSON.parse(JSON.stringify(filters)) : undefined,
        status: "sent",
        sentAt: new Date(),
        totalSubscribers: delivery.total,
        deliveredCount: delivery.sent,
        failedCount: delivery.failed,
        failedEndpoints: delivery.failedEndpoints,
      },
    });

    return NextResponse.json({
      data: {
        sent: delivery.sent,
        failed: delivery.failed,
        total: delivery.total,
        failedEndpoints: delivery.failedEndpoints,
      },
    }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("Failed to send push notifications:", err);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}