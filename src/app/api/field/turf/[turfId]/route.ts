import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { TurfStatus } from "@prisma/client";

type Params = { params: Promise<{ turfId: string }> };

// ── GET /api/field/turf/[turfId]?campaignId=X ────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { turfId } = await params;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const turf = await prisma.turf.findFirst({
    where: { id: turfId, campaignId },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedVolunteer: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      assignedGroup: { select: { id: true, name: true } },
      stops: {
        orderBy: { order: "asc" },
        include: {
          contact: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              address1: true,
              streetNumber: true,
              streetName: true,
              city: true,
              phone: true,
              supportLevel: true,
              ward: true,
              municipalPoll: true,
              householdId: true,
              household: { select: { lat: true, lng: true } },
            },
          },
        },
      },
      routes: {
        where: { deletedAt: null },
        select: { id: true, name: true, status: true, totalStops: true },
      },
      fieldShifts: {
        where: { deletedAt: null },
        select: { id: true, name: true, status: true, scheduledDate: true },
      },
      _count: { select: { stops: true, routes: true } },
    },
  });

  if (!turf) {
    return NextResponse.json({ error: "Turf not found" }, { status: 404 });
  }

  return NextResponse.json({ data: turf });
}

// ── PATCH /api/field/turf/[turfId] ───────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { turfId } = await params;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    status?: TurfStatus;
    assignedUserId?: string | null;
    assignedVolunteerId?: string | null;
    assignedGroupId?: string | null;
    ward?: string | null;
    pollNumber?: string | null;
    notes?: string | null;
  } | null;

  if (!body?.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    body.campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const existing = await prisma.turf.findFirst({
    where: { id: turfId, campaignId: body.campaignId },
  });

  if (!existing) {
    return NextResponse.json({ error: "Turf not found" }, { status: 404 });
  }

  const validStatuses: TurfStatus[] = ["draft", "assigned", "in_progress", "completed", "reassigned"];

  const updated = await prisma.turf.update({
    where: { id: turfId },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.status && validStatuses.includes(body.status) ? { status: body.status } : {}),
      ...(body.assignedUserId !== undefined ? { assignedUserId: body.assignedUserId } : {}),
      ...(body.assignedVolunteerId !== undefined
        ? { assignedVolunteerId: body.assignedVolunteerId }
        : {}),
      ...(body.assignedGroupId !== undefined ? { assignedGroupId: body.assignedGroupId } : {}),
      ...(body.ward !== undefined ? { ward: body.ward?.trim() ?? null } : {}),
      ...(body.pollNumber !== undefined ? { pollNumber: body.pollNumber?.trim() ?? null } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
    },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedVolunteer: {
        include: { user: { select: { id: true, name: true, email: true } } },
      },
      assignedGroup: { select: { id: true, name: true } },
      _count: { select: { stops: true } },
    },
  });

  // Audit assignment changes
  const assignmentChanged =
    body.assignedUserId !== undefined && body.assignedUserId !== existing.assignedUserId;

  if (assignmentChanged) {
    await prisma.activityLog.create({
      data: {
        campaignId: body.campaignId,
        userId: session!.user.id,
        action: "updated_turf_assignment",
        entityType: "turf",
        entityId: turfId,
        details: {
          name: updated.name,
          assignedUserIdFrom: existing.assignedUserId,
          assignedUserIdTo: body.assignedUserId,
          source: "field_ops",
        },
      },
    });
  }

  return NextResponse.json({ data: updated });
}

// ── DELETE /api/field/turf/[turfId] ──────────────────────────────────────────

export async function DELETE(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { turfId } = await params;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const turf = await prisma.turf.findFirst({
    where: { id: turfId, campaignId },
  });

  if (!turf) {
    return NextResponse.json({ error: "Turf not found" }, { status: 404 });
  }

  // Delete stops first (cascade won't fire here since Turf delete does cascade in schema,
  // but being explicit is safer when routes/shifts reference it)
  await prisma.turfStop.deleteMany({ where: { turfId } });
  await prisma.turf.delete({ where: { id: turfId } });

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "deleted_turf",
      entityType: "turf",
      entityId: turfId,
      details: { name: turf.name, source: "field_ops" },
    },
  });

  return NextResponse.json({ success: true });
}
