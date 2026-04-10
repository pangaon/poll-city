import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { RouteStatus } from "@prisma/client";

type Params = { params: Promise<{ routeId: string }> };

// ── GET /api/field/routes/[routeId] ──────────────────────────────────────────

export async function GET(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { routeId } = await params;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const route = await prisma.route.findFirst({
    where: { id: routeId, campaignId, deletedAt: null },
    include: {
      fieldProgram: { select: { id: true, name: true, programType: true, status: true } },
      turf: { select: { id: true, name: true, ward: true } },
      createdBy: { select: { id: true, name: true } },
      shifts: {
        where: { deletedAt: null },
        select: {
          id: true, name: true, shiftType: true, status: true,
          scheduledDate: true, startTime: true, endTime: true,
          _count: { select: { assignments: true } },
        },
      },
      _count: { select: { targets: true, shifts: true, attempts: true } },
    },
  });

  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  // Compute target completion breakdown
  const targetStats = await prisma.fieldTarget.groupBy({
    by: ["status"],
    where: { routeId, deletedAt: null },
    _count: { _all: true },
  });

  const stats: Record<string, number> = {};
  for (const s of targetStats) stats[s.status] = s._count._all;
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const done = (stats["contacted"] ?? 0) + (stats["refused"] ?? 0) +
    (stats["moved"] ?? 0) + (stats["inaccessible"] ?? 0) + (stats["complete"] ?? 0);

  return NextResponse.json({
    data: {
      ...route,
      targetStats: stats,
      completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
    },
  });
}

// ── PATCH /api/field/routes/[routeId] ────────────────────────────────────────

export async function PATCH(req: NextRequest, { params }: Params) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { routeId } = await params;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    name?: string;
    status?: RouteStatus;
    fieldProgramId?: string | null;
    turfId?: string | null;
    ward?: string | null;
    pollNumber?: string | null;
    streets?: string[];
    oddEven?: string;
    estimatedMinutes?: number | null;
    routeDistance?: number | null;
    isLocked?: boolean;
    notes?: string | null;
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

  const existing = await prisma.route.findFirst({
    where: { id: routeId, campaignId: body.campaignId, deletedAt: null },
  });

  if (!existing) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  // Locked routes: only CAMPAIGN_MANAGER level (enforced via permission) can change sort order
  if (existing.isLocked && body.status !== "archived") {
    const allowedLockedFields = ["notes", "status", "isLocked"];
    const requestedFields = Object.keys(body).filter((k) => k !== "campaignId");
    const hasDisallowed = requestedFields.some((k) => !allowedLockedFields.includes(k));
    if (hasDisallowed) {
      return NextResponse.json(
        { error: "Route is locked — only notes, status, and isLocked may be changed" },
        { status: 409 },
      );
    }
  }

  const validStatuses: RouteStatus[] = [
    "draft", "published", "assigned", "in_progress", "completed", "locked", "archived",
  ];
  const validOddEven = ["all", "odd", "even"];

  const updated = await prisma.route.update({
    where: { id: routeId },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.status && validStatuses.includes(body.status) ? { status: body.status } : {}),
      ...(body.fieldProgramId !== undefined ? { fieldProgramId: body.fieldProgramId } : {}),
      ...(body.turfId !== undefined ? { turfId: body.turfId } : {}),
      ...(body.ward !== undefined ? { ward: body.ward?.trim() ?? null } : {}),
      ...(body.pollNumber !== undefined ? { pollNumber: body.pollNumber?.trim() ?? null } : {}),
      ...(body.streets !== undefined ? { streets: body.streets } : {}),
      ...(body.oddEven && validOddEven.includes(body.oddEven) ? { oddEven: body.oddEven } : {}),
      ...(body.estimatedMinutes !== undefined ? { estimatedMinutes: body.estimatedMinutes } : {}),
      ...(body.routeDistance !== undefined ? { routeDistance: body.routeDistance } : {}),
      ...(body.isLocked !== undefined ? { isLocked: body.isLocked } : {}),
      ...(body.notes !== undefined ? { notes: body.notes?.trim() ?? null } : {}),
    },
    include: {
      fieldProgram: { select: { id: true, name: true, programType: true } },
      turf: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      _count: { select: { targets: true, shifts: true } },
    },
  });

  // If locking: write audit log
  if (body.isLocked === true && !existing.isLocked) {
    await prisma.fieldAuditLog.create({
      data: {
        campaignId: body.campaignId,
        actorUserId: session!.user.id,
        action: "override",
        entityType: "route",
        entityId: routeId,
        newValueJson: { isLocked: true, lockedBy: session!.user.id },
      },
    });
  }

  return NextResponse.json({ data: updated });
}
