import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldShiftType, FieldShiftStatus } from "@prisma/client";

// ── GET /api/field/shifts?campaignId=X ──────────────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const statusFilter = req.nextUrl.searchParams.get("status") as FieldShiftStatus | null;
  const programId = req.nextUrl.searchParams.get("programId");
  const shiftType = req.nextUrl.searchParams.get("shiftType") as FieldShiftType | null;

  const validStatuses: FieldShiftStatus[] = ["draft", "open", "full", "in_progress", "completed", "cancelled"];
  const validTypes: FieldShiftType[] = ["canvassing", "literature", "sign_install", "sign_remove", "event_field", "office", "gotv", "poll_day"];

  const shifts = await prisma.fieldShift.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(statusFilter && validStatuses.includes(statusFilter) ? { status: statusFilter } : {}),
      ...(programId ? { fieldProgramId: programId } : {}),
      ...(shiftType && validTypes.includes(shiftType) ? { shiftType } : {}),
    },
    include: {
      _count: { select: { assignments: true, attempts: true } },
      leadUser: { select: { id: true, name: true } },
      fieldProgram: { select: { id: true, name: true } },
      turf: { select: { id: true, name: true } },
      route: { select: { id: true, name: true } },
    },
    orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({ data: shifts });
}

// ── POST /api/field/shifts ───────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    shiftType?: FieldShiftType;
    description?: string;
    fieldProgramId?: string;
    turfId?: string;
    routeId?: string;
    scheduledDate?: string;
    startTime?: string;
    endTime?: string;
    timezone?: string;
    meetingPoint?: string;
    meetingAddress?: string;
    maxCapacity?: number;
    minCapacity?: number;
    ward?: string;
    pollNumber?: string;
    leadUserId?: string;
    notes?: string;
  } | null;

  if (!body?.campaignId || !body?.name?.trim()) {
    return NextResponse.json({ error: "campaignId and name are required" }, { status: 400 });
  }
  if (!body.scheduledDate || !body.startTime || !body.endTime) {
    return NextResponse.json({ error: "scheduledDate, startTime, and endTime are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const validTypes: FieldShiftType[] = ["canvassing", "literature", "sign_install", "sign_remove", "event_field", "office", "gotv", "poll_day"];

  const shift = await prisma.fieldShift.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      shiftType: validTypes.includes(body.shiftType!) ? body.shiftType! : "canvassing",
      description: body.description?.trim() ?? null,
      fieldProgramId: body.fieldProgramId ?? null,
      turfId: body.turfId ?? null,
      routeId: body.routeId ?? null,
      scheduledDate: new Date(body.scheduledDate),
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone ?? "America/Toronto",
      meetingPoint: body.meetingPoint?.trim() ?? null,
      meetingAddress: body.meetingAddress?.trim() ?? null,
      maxCapacity: body.maxCapacity ?? null,
      minCapacity: body.minCapacity ?? null,
      ward: body.ward?.trim() ?? null,
      pollNumber: body.pollNumber?.trim() ?? null,
      leadUserId: body.leadUserId ?? null,
      notes: body.notes?.trim() ?? null,
      status: "draft",
    },
    include: {
      _count: { select: { assignments: true, attempts: true } },
      leadUser: { select: { id: true, name: true } },
      fieldProgram: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: shift }, { status: 201 });
}
