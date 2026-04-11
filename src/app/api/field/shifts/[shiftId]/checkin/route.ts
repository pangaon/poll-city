import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldShiftAssignmentStatus } from "@prisma/client";

// ── POST /api/field/shifts/[shiftId]/checkin ─────────────────────────────────
// Check a volunteer in/out of a shift

export async function POST(
  req: NextRequest,
  { params }: { params: { shiftId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    assignmentId?: string;
    action?: "check_in" | "check_out" | "no_show" | "confirm";
    hoursLogged?: number;
  } | null;

  if (!body?.campaignId || !body?.assignmentId || !body?.action) {
    return NextResponse.json({ error: "campaignId, assignmentId, and action are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const assignment = await prisma.fieldShiftAssignment.findFirst({
    where: {
      id: body.assignmentId,
      shiftId: params.shiftId,
      campaignId: body.campaignId,
    },
  });
  if (!assignment) {
    return NextResponse.json({ error: "Assignment not found" }, { status: 404 });
  }

  const ACTION_STATUS_MAP: Record<string, FieldShiftAssignmentStatus> = {
    confirm:   "confirmed",
    check_in:  "checked_in",
    check_out: "completed",
    no_show:   "no_show",
  };

  const newStatus = ACTION_STATUS_MAP[body.action];
  if (!newStatus) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const updateData: Record<string, unknown> = { status: newStatus };

  if (body.action === "check_in") {
    updateData.checkedInAt = new Date();
    // Update shift to in_progress if still open/full
    await prisma.fieldShift.updateMany({
      where: { id: params.shiftId, status: { in: ["open", "full"] } },
      data: { status: "in_progress" },
    });
  }
  if (body.action === "check_out") {
    updateData.checkedOutAt = new Date();
    if (body.hoursLogged !== undefined) {
      updateData.hoursLogged = body.hoursLogged;
    }
  }
  if (body.action === "confirm") {
    updateData.confirmedAt = new Date();
  }

  const updated = await prisma.fieldShiftAssignment.update({
    where: { id: body.assignmentId },
    data: updateData,
    include: {
      user: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}

// ── GET /api/field/shifts/[shiftId]/checkin?campaignId=X ────────────────────
// Returns all assignments for this shift with check-in status

export async function GET(
  req: NextRequest,
  { params }: { params: { shiftId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const [shift, assignments] = await Promise.all([
    prisma.fieldShift.findFirst({
      where: { id: params.shiftId, campaignId, deletedAt: null },
      select: { id: true, name: true, status: true, scheduledDate: true, startTime: true, endTime: true, maxCapacity: true },
    }),
    prisma.fieldShiftAssignment.findMany({
      where: { shiftId: params.shiftId, campaignId },
      include: { user: { select: { id: true, name: true } } },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  return NextResponse.json({ data: { shift, assignments } });
}
