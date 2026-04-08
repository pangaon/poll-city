/**
 * Cron: Weekly Campaign Report
 * Runs every Monday at 9am. Generates a summary for each active campaign
 * and stores it as a NotificationLog so it appears in the comms history.
 *
 * Configure in Vercel: cron schedule "0 9 * * 1" (Monday 9am)
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (process.env.CRON_SECRET && secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const campaigns = await prisma.campaign.findMany({
    where: { isActive: true },
    select: { id: true, name: true, candidateName: true, electionDate: true },
  });

  const reports = [];

  for (const campaign of campaigns) {
    const now = new Date();
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Gather weekly stats
    const [
      newContacts,
      newDonations,
      totalDonationAmount,
      newVolunteers,
      doorsKnocked,
      emailsSent,
      smsSent,
      newSignRequests,
      eventsThisWeek,
      tasksCompleted,
      questionsReceived,
    ] = await Promise.all([
      prisma.contact.count({ where: { campaignId: campaign.id, createdAt: { gte: weekAgo } } }),
      prisma.donation.count({ where: { campaignId: campaign.id, createdAt: { gte: weekAgo }, status: { in: ["processed", "receipted"] } } }),
      prisma.donation.aggregate({ where: { campaignId: campaign.id, createdAt: { gte: weekAgo }, status: { in: ["processed", "receipted"] } }, _sum: { amount: true } }),
      prisma.volunteerProfile.count({ where: { campaignId: campaign.id, createdAt: { gte: weekAgo } } }),
      prisma.interaction.count({ where: { contact: { campaignId: campaign.id }, type: "door_knock", createdAt: { gte: weekAgo } } }),
      prisma.notificationLog.count({ where: { campaignId: campaign.id, status: "sent", sentAt: { gte: weekAgo }, title: { contains: "email", mode: "insensitive" } } }),
      prisma.notificationLog.count({ where: { campaignId: campaign.id, status: "sent", sentAt: { gte: weekAgo }, title: { not: { contains: "email" } } } }),
      prisma.signRequest.count({ where: { campaignId: campaign.id, createdAt: { gte: weekAgo } } }),
      prisma.event.count({ where: { campaignId: campaign.id, eventDate: { gte: weekAgo, lte: now } } }),
      prisma.task.count({ where: { campaignId: campaign.id, completedAt: { gte: weekAgo } } }),
      prisma.question.count({ where: { campaignId: campaign.id, createdAt: { gte: weekAgo } } }),
    ]);

    const donationTotal = Number(totalDonationAmount._sum.amount ?? 0);
    const daysToElection = campaign.electionDate
      ? Math.ceil((campaign.electionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
      : null;

    const reportBody = [
      `📊 Weekly Report for ${campaign.candidateName || campaign.name}`,
      `Week ending ${now.toLocaleDateString("en-CA")}`,
      daysToElection !== null ? `${daysToElection} days until election` : "",
      "",
      `📋 Contacts: +${newContacts} new this week`,
      `🚪 Doors knocked: ${doorsKnocked}`,
      `🤝 New volunteers: ${newVolunteers}`,
      `💰 Donations: ${newDonations} totalling $${donationTotal.toLocaleString()}`,
      `📧 Emails sent: ${emailsSent}`,
      `📱 SMS sent: ${smsSent}`,
      `🪧 Sign requests: ${newSignRequests}`,
      `📅 Events: ${eventsThisWeek}`,
      `✅ Tasks completed: ${tasksCompleted}`,
      `❓ Questions received: ${questionsReceived}`,
    ].filter(Boolean).join("\n");

    // Store as notification log so it appears in comms history
    await prisma.notificationLog.create({
      data: {
        campaignId: campaign.id,
        title: `Weekly Report — ${now.toLocaleDateString("en-CA")}`,
        body: reportBody,
        status: "sent",
        sentAt: now,
        totalSubscribers: 0,
        deliveredCount: 0,
        failedCount: 0,
        audience: { type: "report", period: "weekly" },
      },
    });

    // Notify campaign team
    const admins = await prisma.membership.findMany({
      where: { campaignId: campaign.id, role: { in: ["ADMIN", "CAMPAIGN_MANAGER"] } },
      select: { userId: true },
    });

    for (const admin of admins) {
      await prisma.notification.create({
        data: {
          userId: admin.userId,
          title: `Weekly Report Ready`,
          body: `${newContacts} new contacts, ${doorsKnocked} doors knocked, $${donationTotal.toLocaleString()} raised this week.`,
          type: "info",
        },
      }).catch(() => {});
    }

    reports.push({ campaign: campaign.name, newContacts, doorsKnocked, donationTotal, newVolunteers });
  }

  return NextResponse.json({ ok: true, campaigns: campaigns.length, reports });
}
