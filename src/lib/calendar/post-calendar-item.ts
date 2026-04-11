/**
 * Cross-system calendar wiring helpers.
 *
 * Each function is called fire-and-forget (non-fatal) from the originating
 * route after the primary record is created. A failure here never rolls back
 * the primary operation — the campaign manager can create the calendar item
 * manually if needed.
 *
 * GAP-006 — Event create          → CalendarItem(campaign_event)
 * GAP-007 — Scheduled msg         → CalendarItem(email_blast_item | sms_blast_item)
 * GAP-008 — Print order           → CalendarItem(print_deadline)
 * GAP-009 — Volunteer shift create → CalendarItem(volunteer_shift_item)
 * GAP-010 — Task create (dueDate) → CalendarItem(internal_deadline)
 * GAP-011 — Field assignment      → CalendarItem(appropriate type)
 */
import prisma from "@/lib/db/prisma";
import { CalendarItemType, CalendarItemStatus, CalLocationType } from "@prisma/client";

// ─── GAP-006: Campaign Event ───────────────────────────────────────────────────

export interface PostEventCalendarItemInput {
  campaignId: string;
  eventId: string;
  title: string;
  description?: string | null;
  eventDate: Date;
  timezone: string;
  isVirtual?: boolean;
  virtualUrl?: string | null;
  locationName?: string | null;
  addressLine1?: string | null;
  city?: string | null;
  province?: string | null;
  postalCode?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  capacity?: number | null;
  isDraft?: boolean;
  userId: string;
}

export async function postEventCalendarItem(
  opts: PostEventCalendarItemInput,
): Promise<void> {
  const startAt = opts.eventDate;
  // Default 2-hour block; campaign manager can adjust on the calendar
  const endAt = new Date(opts.eventDate.getTime() + 2 * 60 * 60 * 1_000);

  await prisma.calendarItem.create({
    data: {
      campaignId: opts.campaignId,
      title: opts.title,
      description: opts.description ?? null,
      itemType: CalendarItemType.campaign_event,
      itemStatus: opts.isDraft
        ? CalendarItemStatus.draft
        : CalendarItemStatus.scheduled,
      startAt,
      endAt,
      timezone: opts.timezone,
      locationType: opts.isVirtual
        ? CalLocationType.virtual
        : CalLocationType.in_person,
      locationName: opts.locationName ?? null,
      addressLine1: opts.addressLine1 ?? null,
      city: opts.city ?? null,
      province: opts.province ?? null,
      postalCode: opts.postalCode ?? null,
      latitude: opts.latitude ?? null,
      longitude: opts.longitude ?? null,
      virtualUrl: opts.virtualUrl ?? null,
      maxCapacity: opts.capacity ?? null,
      eventId: opts.eventId,
      createdByUserId: opts.userId,
    },
  });
}

// ─── GAP-007: Scheduled Communications Blast ──────────────────────────────────

type CommChannel = "email" | "sms" | "push";

function commsItemType(channel: CommChannel): CalendarItemType {
  if (channel === "email") return CalendarItemType.email_blast_item;
  if (channel === "sms") return CalendarItemType.sms_blast_item;
  return CalendarItemType.other_item; // push has no dedicated type
}

export interface PostScheduledMessageCalendarItemInput {
  campaignId: string;
  messageId: string;
  channel: CommChannel;
  subject?: string | null;
  sendAt: Date;
  timezone: string;
  userId: string;
}

export async function postScheduledMessageCalendarItem(
  opts: PostScheduledMessageCalendarItemInput,
): Promise<void> {
  const channelLabel = opts.channel.toUpperCase();
  const title = opts.subject
    ? `${channelLabel}: ${opts.subject}`
    : `${channelLabel} blast`;

  const startAt = opts.sendAt;
  // 30-minute execution window on the calendar
  const endAt = new Date(opts.sendAt.getTime() + 30 * 60 * 1_000);

  await prisma.calendarItem.create({
    data: {
      campaignId: opts.campaignId,
      title,
      itemType: commsItemType(opts.channel),
      itemStatus: CalendarItemStatus.scheduled,
      startAt,
      endAt,
      timezone: opts.timezone,
      locationType: CalLocationType.virtual,
      communicationsSendId: opts.messageId,
      createdByUserId: opts.userId,
    },
  });
}

// ─── GAP-008: Print Order Deadline ────────────────────────────────────────────

export interface PostPrintOrderCalendarItemInput {
  campaignId: string;
  printOrderId: string;
  productType: string;
  quantity: number;
  userId: string;
}

export async function postPrintOrderCalendarItem(
  opts: PostPrintOrderCalendarItemInput,
): Promise<void> {
  // Estimated delivery: 2 weeks from order date, business-hours window
  const startAt = new Date();
  startAt.setDate(startAt.getDate() + 14);
  startAt.setHours(9, 0, 0, 0);

  const endAt = new Date(startAt);
  endAt.setHours(17, 0, 0, 0);

  const productLabel = opts.productType.replace(/_/g, " ");
  const title = `Print deadline: ${productLabel} ×${opts.quantity}`;

  await prisma.calendarItem.create({
    data: {
      campaignId: opts.campaignId,
      title,
      itemType: CalendarItemType.print_deadline,
      itemStatus: CalendarItemStatus.scheduled,
      startAt,
      endAt,
      timezone: "America/Toronto",
      locationType: CalLocationType.tbd,
      printOrderId: opts.printOrderId,
      createdByUserId: opts.userId,
    },
  });
}

// ─── GAP-009: Volunteer Shift ─────────────────────────────────────────────────

/** Pads a time string to HH:MM format if needed. */
function padTime(t: string): string {
  const parts = t.split(":");
  return `${parts[0].padStart(2, "0")}:${(parts[1] ?? "00").padStart(2, "0")}`;
}

export interface PostVolunteerShiftCalendarItemInput {
  campaignId: string;
  shiftId: string;
  name: string;
  shiftDate: Date;
  startTime: string; // e.g. "09:00"
  endTime: string;   // e.g. "17:00"
  meetingLocation?: string | null;
  maxVolunteers?: number | null;
  userId: string;
}

export async function postVolunteerShiftCalendarItem(
  opts: PostVolunteerShiftCalendarItemInput,
): Promise<void> {
  const dateStr = opts.shiftDate.toISOString().split("T")[0];
  const startAt = new Date(`${dateStr}T${padTime(opts.startTime)}:00`);
  const endAt = new Date(`${dateStr}T${padTime(opts.endTime)}:00`);
  // Handle midnight crossover (e.g. 22:00–02:00)
  if (endAt <= startAt) endAt.setDate(endAt.getDate() + 1);

  await prisma.calendarItem.create({
    data: {
      campaignId: opts.campaignId,
      title: opts.name,
      itemType: CalendarItemType.volunteer_shift_item,
      itemStatus: CalendarItemStatus.scheduled,
      startAt,
      endAt,
      timezone: "America/Toronto",
      locationType: opts.meetingLocation ? CalLocationType.in_person : CalLocationType.tbd,
      locationName: opts.meetingLocation ?? null,
      maxCapacity: opts.maxVolunteers ?? null,
      volunteerShiftId: opts.shiftId,
      createdByUserId: opts.userId,
    },
  });
}

// ─── GAP-010: Task Due Date ───────────────────────────────────────────────────

export interface PostTaskCalendarItemInput {
  campaignId: string;
  taskId: string;
  title: string;
  dueDate: Date;
  userId: string;
}

export async function postTaskCalendarItem(
  opts: PostTaskCalendarItemInput,
): Promise<void> {
  const startAt = new Date(opts.dueDate);
  startAt.setHours(9, 0, 0, 0);
  const endAt = new Date(opts.dueDate);
  endAt.setHours(17, 0, 0, 0);

  await prisma.calendarItem.create({
    data: {
      campaignId: opts.campaignId,
      title: opts.title,
      itemType: CalendarItemType.internal_deadline,
      itemStatus: CalendarItemStatus.scheduled,
      allDay: true,
      startAt,
      endAt,
      timezone: "America/Toronto",
      locationType: CalLocationType.tbd,
      taskId: opts.taskId,
      createdByUserId: opts.userId,
    },
  });
}

// ─── GAP-011: Field Assignment ────────────────────────────────────────────────

const ASSIGNMENT_TYPE_MAP: Record<string, CalendarItemType> = {
  lit_drop: CalendarItemType.literature_drop_item,
  literature_drop: CalendarItemType.literature_drop_item,
  sign_install: CalendarItemType.sign_install_item,
  sign_removal: CalendarItemType.sign_removal_item,
  canvass: CalendarItemType.canvassing_run,
  canvassing: CalendarItemType.canvassing_run,
  phone_bank: CalendarItemType.phone_bank_item,
  scrutineer: CalendarItemType.scrutineer_duty,
};

export interface PostFieldAssignmentCalendarItemInput {
  campaignId: string;
  assignmentId: string;
  assignmentType: string;
  name: string;
  scheduledDate: Date;
  userId: string;
}

export async function postFieldAssignmentCalendarItem(
  opts: PostFieldAssignmentCalendarItemInput,
): Promise<void> {
  const itemType = ASSIGNMENT_TYPE_MAP[opts.assignmentType] ?? CalendarItemType.other_item;
  const startAt = new Date(opts.scheduledDate);
  startAt.setHours(9, 0, 0, 0);
  const endAt = new Date(opts.scheduledDate);
  endAt.setHours(17, 0, 0, 0);

  await prisma.calendarItem.create({
    data: {
      campaignId: opts.campaignId,
      title: opts.name,
      itemType,
      itemStatus: CalendarItemStatus.scheduled,
      startAt,
      endAt,
      timezone: "America/Toronto",
      locationType: CalLocationType.in_person,
      fieldAssignmentId: opts.assignmentId,
      createdByUserId: opts.userId,
    },
  });
}
