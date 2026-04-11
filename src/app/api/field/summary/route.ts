import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

export const dynamic = "force-dynamic";

// ── GET /api/field/summary?campaignId=X ─────────────────────────────────────
// Returns pipeline-level counts for the Field Ops dashboard.

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const [
    programCounts,
    routeCounts,
    turfCounts,
    shiftCounts,
    todayShifts,
    followUpCount,
    teamCount,
    litDropCount,
    attemptCount,
  ] = await Promise.all([
    // Programs
    prisma.fieldProgram.groupBy({
      by: ["status"],
      where: { campaignId, deletedAt: null },
      _count: { _all: true },
    }),
    // Routes with avg completion
    prisma.route.aggregate({
      where: { campaignId, deletedAt: null },
      _count: { id: true },
      _avg: { completionPct: true } as never, // completionPct is a virtual field — count only
    }),
    // Turf counts
    prisma.turf.groupBy({
      by: ["status"],
      where: { campaignId },
      _count: { _all: true },
    }),
    // All shift counts by status
    prisma.fieldShift.groupBy({
      by: ["status"],
      where: { campaignId, deletedAt: null },
      _count: { _all: true },
    }),
    // Today's shifts
    prisma.fieldShift.count({
      where: {
        campaignId,
        deletedAt: null,
        scheduledDate: { gte: today },
      },
    }),
    // Pending follow-ups
    prisma.followUpAction.count({
      where: { campaignId, status: { notIn: ["completed", "dismissed"] } },
    }),
    // Active teams
    prisma.fieldTeam.count({ where: { campaignId, isActive: true } }),
    // Lit drop shifts
    prisma.fieldShift.count({
      where: { campaignId, deletedAt: null, shiftType: "literature" },
    }),
    // Total canvassing attempts
    prisma.fieldAttempt.count({ where: { campaignId } }),
  ]);

  // Compute route count from Prisma aggregate
  const totalRoutes = await prisma.route.count({ where: { campaignId, deletedAt: null } });
  const routeCompletionData = await prisma.route.findMany({
    where: { campaignId, deletedAt: null },
    select: { id: true },
  });

  // Program totals
  const totalPrograms = programCounts.reduce((a, b) => a + b._count._all, 0);
  const activePrograms = programCounts.find((p) => p.status === "active")?._count._all ?? 0;

  // Turf totals
  const totalTurfs = turfCounts.reduce((a, b) => a + b._count._all, 0);
  const completedTurfs = turfCounts.find((t) => t.status === "completed")?._count._all ?? 0;
  const activeTurfs = turfCounts.find((t) => t.status === "in_progress")?._count._all ?? 0;

  // Shift totals
  const totalShifts = shiftCounts.reduce((a, b) => a + b._count._all, 0);
  const activeShiftCount = shiftCounts.find((s) => s.status === "in_progress")?._count._all ?? 0;
  const completedShifts = shiftCounts.find((s) => s.status === "completed")?._count._all ?? 0;

  return NextResponse.json({
    programs: { total: totalPrograms, active: activePrograms },
    routes: { total: totalRoutes },
    turfs: { total: totalTurfs, active: activeTurfs, completed: completedTurfs },
    shifts: { total: totalShifts, active: activeShiftCount, completed: completedShifts, today: todayShifts },
    followUps: { pending: followUpCount },
    teams: { active: teamCount },
    litDrops: { total: litDropCount },
    attempts: { total: attemptCount },
  });
}
