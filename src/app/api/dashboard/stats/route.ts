/**
 * GET /api/dashboard/stats — All dashboard data in a single request.
 *
 * Replaces the 12-API fan-out the dashboard previously used for the
 * spending/budget section (which had no dedicated endpoint). Also provides
 * a consolidated stats object that clients can use as a single source of
 * truth with a Refresh button.
 *
 * Scoped strictly to session.user.activeCampaignId — never accepts a
 * campaignId query param to prevent cross-tenant leakage.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { SupportLevel, InteractionType, SignStatus, TaskStatus, BudgetItemType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) {
    return NextResponse.json({ error: "No active campaign" }, { status: 400 });
  }

  // Verify membership
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  startOfWeek.setHours(0, 0, 0, 0);

  const [
    // Contacts
    totalContacts,
    contactsBySupport,
    recentlyContacted,
    followUpNeeded,
    volunteerCount,

    // GOTV interactions
    doorsKnocked,
    callsCompleted,

    // Polls
    pollStats,

    // Donations
    donationStats,

    // Campaign (for fundraisingGoal / spendingLimit)
    campaign,

    // Tasks
    pendingTasks,
    overdueTasks,
    completedThisWeek,

    // Volunteers
    totalVolunteers,
    activeShifts,

    // Signs
    installedSigns,
    requestedSigns,
    totalSigns,

    // Recent activity
    recentActivity,

    // Budget spending
    totalSpent,
  ] = await Promise.all([
    // ── contacts.total
    prisma.contact.count({
      where: { campaignId, deletedAt: null },
    }),

    // ── contacts.bySupport
    prisma.contact.groupBy({
      by: ["supportLevel"],
      where: { campaignId, deletedAt: null },
      _count: { id: true },
    }),

    // ── contacts.recentlyContacted (last 7 days)
    prisma.contact.count({
      where: {
        campaignId,
        deletedAt: null,
        lastContactedAt: { gte: sevenDaysAgo },
      },
    }),

    // ── contacts.followUpNeeded
    prisma.contact.count({
      where: { campaignId, deletedAt: null, followUpNeeded: true },
    }),

    // ── contacts.volunteers (have a volunteerProfile)
    prisma.volunteerProfile.count({
      where: { campaignId },
    }),

    // ── gotv.doorsKnocked
    prisma.interaction.count({
      where: {
        contact: { campaignId },
        type: InteractionType.door_knock,
      },
    }),

    // ── gotv.callsCompleted
    prisma.interaction.count({
      where: {
        contact: { campaignId },
        type: InteractionType.phone_call,
      },
    }),

    // ── polls
    prisma.poll.aggregate({
      where: { campaignId },
      _count: { id: true },
      _sum: { totalResponses: true },
    }),

    // ── donations.total + count
    prisma.donation.aggregate({
      where: { campaignId, deletedAt: null },
      _sum: { amount: true },
      _count: { id: true },
    }),

    // ── campaign (spendingLimit)
    prisma.campaign.findUnique({
      where: { id: campaignId },
      select: { spendingLimit: true, electionDate: true },
    }),

    // ── tasks.pending
    prisma.task.count({
      where: { campaignId, status: TaskStatus.pending, deletedAt: null },
    }),

    // ── tasks.overdue
    prisma.task.count({
      where: {
        campaignId,
        deletedAt: null,
        status: { not: TaskStatus.completed },
        dueDate: { lt: now },
      },
    }),

    // ── tasks.completedThisWeek
    prisma.task.count({
      where: {
        campaignId,
        deletedAt: null,
        status: TaskStatus.completed,
        completedAt: { gte: startOfWeek },
      },
    }),

    // ── volunteers.total
    prisma.volunteerProfile.count({ where: { campaignId } }),

    // ── volunteers.activeShifts (shifts this week)
    prisma.volunteerShift.count({
      where: {
        campaignId,
        shiftDate: { gte: startOfWeek },
      },
    }),

    // ── signs.installed
    prisma.sign.count({
      where: { campaignId, status: SignStatus.installed, deletedAt: null },
    }),

    // ── signs.requested
    prisma.sign.count({
      where: { campaignId, status: SignStatus.requested, deletedAt: null },
    }),

    // ── signs.total
    prisma.sign.count({
      where: { campaignId, deletedAt: null },
    }),

    // ── recentActivity (last 10)
    prisma.activityLog.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 10,
      select: { id: true, action: true, entityType: true, createdAt: true, details: true },
    }),

    // ── currentSpending (budget expenses)
    prisma.budgetItem.aggregate({
      where: { campaignId, itemType: BudgetItemType.expense },
      _sum: { amount: true },
    }),
  ]);

  // Build bySupport map
  const bySupport: Record<string, number> = {
    strong_support: 0,
    leaning_support: 0,
    undecided: 0,
    leaning_opposition: 0,
    strong_opposition: 0,
    unknown: 0,
  };
  for (const row of contactsBySupport) {
    bySupport[row.supportLevel] = row._count.id;
  }

  // GOTV contacted/not contacted derived from bySupport
  const p1Count = bySupport[SupportLevel.strong_support] ?? 0;
  const p2Count = bySupport[SupportLevel.leaning_support] ?? 0;
  const p3Count = bySupport[SupportLevel.undecided] ?? 0;

  // Active polls (started, not yet ended)
  const activePolls = await prisma.poll.count({
    where: {
      campaignId,
      startsAt: { lte: now },
      OR: [{ endsAt: null }, { endsAt: { gt: now } }],
    },
  });

  const featuredPolls = await prisma.poll.count({
    where: { campaignId, isFeatured: true },
  });

  return NextResponse.json(
    {
      contacts: {
        total: totalContacts,
        bySupport,
        recentlyContacted,
        followUpNeeded,
        volunteers: volunteerCount,
      },
      gotv: {
        p1Count,
        p2Count,
        p3Count,
        contacted: recentlyContacted,
        notContacted: Math.max(0, totalContacts - recentlyContacted),
        doorsKnocked,
        callsCompleted,
      },
      polls: {
        active: activePolls,
        total: pollStats._count.id,
        totalResponses: pollStats._sum.totalResponses ?? 0,
        featured: featuredPolls,
      },
      donations: {
        total: Number(donationStats._sum.amount ?? 0),
        count: donationStats._count.id,
        goal: campaign?.spendingLimit ?? 0,
      },
      spending: {
        current: Number(totalSpent._sum.amount ?? 0),
        limit: campaign?.spendingLimit ?? 0,
      },
      tasks: {
        pending: pendingTasks,
        overdue: overdueTasks,
        completedThisWeek,
      },
      volunteers: {
        total: totalVolunteers,
        activeShifts,
      },
      signs: {
        installed: installedSigns,
        requested: requestedSigns,
        total: totalSigns,
      },
      recentActivity: recentActivity.map((a) => ({
        id: a.id,
        action: a.action,
        entityType: a.entityType,
        createdAt: a.createdAt.toISOString(),
        details: a.details,
      })),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
