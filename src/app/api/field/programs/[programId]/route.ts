import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldProgramStatus, FieldProgramType } from "@prisma/client";

type Params = { params: Promise<{ programId: string }> };

// ── GET /api/field/programs/[programId] ─────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { programId } = await params;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const program = await prisma.fieldProgram.findFirst({
    where: { id: programId, campaignId, deletedAt: null },
    include: {
      routes: {
        where: { deletedAt: null },
        select: {
          id: true, name: true, status: true, totalStops: true,
          estimatedMinutes: true, pollNumber: true, ward: true,
          _count: { select: { targets: true, shifts: true } },
        },
        orderBy: { createdAt: "asc" },
      },
      _count: {
        select: { routes: true, targets: true, shifts: true, attempts: true },
      },
      createdBy: { select: { id: true, name: true } },
    },
  });

  if (!program) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  return NextResponse.json({ data: program });
}

// ── PATCH /api/field/programs/[programId] ────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { programId } = await params;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    programType?: FieldProgramType;
    status?: FieldProgramStatus;
    description?: string;
    startDate?: string | null;
    endDate?: string | null;
    goalDoors?: number | null;
    goalContacts?: number | null;
    goalSupporters?: number | null;
    targetPolls?: string[];
    targetWard?: string | null;
    isActive?: boolean;
  } | null;

  if (!body?.campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    body.campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const existing = await prisma.fieldProgram.findFirst({
    where: { id: programId, campaignId: body.campaignId, deletedAt: null },
  });

  if (!existing) {
    return NextResponse.json({ error: "Program not found" }, { status: 404 });
  }

  const validStatuses: FieldProgramStatus[] = ["planning", "active", "paused", "completed", "archived"];
  const validTypes: FieldProgramType[] = [
    "canvass", "lit_drop", "phone_bank", "sign_install",
    "sign_remove", "gotv", "event_outreach", "advance_vote", "hybrid",
  ];

  const updated = await prisma.fieldProgram.update({
    where: { id: programId },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.programType && validTypes.includes(body.programType) ? { programType: body.programType } : {}),
      ...(body.status && validStatuses.includes(body.status) ? { status: body.status } : {}),
      ...(body.description !== undefined ? { description: body.description?.trim() ?? null } : {}),
      ...(body.startDate !== undefined ? { startDate: body.startDate ? new Date(body.startDate) : null } : {}),
      ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
      ...(body.goalDoors !== undefined ? { goalDoors: body.goalDoors } : {}),
      ...(body.goalContacts !== undefined ? { goalContacts: body.goalContacts } : {}),
      ...(body.goalSupporters !== undefined ? { goalSupporters: body.goalSupporters } : {}),
      ...(body.targetPolls !== undefined ? { targetPolls: body.targetPolls } : {}),
      ...(body.targetWard !== undefined ? { targetWard: body.targetWard?.trim() ?? null } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
    },
    include: {
      _count: { select: { routes: true, targets: true, shifts: true, attempts: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: updated });
}
