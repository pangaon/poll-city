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
          assignments: {
            select: {
              id: true, status: true, checkedInAt: true,
              user: { select: { id: true, name: true, email: true } },
            },
            orderBy: { createdAt: "asc" },
          },
        },
      },
      _count: { select: { targets: true, shifts: true, attempts: true } },
    },
  });

  if (!route) {
    return NextResponse.json({ error: "Route not found" }, { status: 404 });
  }

  const CONTACT_OUTCOMES = new Set([
    "contacted", "supporter", "undecided", "volunteer_interest",
    "donor_interest", "sign_requested", "follow_up",
  ]);

  // Compute target completion breakdown + outcome analytics + GPS trail in parallel
  const [targetStatRows, outcomeRows, gpsAttempts] = await Promise.all([
    prisma.fieldTarget.groupBy({
      by: ["status"],
      where: { routeId, deletedAt: null },
      _count: { _all: true },
    }),
    prisma.fieldAttempt.groupBy({
      by: ["outcome"],
      where: { routeId, campaignId },
      _count: { _all: true },
      orderBy: { _count: { outcome: "desc" } },
    }),
    prisma.fieldAttempt.findMany({
      where: { routeId, campaignId, latitude: { not: null }, longitude: { not: null } },
      select: {
        latitude: true, longitude: true, attemptedAt: true,
        attemptedBy: { select: { id: true, name: true } },
      },
      orderBy: { attemptedAt: "asc" },
      take: 500,
    }),
  ]);

  const stats: Record<string, number> = {};
  for (const s of targetStatRows) stats[s.status] = s._count._all;
  const total = Object.values(stats).reduce((a, b) => a + b, 0);
  const done = (stats["contacted"] ?? 0) + (stats["refused"] ?? 0) +
    (stats["moved"] ?? 0) + (stats["inaccessible"] ?? 0) + (stats["complete"] ?? 0);

  const outcomeBreakdown = outcomeRows.map((r) => ({
    outcome: r.outcome,
    count: r._count._all,
    isContact: CONTACT_OUTCOMES.has(r.outcome),
  }));

  const gpsTrail = gpsAttempts
    .filter((a): a is typeof a & { latitude: number; longitude: number } =>
      a.latitude != null && a.longitude != null)
    .map((a) => ({
      lat: a.latitude,
      lng: a.longitude,
      attemptedAt: a.attemptedAt.toISOString(),
      canvasserId: a.attemptedBy.id,
      canvasserName: a.attemptedBy.name ?? "Unknown",
    }));

  return NextResponse.json({
    data: {
      ...route,
      shifts: route.shifts.map((s) => ({
        ...s,
        scheduledDate: s.scheduledDate.toISOString(),
      })),
      targetStats: stats,
      completionPct: total > 0 ? Math.round((done / total) * 100) : 0,
      outcomeBreakdown,
      gpsTrail,
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
