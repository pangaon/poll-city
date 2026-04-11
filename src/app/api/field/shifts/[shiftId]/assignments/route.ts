import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldShiftAssignmentStatus } from "@prisma/client";

// ── GET /api/field/shifts/[shiftId]/assignments ──────────────────────────────

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
  });
  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const assignments = await prisma.fieldShiftAssignment.findMany({
    where: { shiftId: params.shiftId, campaignId },
    include: {
      user: { select: { id: true, name: true, email: true } },
      volunteer: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({ data: assignments });
}

// ── POST /api/field/shifts/[shiftId]/assignments ─────────────────────────────

export async function POST(
  req: NextRequest,
  { params }: { params: { shiftId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    userId?: string;
    volunteerId?: string;
    status?: FieldShiftAssignmentStatus;
    notes?: string;
  } | null;

  const campaignId = body?.campaignId;
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }
  if (!body?.userId && !body?.volunteerId) {
    return NextResponse.json({ error: "userId or volunteerId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const shift = await prisma.fieldShift.findFirst({
    where: { id: params.shiftId, campaignId, deletedAt: null },
    include: { _count: { select: { assignments: true } } },
  });
  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }
  if (shift.status === "cancelled") {
    return NextResponse.json({ error: "Cannot assign to a cancelled shift" }, { status: 409 });
  }
  if (shift.maxCapacity && shift._count.assignments >= shift.maxCapacity) {
    return NextResponse.json({ error: "Shift is at maximum capacity" }, { status: 409 });
  }

  const validStatuses: FieldShiftAssignmentStatus[] = ["invited", "confirmed", "declined", "checked_in", "completed", "no_show"];

  const assignment = await prisma.fieldShiftAssignment.create({
    data: {
      campaignId,
      shiftId: params.shiftId,
      userId: body.userId ?? null,
      volunteerId: body.volunteerId ?? null,
      status: body.status && validStatuses.includes(body.status) ? body.status : "confirmed",
      notes: body.notes?.trim() ?? null,
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      volunteer: { include: { user: { select: { id: true, name: true, email: true } } } },
    },
  });

  // Update shift status to "full" if max capacity reached
  if (shift.maxCapacity && shift._count.assignments + 1 >= shift.maxCapacity) {
    await prisma.fieldShift.update({
      where: { id: params.shiftId },
      data: { status: "full" },
    });
  }

  return NextResponse.json({ data: assignment }, { status: 201 });
}

// ── PATCH /api/field/shifts/[shiftId]/assignments — update assignment status ─

export async function PATCH(
  req: NextRequest,
  { params }: { params: { shiftId: string } },
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    assignmentId?: string;
    status?: FieldShiftAssignmentStatus;
    checkedInAt?: string;
    checkedOutAt?: string;
    hoursLogged?: number;
    notes?: string;
  } | null;

  const campaignId = body?.campaignId;
  if (!campaignId || !body?.assignmentId) {
    return NextResponse.json({ error: "campaignId and assignmentId are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const validStatuses: FieldShiftAssignmentStatus[] = ["invited", "confirmed", "declined", "checked_in", "completed", "no_show"];

  const updated = await prisma.fieldShiftAssignment.updateMany({
    where: { id: body.assignmentId, shiftId: params.shiftId, campaignId },
    data: {
      ...(body.status && validStatuses.includes(body.status) ? { status: body.status } : {}),
      ...(body.checkedInAt ? { checkedInAt: new Date(body.checkedInAt) } : {}),
      ...(body.checkedOutAt ? { checkedOutAt: new Date(body.checkedOutAt) } : {}),
      ...(body.hoursLogged !== undefined ? { hoursLogged: body.hoursLogged } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
    },
  });

  if (updated.count === 0) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}
