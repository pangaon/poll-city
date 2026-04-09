/**
 * Cron: Lifecycle Automations
 * Runs daily. Checks for stale pledges, major donations, volunteer milestones,
 * post-event follow-ups, and other time-based triggers.
 *
 * Configure in Vercel: cron schedule "0 8 * * *" (8am daily)
 * Auth: CRON_SECRET header required
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import {
  checkStalePledges,
  checkMajorDonations,
  checkVolunteerMilestones,
  checkPostEventFollowUp,
  autoCreateTask,
  notifyCampaignTeam,
} from "@/lib/automation/inbound-engine";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured — endpoint locked" }, { status: 503 });
  }
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== cronSecret) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const results: Record<string, unknown> = {};

  try {
    // Get all active campaigns
    const campaigns = await prisma.campaign.findMany({
      where: { isActive: true },
      select: { id: true, name: true, electionDate: true },
    });

    for (const campaign of campaigns) {
      const campaignResults: Record<string, number> = {};

      // Tier 4a: Stale pledge follow-up (30+ days old)
      campaignResults.stalePledges = await checkStalePledges(campaign.id);

      // Tier 4b: Major donation VIP tasks ($500+)
      campaignResults.majorDonations = await checkMajorDonations(campaign.id, 500);

      // Tier 4c: Volunteer milestone recognition
      campaignResults.volunteerMilestones = await checkVolunteerMilestones(campaign.id);

      // Tier 4d: Post-event follow-up tasks
      campaignResults.postEventFollowUps = await checkPostEventFollowUp(campaign.id);

      // Tier 4e: Overdue tasks escalation
      const overdueTasks = await prisma.task.count({
        where: {
          campaignId: campaign.id,
          status: "pending",
          dueDate: { lt: new Date() },
        },
      });
      if (overdueTasks > 5) {
        await notifyCampaignTeam(
          campaign.id,
          `${overdueTasks} overdue tasks`,
          `You have ${overdueTasks} tasks past their due date. Review and complete or reassign.`,
          "high",
        );
        campaignResults.overdueAlerts = 1;
      }

      // Tier 4f: Election approaching reminders
      if (campaign.electionDate) {
        const daysUntil = Math.ceil((campaign.electionDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
        if (daysUntil === 30 || daysUntil === 14 || daysUntil === 7 || daysUntil === 3 || daysUntil === 1) {
          await notifyCampaignTeam(
            campaign.id,
            `${daysUntil} day${daysUntil !== 1 ? "s" : ""} until election`,
            `Election day is ${daysUntil === 1 ? "TOMORROW" : `in ${daysUntil} days`}. Review your GOTV plan and ensure all systems are ready.`,
            daysUntil <= 3 ? "high" : "medium",
          );
          campaignResults.electionReminder = daysUntil;
        }
      }

      // Tier 4g: Contacts with followUpDate due today
      const dueFollowUps = await prisma.contact.findMany({
        where: {
          campaignId: campaign.id,
          deletedAt: null,
          followUpNeeded: true,
          followUpDate: { lte: new Date() },
          doNotContact: false,
        },
        select: { id: true, firstName: true, lastName: true },
        take: 50,
      });
      for (const c of dueFollowUps) {
        const name = [c.firstName, c.lastName].filter(Boolean).join(" ") || "Contact";
        await autoCreateTask({
          campaignId: campaign.id,
          contactId: c.id,
          title: `Follow up with ${name} (scheduled)`,
          description: "This contact was flagged for follow-up. Check interaction history and reach out.",
          priority: "medium",
        });
      }
      campaignResults.scheduledFollowUps = dueFollowUps.length;

      // Tier 4h: No-show volunteers (2+ no-shows = create review task)
      const noShowVolunteers = await prisma.volunteerShiftSignup.groupBy({
        by: ["volunteerProfileId"],
        where: {
          status: "no_show",
          volunteerProfile: { campaignId: campaign.id },
        },
        _count: { id: true },
        having: { id: { _count: { gte: 2 } } },
      });
      for (const ns of noShowVolunteers) {
        if (ns.volunteerProfileId) {
          const vol = await prisma.volunteerProfile.findUnique({
            where: { id: ns.volunteerProfileId },
            select: { contact: { select: { id: true, firstName: true, lastName: true } } },
          });
          if (vol?.contact) {
            const name = [vol.contact.firstName, vol.contact.lastName].filter(Boolean).join(" ") || "Volunteer";
            await autoCreateTask({
              campaignId: campaign.id,
              contactId: vol.contact.id,
              title: `Review ${name} — ${ns._count.id} no-shows`,
              description: "This volunteer has missed multiple shifts. Consider reaching out or adjusting assignments.",
              priority: "low",
            });
          }
        }
      }
      campaignResults.noShowReviews = noShowVolunteers.length;

      results[campaign.name] = campaignResults;
    }

    return NextResponse.json({ ok: true, campaigns: campaigns.length, results });
  } catch (err) {
    console.error("Lifecycle automation error:", err);
    return NextResponse.json({ error: "Automation failed" }, { status: 500 });
  }
}
