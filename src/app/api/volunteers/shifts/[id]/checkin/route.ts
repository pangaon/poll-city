import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

function parseTimeToMinutes(value: string): number | null {
  const text = value.trim();
  const m24 = text.match(/^(\d{1,2}):(\d{2})$/);
  if (m24) {
    const h = Number(m24[1]);
    const m = Number(m24[2]);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) return h * 60 + m;
    return null;
  }

  const m12 = text.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (m12) {
    let h = Number(m12[1]);
    const m = Number(m12[2]);
    const meridiem = m12[3].toUpperCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    if (h === 12) h = 0;
    if (meridiem === "PM") h += 12;
    return h * 60 + m;
  }

  return null;
}

function shiftDurationHours(startTime: string, endTime: string): number {
  const start = parseTimeToMinutes(startTime);
  const end = parseTimeToMinutes(endTime);
  if (start === null || end === null) return 0;
  const raw = end >= start ? end - start : 24 * 60 - start + end;
  return Math.round((raw / 60) * 100) / 100;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as { checkInCode?: string; signupId?: string } | null;
  if (!body?.checkInCode || !body.signupId) {
    return NextResponse.json({ error: "checkInCode and signupId are required" }, { status: 400 });
  }

  const shift = await prisma.volunteerShift.findUnique({
    where: { id: params.id },
    select: { id: true, campaignId: true, checkInCode: true, startTime: true, endTime: true, shiftDate: true },
  });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  if (shift.checkInCode !== body.checkInCode.trim().toUpperCase()) {
    return NextResponse.json({ error: "Invalid check-in code" }, { status: 403 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, shift.campaignId, "volunteers:write");
  if (forbidden) return forbidden;

  // Verify signupId belongs to this shift
  const signup = await prisma.volunteerShiftSignup.findUnique({
    where: { id: body.signupId },
    select: { id: true, shiftId: true, status: true, volunteerProfileId: true },
  });
  if (!signup || signup.shiftId !== params.id) {
    return NextResponse.json({ error: "Signup not found for this shift" }, { status: 404 });
  }

  if (signup.status === "attended") {
    return NextResponse.json({ error: "Volunteer already checked in" }, { status: 409 });
  }

  const hours = shiftDurationHours(shift.startTime, shift.endTime);

  try {
    const checkedInAt = new Date();
    const [updated] = await prisma.$transaction([
      prisma.volunteerShiftSignup.update({
        where: { id: body.signupId },
        data: { status: "attended", checkedInAt },
      }),
      prisma.volunteerProfile.update({
        where: { id: signup.volunteerProfileId },
        data: { totalHours: { increment: hours } },
      }),
      prisma.activityLog.create({
        data: {
          campaignId: shift.campaignId,
          userId: session!.user.id,
          action: "volunteer_shift_checkin",
          entityType: "volunteer_shift_signup",
          entityId: signup.id,
          details: {
            shiftId: shift.id,
            volunteerProfileId: signup.volunteerProfileId,
            startTime: shift.startTime,
            endTime: shift.endTime,
            shiftDate: shift.shiftDate,
            creditedHours: hours,
            checkedInAt,
          },
        },
      }),
    ]);

    return NextResponse.json({
      data: updated,
      meta: {
        creditedHours: hours,
      },
    });
  } catch {
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
