import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { Role } from "@prisma/client";

const ALLOWED_STATUSES = ["scheduled", "live", "ended"] as const;
type TownhallStatus = (typeof ALLOWED_STATUSES)[number];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { eventId: string } },
) {
  const { session, error } = await apiAuth(req, [
    Role.ADMIN,
    Role.SUPER_ADMIN,
    Role.CAMPAIGN_MANAGER,
  ]);
  if (error) return error;

  const event = await prisma.event.findUnique({
    where: { id: params.eventId },
    select: { campaignId: true, isTownhall: true },
  });

  if (!event || !event.isTownhall) {
    return NextResponse.json({ error: "Event not found or not a townhall" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: {
      userId_campaignId: {
        userId: session!.user.id,
        campaignId: event.campaignId,
      },
    },
  });
  if (!membership) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as {
    status?: string;
    townhallRoomUrl?: string;
  } | null;

  if (!body) return NextResponse.json({ error: "Invalid request body" }, { status: 400 });

  if (!body.status || !ALLOWED_STATUSES.includes(body.status as TownhallStatus)) {
    return NextResponse.json(
      { error: `status must be one of: ${ALLOWED_STATUSES.join(", ")}` },
      { status: 400 },
    );
  }

  const updated = await prisma.event.update({
    where: { id: params.eventId },
    data: {
      townhallStatus: body.status,
      ...(body.townhallRoomUrl !== undefined
        ? { townhallRoomUrl: body.townhallRoomUrl?.trim() || null }
        : {}),
    },
    select: {
      id: true,
      townhallStatus: true,
      townhallRoomUrl: true,
    },
  });

  return NextResponse.json({ data: updated });
}
