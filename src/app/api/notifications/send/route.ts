import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import webpush from "web-push";

const vapidPublicKey = process.env.VAPID_PUBLIC_KEY!;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY!;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    "mailto:admin@pollcity.app",
    vapidPublicKey,
    vapidPrivateKey
  );
}

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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId, title, body: messageBody, filters } = body;

  if (!campaignId || !title || !messageBody) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify user has admin/manager access to this campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!vapidPublicKey || !vapidPrivateKey) {
    return NextResponse.json({ error: "Push notifications not configured" }, { status: 500 });
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
      return NextResponse.json({ data: { sent: 0, message: "No subscribers found" } });
    }

    // Send push notifications
    const results = await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            JSON.stringify({
              title,
              body: messageBody,
              icon: "/icon-192x192.png",
              badge: "/icon-192x192.png",
              data: {
                campaignId,
                userId: sub.userId,
              },
            })
          );
          return { success: true, userId: sub.userId };
        } catch (err: any) {
          console.error(`Failed to send push to ${sub.userId}:`, err.message);
          // If subscription is invalid, remove it
          if (err.statusCode === 410 || err.statusCode === 400) {
            await prisma.pushSubscription.delete({
              where: { id: sub.id },
            });
          }
          return { success: false, userId: sub.userId, error: err.message };
        }
      })
    );

    const successful = results.filter(r => r.status === "fulfilled" && r.value.success).length;
    const failed = results.length - successful;

    // Log the notification
    await prisma.activityLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        action: "push_notification_sent",
        entityType: "campaign",
        entityId: campaignId,
        details: {
          title,
          body: messageBody,
          filters,
          sent: successful,
          failed,
          total: subscriptions.length,
        },
      },
    });

    return NextResponse.json({
      data: {
        sent: successful,
        failed,
        total: subscriptions.length,
      },
    });
  } catch (err) {
    console.error("Failed to send push notifications:", err);
    return NextResponse.json({ error: "Failed to send notifications" }, { status: 500 });
  }
}