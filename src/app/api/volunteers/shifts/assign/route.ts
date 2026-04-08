import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { VolunteerShiftSignupStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = await req.json().catch(() => null) as {
    shiftId?: string;
    volunteerIds?: string[];
    campaignId?: string;
  } | null;

  if (!body?.shiftId || !Array.isArray(body.volunteerIds) || !body.campaignId) {
    return NextResponse.json({ error: "shiftId, volunteerIds, and campaignId are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "volunteers:write");
  if (forbidden) return forbidden;

  // Verify shift belongs to this campaign
  const shift = await prisma.volunteerShift.findFirst({
    where: { id: body.shiftId, campaignId: body.campaignId },
  });
  if (!shift) return NextResponse.json({ error: "Shift not found" }, { status: 404 });

  // Create signups for each volunteer, skip existing ones
  const existing = await prisma.volunteerShiftSignup.findMany({
    where: { shiftId: body.shiftId, volunteerProfileId: { in: body.volunteerIds } },
    select: { volunteerProfileId: true },
  });
  const existingIds = new Set(existing.map((e) => e.volunteerProfileId));
  const newIds = body.volunteerIds.filter((id) => !existingIds.has(id));

  if (newIds.length > 0) {
    await prisma.volunteerShiftSignup.createMany({
      data: newIds.map((volunteerProfileId) => ({
        shiftId: body.shiftId!,
        volunteerProfileId,
        status: VolunteerShiftSignupStatus.signed_up,
      })),
    });
  }

  return NextResponse.json({
    assigned: newIds.length,
    alreadyAssigned: existingIds.size,
  });
}
