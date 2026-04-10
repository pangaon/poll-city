import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError } from "@/lib/api/errors";
import {
  CalendarItemType,
  CalendarItemStatus,
  CalLocationType,
  TaskPriority,
} from "@prisma/client";

const CreateItemSchema = z.object({
  calendarId: z.string().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(2000).optional(),
  itemType: z.nativeEnum(CalendarItemType).default("other_item"),
  itemStatus: z.nativeEnum(CalendarItemStatus).default("scheduled"),
  priority: z.nativeEnum(TaskPriority).default("medium"),
  startAt: z.string().datetime(),
  endAt: z.string().datetime(),
  allDay: z.boolean().default(false),
  timezone: z.string().default("America/Toronto"),
  locationType: z.nativeEnum(CalLocationType).default("in_person"),
  locationName: z.string().max(200).optional(),
  addressLine1: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  province: z.string().max(50).optional(),
  postalCode: z.string().max(10).optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  virtualUrl: z.string().url().optional(),
  ward: z.string().max(100).optional(),
  pollNumber: z.string().max(20).optional(),
  // Cross-entity links
  eventId: z.string().optional(),
  taskId: z.string().optional(),
  fieldAssignmentId: z.string().optional(),
  printJobId: z.string().optional(),
  volunteerShiftId: z.string().optional(),
  // Capacity
  maxCapacity: z.number().int().positive().optional(),
  minCapacity: z.number().int().positive().optional(),
  // Recurrence
  recurrenceRule: z.string().optional(),
  parentCalendarItemId: z.string().optional(),
});

// GET /api/campaign-calendar/items?start=&end=&type=&status=&calendarId=
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { searchParams } = new URL(req.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  const type = searchParams.get("type") as CalendarItemType | null;
  const status = searchParams.get("status") as CalendarItemStatus | null;
  const calendarId = searchParams.get("calendarId");
  const ward = searchParams.get("ward");
  const assignedUserId = searchParams.get("assignedUserId");
  const page = parseInt(searchParams.get("page") ?? "1");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "200"), 500);

  try {
    const where: Record<string, unknown> = {
      campaignId,
      deletedAt: null,
    };

    if (start && end) {
      where.startAt = { gte: new Date(start) };
      where.endAt = { lte: new Date(end) };
    } else if (start) {
      where.startAt = { gte: new Date(start) };
    }

    if (type) where.itemType = type;
    if (status) where.itemStatus = status;
    if (calendarId) where.calendarId = calendarId;
    if (ward) where.ward = ward;

    if (assignedUserId) {
      where.assignments = {
        some: { assignedUserId },
      };
    }

    const [items, total] = await Promise.all([
      prisma.calendarItem.findMany({
        where,
        include: {
          calendar: { select: { id: true, name: true, color: true, calendarType: true } },
          assignments: {
            include: {
              assignedUser: { select: { id: true, name: true, avatarUrl: true } },
            },
          },
          _count: {
            select: { assignments: true, reminders: true, checklists: true },
          },
        },
        orderBy: { startAt: "asc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.calendarItem.count({ where }),
    ]);

    return NextResponse.json({
      data: items,
      meta: { total, page, limit, pages: Math.ceil(total / limit) },
    });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/items");
  }
}

// POST /api/campaign-calendar/items
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = CreateItemSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 400, { issues: parsed.error.issues });
  }

  const data = parsed.data;

  // Validate time window
  if (new Date(data.endAt) <= new Date(data.startAt)) {
    return apiError("endAt must be after startAt", 400);
  }

  // If calendarId provided, verify it belongs to this campaign
  if (data.calendarId) {
    const cal = await prisma.calendar.findFirst({
      where: { id: data.calendarId, campaignId },
    });
    if (!cal) return apiError("Calendar not found", 404);
  }

  try {
    const item = await prisma.calendarItem.create({
      data: {
        campaignId,
        calendarId: data.calendarId,
        parentCalendarItemId: data.parentCalendarItemId,
        title: data.title,
        description: data.description,
        itemType: data.itemType,
        itemStatus: data.itemStatus,
        priority: data.priority,
        startAt: new Date(data.startAt),
        endAt: new Date(data.endAt),
        allDay: data.allDay,
        timezone: data.timezone,
        locationType: data.locationType,
        locationName: data.locationName,
        addressLine1: data.addressLine1,
        city: data.city,
        province: data.province,
        postalCode: data.postalCode,
        latitude: data.latitude,
        longitude: data.longitude,
        virtualUrl: data.virtualUrl,
        ward: data.ward,
        pollNumber: data.pollNumber,
        eventId: data.eventId,
        taskId: data.taskId,
        fieldAssignmentId: data.fieldAssignmentId,
        printJobId: data.printJobId,
        volunteerShiftId: data.volunteerShiftId,
        maxCapacity: data.maxCapacity,
        minCapacity: data.minCapacity,
        recurrenceRule: data.recurrenceRule,
        recurrenceParentId: data.parentCalendarItemId,
        createdByUserId: session!.user.id as string,
      },
      include: {
        calendar: { select: { id: true, name: true, color: true } },
        assignments: true,
      },
    });

    // Audit log
    await prisma.calendarAuditLog.create({
      data: {
        campaignId,
        entityType: "calendar_item",
        entityId: item.id,
        action: "created",
        newValueJson: { title: item.title, itemType: item.itemType, startAt: item.startAt },
        actorUserId: session!.user.id as string,
      },
    });

    return NextResponse.json({ data: item }, { status: 201 });
  } catch (err) {
    return internalError(err, "POST /api/campaign-calendar/items");
  }
}
