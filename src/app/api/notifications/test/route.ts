import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { configureWebPush, sendPushBatch } from "@/lib/notifications/push";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { campaignId?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!body.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_campaignId: {
        userId: session!.user.id,
        campaignId: body.campaignId,
      },
    },
  });

  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const pushConfig = configureWebPush();
  if (!pushConfig.ok) {
    return NextResponse.json({ error: pushConfig.error }, { status: 500 });
  }

  const subscription = await prisma.pushSubscription.findUnique({
    where: {
      userId_campaignId: {
        userId: session!.user.id,
        campaignId: body.campaignId,
      },
    },
  });

  if (!subscription) {
    return NextResponse.json({ error: "No browser push subscription found. Enable notifications first." }, { status: 404 });
  }

  const delivery = await sendPushBatch({
    subscriptions: [subscription],
    title: "Poll City Test Notification",
    body: "Push notifications are active for your campaign.",
    data: { type: "test", campaignId: body.campaignId },
  });

  if (delivery.sent === 0) {
    return NextResponse.json({
      error: "Test notification failed",
      data: { ...delivery },
    }, { status: 500 });
  }

  return NextResponse.json({ data: delivery });
}
