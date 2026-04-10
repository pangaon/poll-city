import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { FieldProgramType, FieldProgramStatus } from "@prisma/client";

// ── GET /api/field/programs?campaignId=X ────────────────────────────────────

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const statusFilter = req.nextUrl.searchParams.get("status");

  const programs = await prisma.fieldProgram.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(statusFilter ? { status: statusFilter as FieldProgramStatus } : {}),
    },
    include: {
      _count: {
        select: {
          routes: true,
          targets: true,
          shifts: true,
          attempts: true,
        },
      },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
  });

  return NextResponse.json({ data: programs });
}

// ── POST /api/field/programs ─────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    programType?: FieldProgramType;
    description?: string;
    startDate?: string;
    endDate?: string;
    goalDoors?: number;
    goalContacts?: number;
    goalSupporters?: number;
    targetPolls?: string[];
    targetWard?: string;
  } | null;

  if (!body?.campaignId || !body?.name?.trim()) {
    return NextResponse.json({ error: "campaignId and name are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(
    session!.user.id,
    body.campaignId,
    "canvassing:write",
  );
  if (forbidden) return forbidden;

  const validTypes: FieldProgramType[] = [
    "canvass", "lit_drop", "phone_bank", "sign_install",
    "sign_remove", "gotv", "event_outreach", "advance_vote", "hybrid",
  ];

  const program = await prisma.fieldProgram.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      programType: validTypes.includes(body.programType!) ? body.programType! : "canvass",
      description: body.description?.trim() ?? null,
      startDate: body.startDate ? new Date(body.startDate) : null,
      endDate: body.endDate ? new Date(body.endDate) : null,
      goalDoors: body.goalDoors ?? null,
      goalContacts: body.goalContacts ?? null,
      goalSupporters: body.goalSupporters ?? null,
      targetPolls: body.targetPolls ?? [],
      targetWard: body.targetWard?.trim() ?? null,
      createdById: session!.user.id,
    },
    include: {
      _count: { select: { routes: true, targets: true, shifts: true, attempts: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: program }, { status: 201 });
}
