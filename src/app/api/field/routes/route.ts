import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { RouteStatus } from "@prisma/client";

// ── GET /api/field/routes?campaignId=X&programId=Y&status=Z ─────────────────

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
  const statusFilter = req.nextUrl.searchParams.get("status");
  const turfId = req.nextUrl.searchParams.get("turfId");

  const routes = await prisma.route.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(programId ? { fieldProgramId: programId } : {}),
      ...(statusFilter ? { status: statusFilter as RouteStatus } : {}),
      ...(turfId ? { turfId } : {}),
    },
    include: {
      _count: { select: { targets: true, shifts: true, attempts: true } },
      fieldProgram: { select: { id: true, name: true, programType: true } },
      turf: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
    orderBy: [{ status: "asc" }, { name: "asc" }],
  });

  // Augment each route with completion stats
  const routeIds = routes.map((r) => r.id);
  const targetStats = await prisma.fieldTarget.groupBy({
    by: ["routeId", "status"],
    where: { routeId: { in: routeIds }, deletedAt: null },
    _count: { _all: true },
  });

  const statsByRoute = new Map<string, Record<string, number>>();
  for (const stat of targetStats) {
    if (!stat.routeId) continue;
    if (!statsByRoute.has(stat.routeId)) statsByRoute.set(stat.routeId, {});
    statsByRoute.get(stat.routeId)![stat.status] = stat._count._all;
  }

  const data = routes.map((r) => {
    const stats = statsByRoute.get(r.id) ?? {};
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const done = (stats["contacted"] ?? 0) + (stats["refused"] ?? 0) +
      (stats["moved"] ?? 0) + (stats["inaccessible"] ?? 0) + (stats["complete"] ?? 0);
    return { ...r, targetStats: stats, completionPct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  return NextResponse.json({ data });
}

// ── POST /api/field/routes ────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    fieldProgramId?: string;
    turfId?: string;
    ward?: string;
    pollNumber?: string;
    streets?: string[];
    oddEven?: string;
    estimatedMinutes?: number;
    routeDistance?: number;
    notes?: string;
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

  // Verify fieldProgram belongs to campaign if provided
  if (body.fieldProgramId) {
    const fp = await prisma.fieldProgram.findFirst({
      where: { id: body.fieldProgramId, campaignId: body.campaignId, deletedAt: null },
    });
    if (!fp) {
      return NextResponse.json({ error: "Field program not found" }, { status: 404 });
    }
  }

  // Verify turf belongs to campaign if provided
  if (body.turfId) {
    const turf = await prisma.turf.findFirst({
      where: { id: body.turfId, campaignId: body.campaignId },
    });
    if (!turf) {
      return NextResponse.json({ error: "Turf not found" }, { status: 404 });
    }
  }

  const validOddEven = ["all", "odd", "even"];

  const route = await prisma.route.create({
    data: {
      campaignId: body.campaignId,
      name: body.name.trim(),
      fieldProgramId: body.fieldProgramId ?? null,
      turfId: body.turfId ?? null,
      ward: body.ward?.trim() ?? null,
      pollNumber: body.pollNumber?.trim() ?? null,
      streets: body.streets ?? [],
      oddEven: validOddEven.includes(body.oddEven ?? "") ? body.oddEven! : "all",
      estimatedMinutes: body.estimatedMinutes ?? null,
      routeDistance: body.routeDistance ?? null,
      notes: body.notes?.trim() ?? null,
      createdById: session!.user.id,
    },
    include: {
      _count: { select: { targets: true, shifts: true } },
      fieldProgram: { select: { id: true, name: true, programType: true } },
      turf: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
    },
  });

  return NextResponse.json({ data: route }, { status: 201 });
}
