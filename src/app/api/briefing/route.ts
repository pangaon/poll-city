/**
 * GET /api/briefing/morning — Everything a campaign manager needs at 7am.
 *
 * This is the feature that makes a first-time candidate feel like they
 * have a professional campaign manager sitting beside them.
 *
 * One API call returns:
 * - Campaign health score
 * - Days to election + phase
 * - Yesterday's activity (doors, calls, supporters, donations)
 * - Week-over-week trends
 * - Top 3 priorities for today
 * - Volunteer status (active, quiet, new)
 * - Upcoming events
 * - Past-due tasks
 * - Red flags
 */
import { NextRequest, NextResponse } from "next/server";
import { SupportLevel, TaskStatus } from "@prisma/client";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "analytics:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { name: true, candidateName: true, electionDate: true, spendingLimit: true },
  });

  const now = new Date();
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1); yesterday.setHours(0, 0, 0, 0);
  const today = new Date(now); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(now); weekAgo.setDate(weekAgo.getDate() - 7);
  const twoWeeksAgo = new Date(now); twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  const tenDaysAgo = new Date(now); tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);

  const daysToElection = campaign?.electionDate
    ? Math.ceil((campaign.electionDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const phase = !daysToElection ? "FOUNDATION"
    : daysToElection <= 0 ? "POST_ELECTION"
    : daysToElection <= 1 ? "ELECTION_DAY"
    : daysToElection <= 10 ? "GOTV_FINAL"
    : daysToElection <= 30 ? "GOTV_EARLY"
    : daysToElection <= 90 ? "MOMENTUM"
    : "FOUNDATION";

  // All queries in parallel
  const [
    totalContacts,
    supporters,
    undecided,
    doorsYesterday,
    doorsThisWeek,
    doorsLastWeek,
    newSupportersYesterday,
    donationsYesterday,
    donationTotalYesterday,
    upcomingEvents,
    overdueTasks,
    activeVolunteers,
    quietVolunteers,
    newVolunteersThisWeek,
    totalSpent,
    totalDonated,
    totalSigns,
  ] = await Promise.all([
    prisma.contact.count({ where: { campaignId } }),
    prisma.contact.count({ where: { campaignId, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] } } }),
    prisma.contact.count({ where: { campaignId, supportLevel: SupportLevel.undecided } }),
    prisma.interaction.count({ where: { contact: { campaignId }, createdAt: { gte: yesterday, lt: today } } }),
    prisma.interaction.count({ where: { contact: { campaignId }, createdAt: { gte: weekAgo } } }),
    prisma.interaction.count({ where: { contact: { campaignId }, createdAt: { gte: twoWeeksAgo, lt: weekAgo } } }),
    prisma.contact.count({ where: { campaignId, supportLevel: { in: [SupportLevel.strong_support, SupportLevel.leaning_support] }, updatedAt: { gte: yesterday } } }),
    prisma.donation.count({ where: { campaignId, createdAt: { gte: yesterday, lt: today } } }),
    prisma.donation.aggregate({ where: { campaignId, createdAt: { gte: yesterday, lt: today } }, _sum: { amount: true } }).then((r) => Number(r._sum.amount ?? 0)),
    prisma.event.findMany({ where: { campaignId, eventDate: { gte: today } }, orderBy: { eventDate: "asc" }, take: 5, select: { id: true, name: true, eventDate: true, location: true } }),
    prisma.task.count({ where: { campaignId, status: TaskStatus.pending, dueDate: { lt: today } } }),
    prisma.volunteerProfile.count({ where: { campaignId } }),
    // Volunteers who haven't had any interaction in 10 days
    prisma.volunteerProfile.count({ where: { campaignId, user: { interactions: { none: { createdAt: { gte: tenDaysAgo } } } } } }),
    prisma.volunteerProfile.count({ where: { campaignId, createdAt: { gte: weekAgo } } }),
    prisma.budgetItem.aggregate({ where: { campaignId, itemType: "expense" }, _sum: { amount: true } }).then((r) => Number(r._sum.amount ?? 0)),
    prisma.donation.aggregate({ where: { campaignId }, _sum: { amount: true } }).then((r) => Number(r._sum.amount ?? 0)),
    prisma.sign.count({ where: { campaignId } }),
  ]);

  const supportRate = totalContacts > 0 ? Math.round((supporters / totalContacts) * 100) : 0;
  const doorsWoWChange = doorsLastWeek > 0 ? Math.round(((doorsThisWeek - doorsLastWeek) / doorsLastWeek) * 100) : doorsThisWeek > 0 ? 100 : 0;
  const spendingLimit = campaign?.spendingLimit ?? 25000;
  const budgetUsedPct = spendingLimit > 0 ? Math.round((totalSpent / spendingLimit) * 100) : 0;

  // Generate top 3 priorities algorithmically
  const priorities: { priority: number; action: string; why: string; link: string }[] = [];

  if (totalContacts === 0) {
    priorities.push({ priority: 1, action: "Import your voter list", why: "Nothing works without contacts. This is step one.", link: "/import-export" });
  }
  if (totalContacts > 0 && supporters === 0 && doorsThisWeek === 0) {
    priorities.push({ priority: priorities.length + 1, action: "Start canvassing", why: "You have contacts but no doors knocked. Get a turf set up and get out there.", link: "/canvassing" });
  }
  if (activeVolunteers === 0) {
    priorities.push({ priority: priorities.length + 1, action: "Recruit volunteers", why: "A candidate with volunteers beats a candidate with money every time.", link: "/volunteers" });
  }
  if (phase === "GOTV_FINAL" || phase === "GOTV_EARLY") {
    priorities.push({ priority: priorities.length + 1, action: "Build your GOTV priority list", why: `${daysToElection} days to election. Every confirmed supporter who does not vote is a vote left on the table.`, link: "/gotv" });
  }
  if (overdueTasks > 0) {
    priorities.push({ priority: priorities.length + 1, action: `Clear ${overdueTasks} overdue task${overdueTasks > 1 ? "s" : ""}`, why: "Overdue tasks mean something fell through the cracks.", link: "/tasks" });
  }
  if (budgetUsedPct > 80) {
    priorities.push({ priority: priorities.length + 1, action: "Review your budget", why: `You have used ${budgetUsedPct}% of your spending limit. Time to prioritize.`, link: "/budget" });
  }
  if (doorsThisWeek < doorsLastWeek && doorsLastWeek > 0) {
    priorities.push({ priority: priorities.length + 1, action: "Increase canvassing pace", why: `Doors are down ${Math.abs(doorsWoWChange)}% from last week. Momentum matters.`, link: "/canvassing" });
  }
  if (totalSigns === 0 && daysToElection && daysToElection < 60) {
    priorities.push({ priority: priorities.length + 1, action: "Deploy lawn signs", why: "Signs signal viability. Get visible in your community.", link: "/signs" });
  }
  if (upcomingEvents.length === 0 && daysToElection && daysToElection > 14) {
    priorities.push({ priority: priorities.length + 1, action: "Schedule a campaign event", why: "Events recruit volunteers, raise money, and build momentum.", link: "/events" });
  }

  // Take top 3
  const topPriorities = priorities.slice(0, 3);

  // Red flags
  const redFlags: string[] = [];
  if (budgetUsedPct > 90) redFlags.push(`Spending at ${budgetUsedPct}% of limit — approaching ceiling`);
  if (quietVolunteers > 3) redFlags.push(`${quietVolunteers} volunteers have gone quiet (no activity in 10 days)`);
  if (doorsWoWChange < -30 && doorsLastWeek > 20) redFlags.push(`Canvassing pace dropped ${Math.abs(doorsWoWChange)}% from last week`);
  if (daysToElection && daysToElection < 14 && supportRate < 30) redFlags.push(`Support rate is ${supportRate}% with only ${daysToElection} days to go`);

  return NextResponse.json({
    campaign: {
      name: campaign?.name,
      candidateName: campaign?.candidateName,
      daysToElection,
      phase,
    },
    yesterday: {
      doorsKnocked: doorsYesterday,
      newSupporters: newSupportersYesterday,
      donations: donationsYesterday,
      donationAmount: Math.round(donationTotalYesterday),
    },
    trends: {
      doorsThisWeek,
      doorsLastWeek,
      doorsWoWChange,
      supportRate,
    },
    totals: {
      contacts: totalContacts,
      supporters,
      undecided,
      signs: totalSigns,
      budgetUsed: Math.round(totalSpent),
      budgetLimit: spendingLimit,
      budgetUsedPct,
      totalDonated: Math.round(totalDonated),
    },
    volunteers: {
      active: activeVolunteers,
      quiet: quietVolunteers,
      newThisWeek: newVolunteersThisWeek,
    },
    upcomingEvents: upcomingEvents.map((e) => ({
      id: e.id,
      name: e.name,
      date: e.eventDate,
      location: e.location,
    })),
    overdueTasks,
    priorities: topPriorities,
    redFlags,
  }, { headers: { "Cache-Control": "no-store" } });
}
