/**
 * GET /api/campaign-calendar/dashboard
 * Returns all widgets for the calendar command center dashboard.
 * Single endpoint — all widgets load in one round trip.
 */

import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError } from "@/lib/api/errors";
import { startOfDay, endOfDay, addDays } from "date-fns";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const now = new Date();
  const todayStart = startOfDay(now);
  const todayEnd = endOfDay(now);
  const next7End = endOfDay(addDays(now, 7));
  const next48h = addDays(now, 2);

  try {
    const [
      todayItems,
      upcomingEvents,
      shiftsToday,
      unfilledShifts,
      candidateNext7,
      printDeadlines,
      deliveriesDue,
      signInstallsToday,
      litDropsScheduled,
      openConflicts,
      missedCheckIns,
      noShows,
      commsToday,
      pendingApprovals,
      overdueTasks,
    ] = await Promise.all([
      // Today's critical schedule (CalendarItem)
      prisma.calendarItem.findMany({
        where: {
          campaignId,
          deletedAt: null,
          startAt: { gte: todayStart, lte: todayEnd },
          itemStatus: { notIn: ["cancelled"] },
        },
        include: {
          calendar: { select: { name: true, color: true } },
          assignments: { include: { assignedUser: { select: { id: true, name: true } } } },
        },
        orderBy: { startAt: "asc" },
        take: 20,
      }),

      // Upcoming events (next 7 days)
      prisma.event.findMany({
        where: {
          campaignId,
          deletedAt: null,
          status: { in: ["scheduled", "live"] },
          eventDate: { gte: now, lte: next7End },
        },
        include: { _count: { select: { rsvps: true } } },
        orderBy: { eventDate: "asc" },
        take: 10,
      }),

      // Volunteer shifts today
      prisma.volunteerShift.findMany({
        where: {
          campaignId,
          shiftDate: { gte: todayStart, lte: todayEnd },
        },
        include: {
          signups: { where: { status: { in: ["signed_up", "attended"] } } },
          _count: { select: { signups: true } },
        },
        take: 10,
      }),

      // Unfilled shifts (next 7 days) — signups < minVolunteers
      prisma.volunteerShift.findMany({
        where: {
          campaignId,
          shiftDate: { gte: now, lte: next7End },
        },
        include: { _count: { select: { signups: true } } },
        take: 20,
      }),

      // Candidate calendar next 7 days
      prisma.calendarItem.findMany({
        where: {
          campaignId,
          deletedAt: null,
          calendarId: undefined, // will filter by type
          itemType: { in: ["candidate_appearance", "debate", "media_appearance", "protected_time", "travel_block"] },
          startAt: { gte: now, lte: next7End },
          itemStatus: { notIn: ["cancelled"] },
        },
        orderBy: { startAt: "asc" },
        take: 10,
      }),

      // Print deadlines approaching (next 7 days)
      prisma.printJob.findMany({
        where: {
          campaignId,
          deadline: { gte: now, lte: next7End },
          status: { notIn: ["delivered", "cancelled"] },
        },
        orderBy: { deadline: "asc" },
        take: 10,
      }),

      // Vendor deliveries due (next 48h)
      prisma.serviceBooking.findMany({
        where: {
          campaignId,
          scheduledDate: { gte: now, lte: next48h },
          status: { in: ["confirmed", "pending"] },
        },
        include: { provider: { select: { name: true, category: true } } },
        orderBy: { scheduledDate: "asc" },
        take: 10,
      }),

      // Sign installs scheduled today
      prisma.fieldAssignment.findMany({
        where: {
          campaignId,
          assignmentType: "sign_install",
          deletedAt: null,
          scheduledDate: { gte: todayStart, lte: todayEnd },
          status: { notIn: ["cancelled"] },
        },
        include: {
          assignedUser: { select: { name: true } },
          _count: { select: { stops: true } },
        },
        take: 10,
      }),

      // Literature drops scheduled (next 7 days)
      prisma.fieldAssignment.findMany({
        where: {
          campaignId,
          assignmentType: "lit_drop",
          deletedAt: null,
          scheduledDate: { gte: now, lte: next7End },
          status: { notIn: ["cancelled", "completed"] },
        },
        orderBy: { scheduledDate: "asc" },
        take: 10,
      }),

      // Open conflicts
      prisma.scheduleConflict.findMany({
        where: {
          campaignId,
          status: "open",
        },
        include: {
          sourceItem: { select: { title: true, startAt: true } },
          conflictingItem: { select: { title: true, startAt: true } },
        },
        orderBy: { severity: "desc" },
        take: 10,
      }),

      // Missed check-ins (items that started > 30min ago with pending assignments)
      prisma.calendarItemAssignment.findMany({
        where: {
          calendarItem: {
            campaignId,
            deletedAt: null,
            startAt: { gte: addDays(now, -1), lte: new Date(now.getTime() - 30 * 60 * 1000) },
          },
          checkInAt: null,
          responseStatus: "accepted",
        },
        include: {
          calendarItem: { select: { title: true, startAt: true, locationName: true } },
          assignedUser: { select: { name: true, phone: true } },
        },
        take: 10,
      }),

      // No-shows (shift signups marked no_show today)
      prisma.volunteerShiftSignup.findMany({
        where: {
          status: "no_show",
          shift: {
            campaignId,
            shiftDate: { gte: todayStart, lte: todayEnd },
          },
        },
        include: {
          shift: { select: { name: true, meetingLocation: true } },
          volunteerProfile: {
            select: { user: { select: { name: true, phone: true } } },
          },
        },
        take: 10,
      }),

      // Communications scheduled today
      prisma.newsletterCampaign.findMany({
        where: {
          campaignId,
          status: { in: ["scheduled", "sending"] },
          scheduledFor: { gte: todayStart, lte: todayEnd },
        },
        take: 10,
      }),

      // Pending approvals (items in tentative/draft needing confirmation)
      prisma.calendarItem.findMany({
        where: {
          campaignId,
          deletedAt: null,
          itemStatus: { in: ["tentative", "draft"] },
          startAt: { gte: now },
        },
        orderBy: { startAt: "asc" },
        take: 10,
      }),

      // Overdue tasks with due dates
      prisma.task.findMany({
        where: {
          campaignId,
          deletedAt: null,
          status: { notIn: ["completed", "cancelled"] },
          dueDate: { lt: now },
        },
        include: { assignedTo: { select: { name: true } } },
        orderBy: { dueDate: "asc" },
        take: 10,
      }),
    ]);

    // Compute unfilled shifts (signups < minVolunteers)
    const trueUnfilledShifts = unfilledShifts.filter(
      (sh) => sh._count.signups < sh.minVolunteers
    );

    return NextResponse.json({
      data: {
        todayItems,
        upcomingEvents,
        shiftsToday,
        unfilledShifts: trueUnfilledShifts,
        candidateNext7,
        printDeadlines,
        deliveriesDue,
        signInstallsToday,
        litDropsScheduled,
        openConflicts,
        missedCheckIns,
        noShows,
        commsToday,
        pendingApprovals,
        overdueTasks,
      },
      meta: {
        generatedAt: now.toISOString(),
        campaignId,
      },
    });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/dashboard");
  }
}
