import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * POST /api/social/notification-consent
 *
 * Saves a voter's push notification opt-in for a specific campaign.
 * Records in ConsentLog (signalType="notification_opt_in") for audit /
 * revocation, and upserts the browser PushSubscription so the campaign
 * send route can deliver notifications to opted-in voters.
 *
 * No campaign membership required — only that the campaign is active.
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: {
    campaignId: string;
    subscription: {
      endpoint: string;
      keys: { p256dh: string; auth: string };
    };
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId, subscription } = body;

  if (
    !campaignId ||
    !subscription?.endpoint ||
    !subscription.keys?.p256dh ||
    !subscription.keys?.auth
  ) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { id: true, isActive: true, name: true },
  });

  if (!campaign || !campaign.isActive) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  const userId = session!.user.id;

  // Upsert consent log — re-consent sets revokedAt back to null
  await prisma.consentLog.upsert({
    where: {
      unique_active_consent: {
        userId,
        campaignId,
        signalType: "notification_opt_in",
      },
    },
    update: { revokedAt: null, consentScope: "push_notifications" },
    create: {
      userId,
      campaignId,
      signalType: "notification_opt_in",
      consentScope: "push_notifications",
      fieldsXferred: [],
    },
  });

  // Upsert push subscription for delivery by campaign send route
  await prisma.pushSubscription.upsert({
    where: { userId_campaignId: { userId, campaignId } },
    update: {
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
    create: {
      userId,
      campaignId,
      endpoint: subscription.endpoint,
      p256dh: subscription.keys.p256dh,
      auth: subscription.keys.auth,
    },
  });

  return NextResponse.json({ data: { saved: true, campaignName: campaign.name } });
}
