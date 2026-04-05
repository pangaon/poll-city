import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { TurfStatus } from "@prisma/client";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const turf = await prisma.turf.findUnique({
    where: { id: params.id },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedGroup: { select: { id: true, name: true, targetWard: true } },
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
    },
  });

  if (!turf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: turf.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ data: turf });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const turf = await prisma.turf.findUnique({ where: { id: params.id } });
  if (!turf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: turf.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let body: {
    status?: TurfStatus;
    assignedUserId?: string | null;
    assignedGroupId?: string | null;
    name?: string;
    notes?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const statusChanged = body.status !== undefined && body.status !== turf.status;
  const assignedUserChanged = body.assignedUserId !== undefined && body.assignedUserId !== turf.assignedUserId;
  const assignedGroupChanged = body.assignedGroupId !== undefined && body.assignedGroupId !== turf.assignedGroupId;

  const updated = await prisma.turf.update({
    where: { id: params.id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.assignedUserId !== undefined ? { assignedUserId: body.assignedUserId } : {}),
      ...(body.assignedGroupId !== undefined ? { assignedGroupId: body.assignedGroupId } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: {
      assignedUser: { select: { id: true, name: true, email: true } },
      assignedGroup: { select: { id: true, name: true, targetWard: true } },
    },
  });

  if (statusChanged) {
    await prisma.activityLog.create({
      data: {
        campaignId: turf.campaignId,
        userId: session!.user.id,
        action: "updated_turf_status",
        entityType: "turf",
        entityId: turf.id,
        details: {
          from: turf.status,
          to: body.status,
          name: updated.name,
        },
      },
    });
  }

  if (assignedUserChanged || assignedGroupChanged) {
    await prisma.activityLog.create({
      data: {
        campaignId: turf.campaignId,
        userId: session!.user.id,
        action: "updated_turf_assignment",
        entityType: "turf",
        entityId: turf.id,
        details: {
          assignedUserIdFrom: turf.assignedUserId,
          assignedUserIdTo: body.assignedUserId,
          assignedGroupIdFrom: turf.assignedGroupId,
          assignedGroupIdTo: body.assignedGroupId,
          name: updated.name,
        },
      },
    });
  }

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const turf = await prisma.turf.findUnique({ where: { id: params.id } });
  if (!turf) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: turf.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  await prisma.turf.delete({ where: { id: params.id } });
  return NextResponse.json({ success: true });
}
