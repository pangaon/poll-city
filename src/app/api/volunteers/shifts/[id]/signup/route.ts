import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "volunteers:read");
  if (permError) return permError;

  const body = await req.json().catch(() => null) as { campaignId?: string } | null;
  if (!body?.campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const shift = await prisma.volunteerShift.findUnique({ where: { id: params.id } });
  if (!shift || shift.campaignId !== body.campaignId) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let profile = await prisma.volunteerProfile.findFirst({
    where: { campaignId: body.campaignId, userId: session!.user.id },
    select: { id: true },
  });

  if (!profile) {
    profile = await prisma.volunteerProfile.create({
      data: { campaignId: body.campaignId, userId: session!.user.id, isActive: true },
      select: { id: true },
    });
  }

  const existingCount = await prisma.volunteerShiftSignup.count({
    where: { shiftId: shift.id, status: { in: ["signed_up", "attended"] } },
  });
  if (existingCount >= shift.maxVolunteers) {
    return NextResponse.json({ error: "Shift is full" }, { status: 409 });
  }

  const signup = await prisma.volunteerShiftSignup.upsert({
    where: { shiftId_volunteerProfileId: { shiftId: shift.id, volunteerProfileId: profile.id } },
    update: { status: "signed_up", updatedAt: new Date() },
    create: { shiftId: shift.id, volunteerProfileId: profile.id, status: "signed_up" },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: body.campaignId,
      userId: session!.user.id,
      action: "created",
      entityType: "volunteer_shift_signup",
      entityId: signup.id,
      details: { shiftId: shift.id },
    },
  });

  return NextResponse.json({ data: signup });
}
