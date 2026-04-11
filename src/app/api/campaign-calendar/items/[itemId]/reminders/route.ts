import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { apiError, internalError, NOT_FOUND } from "@/lib/api/errors";
import { z } from "zod";
import { CalReminderChannel } from "@prisma/client";

const WRITE_ROLES = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"] as const;

interface Params {
  params: Promise<{ itemId: string }>;
}

const CreateReminderSchema = z.object({
  minutesBefore: z.number().int().min(0).max(10_080), // max 1 week ahead
  deliveryChannel: z.nativeEnum(CalReminderChannel).default("in_app"),
  reminderType: z.string().max(50).default("pre_event"),
  recipientType: z.string().max(50).default("all_assigned"),
  recipientId: z.string().optional(),
});

// GET /api/campaign-calendar/items/[itemId]/reminders
export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const { itemId } = await params;

  try {
    const item = await prisma.calendarItem.findFirst({
      where: { id: itemId, campaignId, deletedAt: null },
      select: { id: true },
    });
    if (!item) return NOT_FOUND;

    const reminders = await prisma.calendarReminder.findMany({
      where: { calendarItemId: itemId },
      orderBy: { minutesBefore: "asc" },
    });

    return NextResponse.json({ data: reminders });
  } catch (err) {
    return internalError(err, "GET /api/campaign-calendar/items/[itemId]/reminders");
  }
}

// POST /api/campaign-calendar/items/[itemId]/reminders
export async function POST(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !WRITE_ROLES.includes(membership.role as (typeof WRITE_ROLES)[number])) {
    return apiError("Forbidden", 403);
  }

  const { itemId } = await params;

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return apiError("Invalid JSON", 400);
  }

  const parsed = CreateReminderSchema.safeParse(body);
  if (!parsed.success) {
    return apiError("Validation failed", 400, { issues: parsed.error.issues });
  }

  try {
    const item = await prisma.calendarItem.findFirst({
      where: { id: itemId, campaignId, deletedAt: null },
      select: { id: true, startAt: true },
    });
    if (!item) return NOT_FOUND;

    // Compute when to fire the reminder
    const scheduledFor = new Date(item.startAt.getTime() - parsed.data.minutesBefore * 60 * 1_000);

    const reminder = await prisma.calendarReminder.create({
      data: {
        calendarItemId: itemId,
        minutesBefore: parsed.data.minutesBefore,
        deliveryChannel: parsed.data.deliveryChannel,
        reminderType: parsed.data.reminderType,
        recipientType: parsed.data.recipientType,
        recipientId: parsed.data.recipientId,
        scheduledFor,
      },
    });

    return NextResponse.json({ data: reminder }, { status: 201 });
  } catch (err) {
    return internalError(err, "POST /api/campaign-calendar/items/[itemId]/reminders");
  }
}

// DELETE /api/campaign-calendar/items/[itemId]/reminders?reminderId=
export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = session!.user.activeCampaignId;
  if (!campaignId) return apiError("No active campaign", 400);

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership || !WRITE_ROLES.includes(membership.role as (typeof WRITE_ROLES)[number])) {
    return apiError("Forbidden", 403);
  }

  const { itemId } = await params;
  const reminderId = new URL(req.url).searchParams.get("reminderId");
  if (!reminderId) return apiError("reminderId required", 400);

  try {
    const item = await prisma.calendarItem.findFirst({
      where: { id: itemId, campaignId, deletedAt: null },
      select: { id: true },
    });
    if (!item) return NOT_FOUND;

    const reminder = await prisma.calendarReminder.findFirst({
      where: { id: reminderId, calendarItemId: itemId },
    });
    if (!reminder) return NOT_FOUND;

    await prisma.calendarReminder.delete({ where: { id: reminderId } });

    return NextResponse.json({ success: true });
  } catch (err) {
    return internalError(err, "DELETE /api/campaign-calendar/items/[itemId]/reminders");
  }
}
