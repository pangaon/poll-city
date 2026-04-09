/**
 * Cron: Team Activity Monitor
 * Runs every 30 minutes. Detects canvassers who have gone quiet.
 *
 * George's rule: expected rate is 6-12 door knocks per hour per canvasser.
 * If a volunteer logged activity in the last 3 hours but has < 3 interactions
 * in the last 2 hours, they've likely stopped (dead phone, got lost, gave up).
 *
 * Action: push notification to all CAMPAIGN_MANAGER / ADMIN members of that campaign.
 *
 * Schedule: every 30 min (see vercel.json)
 * Auth: CRON_SECRET header required.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { sendPushBatch, configureWebPush } from "@/lib/notifications/push";
import { resolveNotificationRecipients, getPushSubscriptionsForUsers } from "@/lib/notifications/routing";

export const dynamic = "force-dynamic";

// Minimum expected door knocks in a 2-hour active window
const LOW_ACTIVITY_THRESHOLD = 3;

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured — endpoint locked" }, { status: 503 });
  }
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const pushConfigured = configureWebPush().ok;
  const now = new Date();
  const twoHoursAgo = new Date(now.getTime() - 2 * 60 * 60 * 1000);
  const threeHoursAgo = new Date(now.getTime() - 3 * 60 * 60 * 1000);

  // Find all active (non-demo) campaigns
  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true, isDemo: false },
    select: { id: true, name: true },
  });

  const alerts: { campaignId: string; messages: string[] }[] = [];

  for (const campaign of campaigns) {
    // Find users who had any interaction in last 3 hours (proving they were active today)
    const recentlyActiveUsers = await prisma.interaction.findMany({
      where: {
        contact: { campaignId: campaign.id },
        userId: { not: null },
        type: { in: ["door_knock", "phone_call"] },
        source: { not: "simulation" },
        createdAt: { gte: threeHoursAgo },
      },
      select: { userId: true },
      distinct: ["userId"],
    });

    if (recentlyActiveUsers.length === 0) continue;

    const alertMessages: string[] = [];

    for (const { userId } of recentlyActiveUsers) {
      if (!userId) continue;

      // Count their interactions in the LAST 2 hours
      const recentCount = await prisma.interaction.count({
        where: {
          userId,
          contact: { campaignId: campaign.id },
          type: { in: ["door_knock", "phone_call"] },
          source: { not: "simulation" },
          createdAt: { gte: twoHoursAgo },
        },
      });

      if (recentCount >= LOW_ACTIVITY_THRESHOLD) continue;

      // They were active 2-3 hours ago but almost nothing in last 2 hours
      const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { name: true },
      });

      const name = user?.name ?? "A volunteer";
      alertMessages.push(
        `${name} has been out for 2+ hours but only logged ${recentCount} doors recently.`,
      );
    }

    if (alertMessages.length > 0) {
      alerts.push({ campaignId: campaign.id, messages: alertMessages });
    }
  }

  if (!pushConfigured || alerts.length === 0) {
    return NextResponse.json({ ran: campaigns.length, alerts: alerts.length, pushed: 0 });
  }

  let pushed = 0;

  for (const { campaignId, messages } of alerts) {
    // Resolve recipients via campaign notification routing config
    const recipientIds = await resolveNotificationRecipients(campaignId, "team_activity_alert");
    if (recipientIds.length === 0) continue;

    const subscriptions = await getPushSubscriptionsForUsers(recipientIds);
    if (subscriptions.length === 0) continue;

    const body =
      messages.length === 1
        ? messages[0]
        : `${messages.length} volunteers have gone quiet. Check in with the team.`;

    await sendPushBatch({
      subscriptions,
      title: "Team activity alert",
      body,
      data: { type: "team_activity_alert", campaignId, count: messages.length },
    }).catch((e) => {
      console.error(`[team-activity] push failed for campaign ${campaignId}:`, e);
    });

    pushed += subscriptions.length;
  }

  return NextResponse.json({
    ran: campaigns.length,
    alerts: alerts.length,
    pushed,
    details: alerts.map((a) => ({ campaignId: a.campaignId, issues: a.messages.length })),
  });
}
