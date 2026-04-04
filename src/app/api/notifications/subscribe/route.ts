import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: {
    campaignId?: string;
    subscription?: {
      endpoint: string;
      keys: {
        p256dh: string;
        auth: string;
      };
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId, subscription } = body;

  if (!campaignId || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  // Verify user has access to this campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // Check if user has push notifications enabled
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { pushEnabled: true },
  });
  if (!user?.pushEnabled) {
    return NextResponse.json({ error: "Push notifications disabled" }, { status: 403 });
  }

  try {
    // Upsert the subscription
    const pushSubscription = await prisma.pushSubscription.upsert({
      where: {
        userId_campaignId: {
          userId: session!.user.id,
          campaignId,
        },
      },
      update: {
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
      create: {
        userId: session!.user.id,
        campaignId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
      },
    });

    return NextResponse.json({ data: { id: pushSubscription.id } });
  } catch (err) {
    console.error("Failed to save push subscription:", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500 });
  }
}