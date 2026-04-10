/**
 * GET /api/campaign-calendar/agenda
 * Returns a structured day/week agenda for the campaign.
 * Pulls from CalendarItem, Event, VolunteerShift, Task (with dueDate), and FieldAssignment.
 * All items are merged and sorted by start time.
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

  const { searchParams } = new URL(req.url);
  const dateParam = searchParams.get("date") ?? new Date().toISOString().split("T")[0];
  const days = Math.min(parseInt(searchParams.get("days") ?? "7"), 30);

  const start = startOfDay(new Date(dateParam));
  const end = endOfDay(addDays(start, days - 1));

  try {
    const [calItems, events, shifts, tasks, fieldAssignments] = await Promise.all([
      // CalendarItem
      prisma.calendarItem.findMany({
        where: {
          campaignId,
          deletedAt: null,
          itemStatus: { notIn: ["cancelled", "deleted" as never] },
          OR: [
            { startAt: { gte: start, lte: end } },
            { endAt: { gte: start, lte: end } },
            { startAt: { lte: start }, endAt: { gte: end } },
          ],
        },
        include: {
          calendar: { select: { id: true, name: true, color: true, calendarType: true } },
          assignments: {
            include: {
              assignedUser: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          _count: { select: { assignments: true } },
        },
        orderBy: { startAt: "asc" },
        take: 500,
      }),

      // Events (existing Event model)
      prisma.event.findMany({
        where: {
          campaignId,
          deletedAt: null,
          status: { notIn: ["cancelled", "archived"] },
          eventDate: { gte: start, lte: end },
        },
        include: {
          _count: { select: { rsvps: true } },
        },
        orderBy: { eventDate: "asc" },
        take: 100,
      }),

      // Volunteer shifts
      prisma.volunteerShift.findMany({
        where: {
          campaignId,
          shiftDate: { gte: start, lte: end },
        },
        include: {
          _count: { select: { signups: true } },
        },
        orderBy: { shiftDate: "asc" },
        take: 100,
      }),

      // Tasks with due dates
      prisma.task.findMany({
        where: {
          campaignId,
          deletedAt: null,
          status: { notIn: ["completed", "cancelled"] },
          dueDate: { gte: start, lte: end },
        },
        include: {
          assignedTo: { select: { id: true, name: true, avatarUrl: true } },
        },
        orderBy: { dueDate: "asc" },
        take: 100,
      }),

      // Field assignments
      prisma.fieldAssignment.findMany({
        where: {
          campaignId,
          deletedAt: null,
          status: { notIn: ["cancelled"] },
          scheduledDate: { gte: start, lte: end },
        },
        select: {
          id: true,
          name: true,
          assignmentType: true,
          status: true,
          scheduledDate: true,
          assignedUser: { select: { id: true, name: true } },
          targetWard: true,
        },
        orderBy: { scheduledDate: "asc" },
        take: 100,
      }),
    ]);

    // Normalize all into a unified agenda item shape
    type AgendaItem = {
      id: string;
      source: "calendar" | "event" | "shift" | "task" | "field_assignment";
      title: string;
      startAt: Date;
      endAt: Date | null;
      allDay: boolean;
      itemType: string;
      status: string;
      location?: string | null;
      color?: string;
      assigneeCount?: number;
      meta?: Record<string, unknown>;
    };

    const agenda: AgendaItem[] = [];

    calItems.forEach((item) => {
      agenda.push({
        id: item.id,
        source: "calendar",
        title: item.title,
        startAt: item.startAt,
        endAt: item.endAt,
        allDay: item.allDay,
        itemType: item.itemType,
        status: item.itemStatus,
        location: item.locationName ?? item.addressLine1,
        color: item.calendar?.color ?? "#1D9E75",
        assigneeCount: item._count.assignments,
        meta: {
          calendarType: item.calendar?.calendarType,
          calendarName: item.calendar?.name,
          assignments: item.assignments,
          priority: item.priority,
        },
      });
    });

    events.forEach((ev) => {
      agenda.push({
        id: ev.id,
        source: "event",
        title: ev.name,
        startAt: ev.eventDate,
        endAt: null,
        allDay: false,
        itemType: "campaign_event",
        status: ev.status,
        location: ev.location,
        color: "#0A2342",
        assigneeCount: ev._count.rsvps,
        meta: {
          eventType: ev.eventType,
          isPublic: ev.isPublic,
          capacity: ev.capacity,
          rsvpCount: ev._count.rsvps,
        },
      });
    });

    shifts.forEach((sh) => {
      agenda.push({
        id: sh.id,
        source: "shift",
        title: sh.name,
        startAt: new Date(`${sh.shiftDate.toISOString().split("T")[0]}T${sh.startTime}`),
        endAt: new Date(`${sh.shiftDate.toISOString().split("T")[0]}T${sh.endTime}`),
        allDay: false,
        itemType: "volunteer_shift_item",
        status: "scheduled",
        location: sh.meetingLocation,
        color: "#1D9E75",
        assigneeCount: sh._count.signups,
        meta: {
          maxVolunteers: sh.maxVolunteers,
          signupCount: sh._count.signups,
          targetTurfArea: sh.targetTurfArea,
        },
      });
    });

    tasks.forEach((t) => {
      agenda.push({
        id: t.id,
        source: "task",
        title: t.title,
        startAt: t.dueDate ?? new Date(),
        endAt: null,
        allDay: true,
        itemType: "internal_deadline",
        status: t.status,
        color: "#EF9F27",
        assigneeCount: t.assignedTo ? 1 : 0,
        meta: {
          priority: t.priority,
          assignee: t.assignedTo,
        },
      });
    });

    fieldAssignments.forEach((fa) => {
      agenda.push({
        id: fa.id,
        source: "field_assignment",
        title: fa.name,
        startAt: fa.scheduledDate ?? new Date(),
        endAt: null,
        allDay: true,
        itemType: fa.assignmentType,
        status: fa.status,
        color: "#E24B4A",
        assigneeCount: fa.assignedUser ? 1 : 0,
        meta: {
          assignmentType: fa.assignmentType,
          targetWard: fa.targetWard,
          assignee: fa.assignedUser,
        },
      });
    });

    // Sort all items by startAt
    agenda.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());

    // Group by date
    const grouped: Record<string, AgendaItem[]> = {};
    agenda.forEach((item) => {
      const dateKey = item.startAt.toISOString().split("T")[0];
      if (!grouped[dateKey]) grouped[dateKey] = [];
      grouped[dateKey].push(item);
    });

    return NextResponse.json({
      data: agenda,
      grouped,
      meta: {
        start: start.toISOString(),
        end: end.toISOString(),
        days,
        total: agenda.length,
        bySource: {
          calendar: calItems.length,
          event: events.length,
          shift: shifts.length,
          task: tasks.length,
          field_assignment: fieldAssignments.length,
        },
      },
    });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/agenda");
  }
}
