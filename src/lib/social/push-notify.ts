import webpush from "web-push";
import prisma from "@/lib/db/prisma";

let vapidInitialized = false;

function initVapid() {
  if (vapidInitialized) return;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!publicKey || !privateKey) return;
  webpush.setVapidDetails("mailto:support@poll.city", publicKey, privateKey);
  vapidInitialized = true;
}

export interface PushPayload {
  title: string;
  body: string;
  url?: string;
  icon?: string;
  badge?: string;
  tag?: string;
}

/**
 * Send a push notification to a single user, respecting their quiet hours.
 * Stale subscriptions (410 Gone) are automatically removed from the DB.
 *
 * Returns true if at least one push was dispatched.
 */
export async function sendPushToUser(
  userId: string,
  payload: PushPayload
): Promise<boolean> {
  initVapid();
  if (!vapidInitialized) return false;

  // Respect quiet hours from CivicProfile
  const profile = await prisma.civicProfile.findUnique({
    where: { userId },
    select: { quietHoursStart: true, quietHoursEnd: true, notifyPolls: true, notifyResults: true },
  });

  if (profile) {
    const now = new Date();
    const hour = now.getHours();
    const start = profile.quietHoursStart ?? 22;
    const end = profile.quietHoursEnd ?? 7;

    const inQuietHours =
      start < end
        ? hour >= start && hour < end
        : hour >= start || hour < end; // wraps midnight

    if (inQuietHours) return false;
  }

  const subscriptions = await prisma.pushSubscription.findMany({
    where: { userId },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });

  if (subscriptions.length === 0) return false;

  const staleIds: string[] = [];
  let dispatched = false;

  await Promise.allSettled(
    subscriptions.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          JSON.stringify({
            title: payload.title,
            body: payload.body,
            url: payload.url ?? "/social",
            icon: payload.icon ?? "/icons/icon-192.png",
            badge: payload.badge ?? "/icons/badge-72.png",
            tag: payload.tag,
          })
        );
        dispatched = true;
      } catch (err) {
        const statusCode = (err as { statusCode?: number }).statusCode;
        if (statusCode === 410 || statusCode === 404) {
          staleIds.push(sub.id); // subscription expired
        }
      }
    })
  );

  // Clean up stale subscriptions
  if (staleIds.length > 0) {
    await prisma.pushSubscription.deleteMany({ where: { id: { in: staleIds } } }).catch(() => {});
  }

  return dispatched;
}

/**
 * Fan out a push notification to all followers of an official.
 * Designed to be called fire-and-forget (void).
 * Batches in groups of 50 to avoid memory spikes on large follower lists.
 */
export async function pushFanOut(
  followerIds: string[],
  payload: PushPayload
): Promise<void> {
  initVapid();
  if (!vapidInitialized || followerIds.length === 0) return;

  const BATCH = 50;
  for (let i = 0; i < followerIds.length; i += BATCH) {
    const batch = followerIds.slice(i, i + BATCH);
    await Promise.allSettled(batch.map((uid) => sendPushToUser(uid, payload)));
  }
}
