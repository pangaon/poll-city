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
    name?: string;
    notes?: string;
  };
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const updated = await prisma.turf.update({
    where: { id: params.id },
    data: {
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.assignedUserId !== undefined ? { assignedUserId: body.assignedUserId } : {}),
      ...(body.name !== undefined ? { name: body.name } : {}),
      ...(body.notes !== undefined ? { notes: body.notes } : {}),
    },
    include: { assignedUser: { select: { id: true, name: true, email: true } } },
  });

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
