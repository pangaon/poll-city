import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── GET /api/field/lit-drops?campaignId=X ──────────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const programId = req.nextUrl.searchParams.get("programId");

  // Lit drop runs = FieldShifts with shiftType "literature"
  const [shifts, programs] = await Promise.all([
    prisma.fieldShift.findMany({
      where: {
        campaignId,
        deletedAt: null,
        shiftType: "literature",
        ...(programId ? { fieldProgramId: programId } : {}),
      },
      include: {
        _count: { select: { assignments: true, attempts: true } },
        leadUser: { select: { id: true, name: true } },
        fieldProgram: { select: { id: true, name: true } },
        turf: { select: { id: true, name: true } },
        route: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),
    prisma.fieldProgram.findMany({
      where: { campaignId, deletedAt: null, isActive: true, programType: "lit_drop" },
      select: { id: true, name: true, programType: true, status: true, goalDoors: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({ data: { shifts, programs } });
}

// ── POST /api/field/lit-drops ────────────────────────────────────────────────
// Creates a literature FieldShift (and optionally a lit_drop FieldProgram)

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    scheduledDate?: string;
    startTime?: string;
    endTime?: string;
    fieldProgramId?: string;
    createProgram?: boolean;
    programName?: string;
    turfId?: string;
    routeId?: string;
    timezone?: string;
    meetingPoint?: string;
    meetingAddress?: string;
    maxCapacity?: number;
    ward?: string;
    pollNumber?: string;
    leadUserId?: string;
    notes?: string;
    materialsDescription?: string;
  } | null;

  if (!body?.campaignId || !body?.name?.trim()) {
    return NextResponse.json({ error: "campaignId and name are required" }, { status: 400 });
  }
  if (!body.scheduledDate || !body.startTime || !body.endTime) {
    return NextResponse.json({ error: "scheduledDate, startTime, and endTime are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  let fieldProgramId = body.fieldProgramId ?? null;

  // Optionally create a new lit_drop FieldProgram in the same transaction
  if (body.createProgram && body.programName?.trim()) {
    const program = await prisma.fieldProgram.create({
      data: {
        campaignId: body.campaignId,
        name: body.programName.trim(),
        programType: "lit_drop",
        status: "planning",
        isActive: true,
        createdById: session!.user.id,
      },
    });
    fieldProgramId = program.id;
  }

  const shift = await prisma.fieldShift.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      shiftType: "literature",
      fieldProgramId,
      turfId: body.turfId ?? null,
      routeId: body.routeId ?? null,
      scheduledDate: new Date(body.scheduledDate),
      startTime: body.startTime,
      endTime: body.endTime,
      timezone: body.timezone ?? "America/Toronto",
      meetingPoint: body.meetingPoint?.trim() ?? null,
      meetingAddress: body.meetingAddress?.trim() ?? null,
      maxCapacity: body.maxCapacity ?? null,
      ward: body.ward?.trim() ?? null,
      pollNumber: body.pollNumber?.trim() ?? null,
      leadUserId: body.leadUserId ?? null,
      notes: body.notes?.trim() ?? null,
      materialsJson: body.materialsDescription
        ? { description: body.materialsDescription }
        : undefined,
      status: "draft",
    },
    include: {
      _count: { select: { assignments: true, attempts: true } },
      leadUser: { select: { id: true, name: true } },
      fieldProgram: { select: { id: true, name: true } },
      turf: { select: { id: true, name: true } },
      route: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: shift }, { status: 201 });
}
