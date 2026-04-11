import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldShiftStatus } from "@prisma/client";

// ── GET /api/field/lit-drops/[litDropId] ────────────────────────────────────

export async function GET(
  req: NextRequest,
  { params }: { params: { litDropId: string } }
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
    where: {
      id: params.litDropId,
      campaignId,
      shiftType: "literature",
      deletedAt: null,
    },
    include: {
      _count: { select: { assignments: true, attempts: true } },
      leadUser: { select: { id: true, name: true } },
      fieldProgram: { select: { id: true, name: true } },
      turf: { select: { id: true, name: true } },
      route: { select: { id: true, name: true } },
      assignments: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!shift) {
    return NextResponse.json({ error: "Lit drop run not found" }, { status: 404 });
  }

  return NextResponse.json({ data: shift });
}

// ── PATCH /api/field/lit-drops/[litDropId] ──────────────────────────────────

export async function PATCH(
  req: NextRequest,
  { params }: { params: { litDropId: string } }
) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    status?: FieldShiftStatus;
    scheduledDate?: string;
    startTime?: string;
    endTime?: string;
    meetingPoint?: string;
    meetingAddress?: string;
    maxCapacity?: number;
    ward?: string;
    pollNumber?: string;
    leadUserId?: string;
    notes?: string;
    turfId?: string;
    routeId?: string;
    fieldProgramId?: string;
  } | null;

  if (!body?.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  const validStatuses: FieldShiftStatus[] = ["draft", "open", "full", "in_progress", "completed", "cancelled"];

  const existing = await prisma.fieldShift.findFirst({
    where: { id: params.litDropId, campaignId: body.campaignId, shiftType: "literature", deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "Lit drop run not found" }, { status: 404 });
  }

  const updated = await prisma.fieldShift.update({
    where: { id: params.litDropId },
    data: {
      ...(body.name?.trim() ? { name: body.name.trim() } : {}),
      ...(body.status && validStatuses.includes(body.status) ? { status: body.status } : {}),
      ...(body.scheduledDate ? { scheduledDate: new Date(body.scheduledDate) } : {}),
      ...(body.startTime ? { startTime: body.startTime } : {}),
      ...(body.endTime ? { endTime: body.endTime } : {}),
      ...(body.meetingPoint !== undefined ? { meetingPoint: body.meetingPoint?.trim() ?? null } : {}),
      ...(body.meetingAddress !== undefined ? { meetingAddress: body.meetingAddress?.trim() ?? null } : {}),
      ...(body.maxCapacity !== undefined ? { maxCapacity: body.maxCapacity } : {}),
      ...(body.ward !== undefined ? { ward: body.ward?.trim() ?? null } : {}),
      ...(body.pollNumber !== undefined ? { pollNumber: body.pollNumber?.trim() ?? null } : {}),
      ...(body.leadUserId !== undefined ? { leadUserId: body.leadUserId ?? null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
      ...(body.turfId !== undefined ? { turfId: body.turfId ?? null } : {}),
      ...(body.routeId !== undefined ? { routeId: body.routeId ?? null } : {}),
      ...(body.fieldProgramId !== undefined ? { fieldProgramId: body.fieldProgramId ?? null } : {}),
    },
    include: {
      _count: { select: { assignments: true, attempts: true } },
      leadUser: { select: { id: true, name: true } },
      fieldProgram: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
