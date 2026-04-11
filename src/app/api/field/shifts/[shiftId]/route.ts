import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldShiftStatus } from "@prisma/client";

// ── GET /api/field/shifts/[shiftId] ─────────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { shiftId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const shift = await prisma.fieldShift.findFirst({
    where: { id: params.shiftId, campaignId, deletedAt: null },
    include: {
      assignments: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          volunteer: { include: { user: { select: { id: true, name: true, email: true } } } },
        },
      },
      attempts: {
        select: { id: true, outcome: true, attemptedAt: true, contactId: true },
        orderBy: { attemptedAt: "desc" },
        take: 50,
      },
      leadUser: { select: { id: true, name: true } },
      fieldProgram: { select: { id: true, name: true } },
      turf: { select: { id: true, name: true } },
      route: { select: { id: true, name: true } },
      _count: { select: { assignments: true, attempts: true } },
    },
  });

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  return NextResponse.json({ data: shift });
}

// ── PATCH /api/field/shifts/[shiftId] ────────────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { shiftId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    status?: FieldShiftStatus;
    description?: string;
    fieldProgramId?: string;
    turfId?: string;
    routeId?: string;
    scheduledDate?: string;
    startTime?: string;
    endTime?: string;
    meetingPoint?: string;
    meetingAddress?: string;
    maxCapacity?: number;
    minCapacity?: number;
    ward?: string;
    pollNumber?: string;
    leadUserId?: string;
    notes?: string;
  } | null;

  const campaignId = body?.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const existing = await prisma.fieldShift.findFirst({
    where: { id: params.shiftId, campaignId, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const validStatuses: FieldShiftStatus[] = ["draft", "open", "full", "in_progress", "completed", "cancelled"];

  const updated = await prisma.fieldShift.update({
    where: { id: params.shiftId },
    data: {
      ...(body?.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body?.status && validStatuses.includes(body.status) ? { status: body.status } : {}),
      ...(body?.description !== undefined ? { description: body.description?.trim() ?? null } : {}),
      ...(body?.fieldProgramId !== undefined ? { fieldProgramId: body.fieldProgramId } : {}),
      ...(body?.turfId !== undefined ? { turfId: body.turfId } : {}),
      ...(body?.routeId !== undefined ? { routeId: body.routeId } : {}),
      ...(body?.scheduledDate ? { scheduledDate: new Date(body.scheduledDate) } : {}),
      ...(body?.startTime ? { startTime: body.startTime } : {}),
      ...(body?.endTime ? { endTime: body.endTime } : {}),
      ...(body?.meetingPoint !== undefined ? { meetingPoint: body.meetingPoint?.trim() ?? null } : {}),
      ...(body?.meetingAddress !== undefined ? { meetingAddress: body.meetingAddress?.trim() ?? null } : {}),
      ...(body?.maxCapacity !== undefined ? { maxCapacity: body.maxCapacity } : {}),
      ...(body?.minCapacity !== undefined ? { minCapacity: body.minCapacity } : {}),
      ...(body?.ward !== undefined ? { ward: body.ward?.trim() ?? null } : {}),
      ...(body?.pollNumber !== undefined ? { pollNumber: body.pollNumber?.trim() ?? null } : {}),
      ...(body?.leadUserId !== undefined ? { leadUserId: body.leadUserId } : {}),
      ...(body?.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
    },
    include: {
      _count: { select: { assignments: true, attempts: true } },
      leadUser: { select: { id: true, name: true } },
      fieldProgram: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

// ── DELETE /api/field/shifts/[shiftId] ───────────────────────────────────────

export async function DELETE(
  req: NextRequest,
  { params }: { params: { shiftId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const existing = await prisma.fieldShift.findFirst({
    where: { id: params.shiftId, campaignId, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (existing.status === "in_progress") {
    return NextResponse.json({ error: "Cannot delete a shift that is in progress" }, { status: 409 });
  }

  await prisma.fieldShift.update({
    where: { id: params.shiftId },
    data: { deletedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
