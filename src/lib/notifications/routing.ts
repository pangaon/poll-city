/**
 * Notification Routing
 *
 * Resolves which users receive a given push notification type for a campaign.
 * Campaigns can customize routing via Campaign.notificationRoutes JSON field.
 *
 * Default behaviour (no config): all active ADMIN + CAMPAIGN_MANAGER members.
 *
 * Config format (stored in Campaign.notificationRoutes):
 * {
 *   "team_activity_alert": { "mode": "roles", "roles": ["CAMPAIGN_MANAGER"] },
 *   "security_alert":      { "mode": "all" },
 *   "milestone":           { "mode": "users", "userIds": ["abc123"] }
 * }
 *
 * Modes:
 *   "roles"  — notify members with specified roles
 *   "users"  — notify specific user IDs (named intake person, etc.)
 *   "all"    — notify all active members (for small campaigns: everyone gets everything)
 */

import prisma from "@/lib/db/prisma";

export type AlertType =
  | "team_activity_alert"
  | "security_alert"
  | "milestone"
  | "suspension"
  | "sign_deployed"
  | "gotv_milestone";

interface RouteConfig {
  mode: "roles" | "users" | "all";
  roles?: string[];
  userIds?: string[];
}

type NotificationRoutesJson = Partial<Record<AlertType, RouteConfig>>;

/** Default roles to notify when no campaign-specific config is set */
const DEFAULT_ROLES: Record<AlertType, string[]> = {
  team_activity_alert: ["ADMIN", "CAMPAIGN_MANAGER"],
  security_alert: ["ADMIN", "CAMPAIGN_MANAGER"],
  milestone: ["ADMIN", "CAMPAIGN_MANAGER"],
  suspension: ["ADMIN", "CAMPAIGN_MANAGER"],
  sign_deployed: ["ADMIN", "CAMPAIGN_MANAGER"],
  gotv_milestone: ["ADMIN", "CAMPAIGN_MANAGER"],
};

/**
 * Resolve which userIds should receive a notification of this type.
 * Returns an array of user IDs (de-duped, active members only).
 */
export async function resolveNotificationRecipients(
  campaignId: string,
  alertType: AlertType,
  /** Exclude the acting user (don't notify the person who took the action) */
  excludeUserId?: string,
): Promise<string[]> {
  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { notificationRoutes: true },
  });

  const routes = (campaign?.notificationRoutes ?? null) as NotificationRoutesJson | null;
  const config: RouteConfig | null = routes?.[alertType] ?? null;

  let userIds: string[] = [];

  if (!config) {
    // Default: role-based
    const roles = DEFAULT_ROLES[alertType] ?? ["ADMIN", "CAMPAIGN_MANAGER"];
    const memberships = await prisma.membership.findMany({
      where: {
        campaignId,
        status: "active",
        role: { in: roles as never[] },
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });
    userIds = memberships.map((m) => m.userId);
  } else if (config.mode === "all") {
    const memberships = await prisma.membership.findMany({
      where: {
        campaignId,
        status: "active",
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });
    userIds = memberships.map((m) => m.userId);
  } else if (config.mode === "roles" && config.roles?.length) {
    const memberships = await prisma.membership.findMany({
      where: {
        campaignId,
        status: "active",
        role: { in: config.roles as never[] },
        ...(excludeUserId ? { userId: { not: excludeUserId } } : {}),
      },
      select: { userId: true },
    });
    userIds = memberships.map((m) => m.userId);
  } else if (config.mode === "users" && config.userIds?.length) {
    // Verify these users are still active members
    const memberships = await prisma.membership.findMany({
      where: {
        campaignId,
        status: "active",
        userId: {
          in: config.userIds,
          ...(excludeUserId ? { not: excludeUserId } : {}),
        },
      },
      select: { userId: true },
    });
    userIds = memberships.map((m) => m.userId);
  }

  // De-dupe
  return Array.from(new Set(userIds));
}

/**
 * Get push subscriptions for a set of user IDs.
 * Used to call sendPushBatch().
 */
export async function getPushSubscriptionsForUsers(userIds: string[]) {
  if (userIds.length === 0) return [];
  return prisma.pushSubscription.findMany({
    where: { userId: { in: userIds } },
    select: { id: true, userId: true, endpoint: true, p256dh: true, auth: true },
  });
}
