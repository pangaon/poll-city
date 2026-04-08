import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

function randomCode() {
  return Math.random().toString(36).slice(2, 10).toUpperCase();
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
    const campaignId = req.nextUrl.searchParams.get("campaignId");
  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "volunteers:read");
  if (forbidden) return forbidden;

  const shifts = await prisma.volunteerShift.findMany({
    where: { campaignId: campaignId! },
    include: {
      signups: {
        include: {
          volunteerProfile: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              contact: { select: { id: true, firstName: true, lastName: true, phone: true, email: true } },
            },
          },
        },
      },
    },
    orderBy: { shiftDate: "asc" },
  });

  return NextResponse.json({ data: shifts });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string;
    name?: string;
    shiftDate?: string;
    startTime?: string;
    endTime?: string;
    meetingLocation?: string;
    targetTurfArea?: string;
    maxVolunteers?: number;
    minVolunteers?: number;
    notes?: string;
  } | null;

  if (!body?.campaignId || !body.name?.trim() || !body.shiftDate || !body.startTime || !body.endTime || !body.meetingLocation?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership || !["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "VOLUNTEER_LEADER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const created = await prisma.volunteerShift.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      shiftDate: new Date(body.shiftDate),
      startTime: body.startTime,
      endTime: body.endTime,
      meetingLocation: body.meetingLocation.trim(),
      targetTurfArea: body.targetTurfArea?.trim() || null,
      maxVolunteers: Number(body.maxVolunteers ?? 10),
      minVolunteers: Number(body.minVolunteers ?? 1),
      notes: body.notes?.trim() || null,
      checkInCode: randomCode(),
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: body.campaignId,
      userId: session!.user.id,
      action: "created",
      entityType: "volunteer_shift",
      entityId: created.id,
      details: { name: created.name, shiftDate: body.shiftDate },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
