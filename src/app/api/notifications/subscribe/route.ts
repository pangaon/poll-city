import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

// GET /api/notifications/subscribe?campaignId=... — list all push subscribers
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "analytics:read");
  if (forbidden) return forbidden;

  const subs = await prisma.pushSubscription.findMany({
    where: { campaignId: campaignId! },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      createdAt: true,
      endpoint: true,
      user: { select: { id: true, name: true, email: true } },
    },
  });

  return NextResponse.json({
    data: subs.map((s) => ({
      id: s.id,
      userId: s.user.id,
      name: s.user.name ?? "Unknown",
      email: s.user.email ?? "—",
      // Infer device type from endpoint host (best-effort)
      device: s.endpoint.includes("fcm.googleapis") ? "Android/Chrome" : s.endpoint.includes("updates.push.services.mozilla") ? "Firefox" : s.endpoint.includes("web.push.apple") ? "Safari" : "Browser",
      subscribedAt: s.createdAt,
    })),
    total: subs.length,
  }, { headers: NO_STORE_HEADERS });
}

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
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  const { campaignId, subscription } = body;

  if (!campaignId || !subscription?.endpoint || !subscription.keys?.p256dh || !subscription.keys?.auth) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400, headers: NO_STORE_HEADERS });
  }

  // Verify user has access to this campaign
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403, headers: NO_STORE_HEADERS });
  }

  // Check if user has push notifications enabled
  const user = await prisma.user.findUnique({
    where: { id: session!.user.id },
    select: { pushEnabled: true },
  });
  if (!user?.pushEnabled) {
    return NextResponse.json({ error: "Push notifications disabled" }, { status: 403, headers: NO_STORE_HEADERS });
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

    return NextResponse.json({ data: { id: pushSubscription.id } }, { headers: NO_STORE_HEADERS });
  } catch (err) {
    console.error("Failed to save push subscription:", err);
    return NextResponse.json({ error: "Failed to save subscription" }, { status: 500, headers: NO_STORE_HEADERS });
  }
}