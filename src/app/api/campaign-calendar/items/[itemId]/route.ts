import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError, NOT_FOUND } from "@/lib/api/errors";
import {
  CalendarItemType,
  CalendarItemStatus,
  CalLocationType,
  TaskPriority,
} from "@prisma/client";

const UpdateItemSchema = z.object({
  calendarId: z.string().optional(),
  title: z.string().min(1).max(200).optional(),
  description: z.string().max(2000).nullable().optional(),
  itemType: z.nativeEnum(CalendarItemType).optional(),
  itemStatus: z.nativeEnum(CalendarItemStatus).optional(),
  priority: z.nativeEnum(TaskPriority).optional(),
  startAt: z.string().datetime().optional(),
  endAt: z.string().datetime().optional(),
  allDay: z.boolean().optional(),
  timezone: z.string().optional(),
  locationType: z.nativeEnum(CalLocationType).optional(),
  locationName: z.string().max(200).nullable().optional(),
  addressLine1: z.string().max(200).nullable().optional(),
  city: z.string().max(100).nullable().optional(),
  province: z.string().max(50).nullable().optional(),
  postalCode: z.string().max(10).nullable().optional(),
  latitude: z.number().nullable().optional(),
  longitude: z.number().nullable().optional(),
  virtualUrl: z.string().url().nullable().optional(),
  ward: z.string().max(100).nullable().optional(),
  pollNumber: z.string().max(20).nullable().optional(),
  maxCapacity: z.number().int().positive().nullable().optional(),
  minCapacity: z.number().int().positive().nullable().optional(),
  recurrenceRule: z.string().nullable().optional(),
});

const CancelSchema = z.object({
  cancellationReason: z.string().max(500).optional(),
});

interface Params {
  params: Promise<{ itemId: string }>;
}

// GET /api/campaign-calendar/items/[itemId]
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { itemId } = await params;

  try {
    const item = await prisma.calendarItem.findFirst({
      where: { id: itemId, campaignId, deletedAt: null },
      include: {
        calendar: { select: { id: true, name: true, color: true, calendarType: true } },
        assignments: {
          include: {
            assignedUser: { select: { id: true, name: true, email: true, avatarUrl: true, phone: true } },
          },
        },
        resources: true,
        reminders: true,
        checklists: {
          include: {
            entries: {
              orderBy: { sortOrder: "asc" },
            },
          },
        },
        predecessors: {
          include: {
            predecessor: { select: { id: true, title: true, startAt: true, itemStatus: true } },
          },
        },
        successors: {
          include: {
            successor: { select: { id: true, title: true, startAt: true, itemStatus: true } },
          },
        },
        conflictsSource: {
          where: { status: "open" },
          select: { id: true, conflictType: true, severity: true, entityLabel: true },
        },
        childItems: {
          where: { deletedAt: null },
          select: { id: true, title: true, startAt: true, endAt: true, itemStatus: true },
          orderBy: { startAt: "asc" },
        },
        createdBy: { select: { id: true, name: true } },
        updatedBy: { select: { id: true, name: true } },
      },
    });

    if (!item) return NOT_FOUND;
    return NextResponse.json({ data: item });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/items/[itemId]");
  }
}

// PATCH /api/campaign-calendar/items/[itemId]
export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { itemId } = await params;

  // Special action: ?action=cancel
  const { searchParams } = new URL(req.url);
  const action = searchParams.get("action");

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  try {
    const existing = await prisma.calendarItem.findFirst({
      where: { id: itemId, campaignId, deletedAt: null },
    });
    if (!existing) return NOT_FOUND;

    if (action === "cancel") {
      const parsed = CancelSchema.safeParse(body);
      if (!parsed.success) return apiError("Validation failed", 400);

      const updated = await prisma.calendarItem.update({
        where: { id: itemId },
        data: {
          itemStatus: "cancelled",
          cancelledAt: new Date(),
          cancellationReason: parsed.data.cancellationReason,
          updatedByUserId: session!.user.id as string,
        },
      });

      await prisma.calendarAuditLog.create({
        data: {
          campaignId,
          entityType: "calendar_item",
          entityId: itemId,
          action: "cancelled",
          oldValueJson: { itemStatus: existing.itemStatus },
          newValueJson: { itemStatus: "cancelled", reason: parsed.data.cancellationReason },
          actorUserId: session!.user.id as string,
        },
      });

      return NextResponse.json({ data: updated });
    }

    // Standard update
    const parsed = UpdateItemSchema.safeParse(body);
    if (!parsed.success) {
      return apiError("Validation failed", 400, { issues: parsed.error.issues });
    }

    const data = parsed.data;

    if (data.startAt && data.endAt && new Date(data.endAt) <= new Date(data.startAt)) {
      return apiError("endAt must be after startAt", 400);
    }

    const updated = await prisma.calendarItem.update({
      where: { id: itemId },
      data: {
        ...data,
        startAt: data.startAt ? new Date(data.startAt) : undefined,
        endAt: data.endAt ? new Date(data.endAt) : undefined,
        updatedByUserId: session!.user.id as string,
      },
      include: {
        calendar: { select: { id: true, name: true, color: true } },
        assignments: {
          include: {
            assignedUser: { select: { id: true, name: true, avatarUrl: true } },
          },
        },
      },
    });

    await prisma.calendarAuditLog.create({
      data: {
        campaignId,
        entityType: "calendar_item",
        entityId: itemId,
        action: "updated",
        oldValueJson: {
          title: existing.title,
          startAt: existing.startAt,
          endAt: existing.endAt,
          itemStatus: existing.itemStatus,
        },
        newValueJson: { title: updated.title, startAt: updated.startAt, endAt: updated.endAt },
        actorUserId: session!.user.id as string,
      },
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    return internalError(err, "PATCH /api/campaign-calendar/items/[itemId]");
  }
}

// DELETE /api/campaign-calendar/items/[itemId]
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { itemId } = await params;

  try {
    const existing = await prisma.calendarItem.findFirst({
      where: { id: itemId, campaignId, deletedAt: null },
    });
    if (!existing) return NOT_FOUND;

    // Soft delete
    await prisma.calendarItem.update({
      where: { id: itemId },
      data: {
        deletedAt: new Date(),
        updatedByUserId: session!.user.id as string,
      },
    });

    await prisma.calendarAuditLog.create({
      data: {
        campaignId,
        entityType: "calendar_item",
        entityId: itemId,
        action: "deleted",
        oldValueJson: { title: existing.title, startAt: existing.startAt },
        actorUserId: session!.user.id as string,
      },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(err, "DELETE /api/campaign-calendar/items/[itemId]");
  }
}
