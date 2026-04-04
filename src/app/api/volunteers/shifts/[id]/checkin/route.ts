import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json().catch(() => null) as { checkInCode?: string; signupId?: string } | null;
  if (!body?.checkInCode || !body.signupId) {
    return NextResponse.json({ error: "checkInCode and signupId are required" }, { status: 400 });
  }

  const shift = await prisma.volunteerShift.findUnique({ where: { id: params.id }, select: { id: true, checkInCode: true } });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  if (shift.checkInCode !== body.checkInCode.trim().toUpperCase()) {
    return NextResponse.json({ error: "Invalid check-in code" }, { status: 401 });
  }

  const updated = await prisma.volunteerShiftSignup.update({
    where: { id: body.signupId },
    data: { status: "attended", checkedInAt: new Date() },
  });

  return NextResponse.json({ data: updated });
}
