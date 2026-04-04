import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null) as { checkInCode?: string; signupId?: string } | null;
  if (!body?.checkInCode || !body.signupId) {
    return NextResponse.json({ error: "checkInCode and signupId are required" }, { status: 400 });
  }

  const shift = await prisma.volunteerShift.findUnique({
    where: { id: params.id },
    select: { id: true, checkInCode: true },
  });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  if (shift.checkInCode !== body.checkInCode.trim().toUpperCase()) {
    return NextResponse.json({ error: "Invalid check-in code" }, { status: 403 });
  }

  // Verify signupId belongs to this shift
  const signup = await prisma.volunteerShiftSignup.findUnique({
    where: { id: body.signupId },
    select: { id: true, shiftId: true },
  });
  if (!signup || signup.shiftId !== params.id) {
    return NextResponse.json({ error: "Signup not found for this shift" }, { status: 404 });
  }

  try {
    const updated = await prisma.volunteerShiftSignup.update({
      where: { id: body.signupId },
      data: { status: "attended", checkedInAt: new Date() },
    });
    return NextResponse.json({ data: updated });
  } catch {
    return NextResponse.json({ error: "Check-in failed" }, { status: 500 });
  }
}
