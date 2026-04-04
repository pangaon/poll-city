import webpush from "web-push";
import prisma from "@/lib/db/prisma";

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY;

export function getVapidConfig() {
  if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) {
    return {
      ok: false as const,
      error:
        "Missing NEXT_PUBLIC_VAPID_PUBLIC_KEY or VAPID_PRIVATE_KEY in environment variables.",
    };
  }

  return {
    ok: true as const,
    vapidPublicKey: VAPID_PUBLIC_KEY,
    vapidPrivateKey: VAPID_PRIVATE_KEY,
  };
}

export function configureWebPush() {
  const config = getVapidConfig();
  if (!config.ok) return config;

  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT || "mailto:admin@poll.city",
    config.vapidPublicKey,
    config.vapidPrivateKey
  );

  return config;
}

interface PushSubscriptionInput {
  id: string;
  userId: string;
  endpoint: string;
  p256dh: string;
  auth: string;
}

export async function sendPushBatch(params: {
  subscriptions: PushSubscriptionInput[];
  title: string;
  body: string;
  data?: Record<string, unknown>;
}) {
  const failedEndpoints: string[] = [];

  const results = await Promise.allSettled(
    params.subscriptions.map(async (sub) => {
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
            title: params.title,
            body: params.body,
            icon: "/icon-192x192.png",
            badge: "/icon-192x192.png",
            data: params.data ?? {},
          })
        );
        return { sent: true as const };
      } catch (error: any) {
        failedEndpoints.push(sub.endpoint);

        // Remove stale subscription so future sends stay healthy.
        if (error?.statusCode === 410 || error?.statusCode === 400) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => null);
        }

        return { sent: false as const, endpoint: sub.endpoint, message: error?.message || "Unknown error" };
      }
    })
  );

  const sent = results.filter((r) => r.status === "fulfilled" && r.value.sent).length;
  const failed = results.length - sent;

  return {
    total: params.subscriptions.length,
    sent,
    failed,
    failedEndpoints,
  };
}
