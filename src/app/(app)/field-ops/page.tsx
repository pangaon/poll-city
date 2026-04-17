import { Suspense } from "react";
import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import FieldOpsClient from "./field-ops-client";
import type { ShiftRow } from "@/app/(app)/field/runs/runs-client";
import type { LitDropRow, LitProgramRow } from "@/app/(app)/field/lit-drops/lit-drops-client";
import type { TeamRow } from "@/app/(app)/field/teams/teams-client";
import type { InventoryRow, ShiftWithMaterials } from "@/app/(app)/field/materials/materials-client";
import type { FollowUpRow } from "@/app/(app)/field/follow-ups/follow-ups-client";
import type { AuditRow } from "@/app/(app)/field/audit/audit-client";
import type { ActiveShiftRow } from "@/app/(app)/field/mobile/mobile-client";
import type { Program } from "@/app/(app)/field/programs/programs-client";

export const metadata = { title: "Field Operations — Poll City" };

export default async function FieldOpsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  // ── Wave 1: parallel fetch of all module data ─────────────────────────────

  const [
    programs,
    rawTurfs,
    memberships,
    rawWardData,
    teams,
    inventory,
    followUps,
    auditLogs,
    canvassShifts,
    litDropShifts,
    mobileShifts,
    materialShifts,
    rawRoutes,
    litDropPrograms,
    programTurfs,
  ] = await Promise.all([
    // Full programs with counts
    prisma.fieldProgram.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        _count: { select: { routes: true, targets: true, shifts: true, attempts: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),

    // Turfs with full assignment info + stop counts
    prisma.turf.findMany({
      where: { campaignId },
      include: {
        assignedUser: { select: { id: true, name: true, email: true } },
        assignedVolunteer: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
        assignedGroup: { select: { id: true, name: true } },
        _count: { select: { stops: true, routes: true, fieldShifts: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),

    // Team members for turf assignment
    prisma.membership.findMany({
      where: { campaignId },
      include: { user: { select: { id: true, name: true, email: true } } },
      orderBy: { user: { name: "asc" } },
    }),

    // Contact density by poll/ward (for turf + routes)
    prisma.contact.groupBy({
      by: ["municipalPoll", "ward"],
      where: { campaignId, deletedAt: null, municipalPoll: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" } },
    }),

    // Teams with members
    prisma.fieldTeam.findMany({
      where: { campaignId, isActive: true },
      include: {
        _count: { select: { members: true } },
        leadUser: { select: { id: true, name: true } },
        members: {
          where: { leftAt: null },
          include: { user: { select: { id: true, name: true } } },
          orderBy: { joinedAt: "asc" },
        },
      },
      orderBy: { name: "asc" },
    }),

    // Print inventory for materials tab
    prisma.printInventory.findMany({
      where: { campaignId },
      orderBy: [{ productType: "asc" }, { sku: "asc" }],
      select: {
        id: true, sku: true, productType: true, description: true,
        totalQty: true, availableQty: true, reservedQty: true, depletedQty: true,
        wastedQty: true, location: true, notes: true,
      },
    }),

    // Pending follow-ups
    prisma.followUpAction.findMany({
      where: { campaignId, status: { notIn: ["completed", "dismissed"] } },
      include: {
        contact: { select: { id: true, firstName: true, lastName: true, address1: true } },
        household: { select: { id: true, address1: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ priority: "asc" }, { dueDate: "asc" }, { createdAt: "asc" }],
      take: 500,
    }),

    // Audit log (last 200)
    prisma.fieldAuditLog.findMany({
      where: { campaignId },
      include: { actor: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),

    // Canvassing shifts
    prisma.fieldShift.findMany({
      where: { campaignId, deletedAt: null, shiftType: { not: "literature" } },
      include: {
        _count: { select: { assignments: true, attempts: true } },
        leadUser: { select: { id: true, name: true } },
        fieldProgram: { select: { id: true, name: true } },
        turf: { select: { id: true, name: true } },
        route: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),

    // Lit drop shifts
    prisma.fieldShift.findMany({
      where: { campaignId, deletedAt: null, shiftType: "literature" },
      include: {
        _count: { select: { assignments: true, attempts: true } },
        leadUser: { select: { id: true, name: true } },
        fieldProgram: { select: { id: true, name: true } },
        turf: { select: { id: true, name: true } },
        route: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),

    // Active shifts for mobile tab (today's open/in-progress)
    prisma.fieldShift.findMany({
      where: {
        campaignId,
        deletedAt: null,
        status: { in: ["open", "in_progress"] },
        scheduledDate: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
      },
      include: {
        turf: { select: { id: true, name: true } },
        route: { select: { id: true, name: true } },
        fieldProgram: { select: { id: true, name: true } },
        _count: { select: { attempts: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),

    // Active/draft shifts for materials allocation
    prisma.fieldShift.findMany({
      where: { campaignId, deletedAt: null, status: { in: ["draft", "open", "in_progress"] } },
      select: {
        id: true, name: true, shiftType: true, status: true,
        scheduledDate: true, startTime: true, materialsJson: true,
        ward: true, pollNumber: true,
      },
      orderBy: [{ scheduledDate: "asc" }],
    }),

    // Routes (raw — completion stats augmented in wave 2)
    prisma.route.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        _count: { select: { targets: true, shifts: true, attempts: true } },
        fieldProgram: { select: { id: true, name: true, programType: true } },
        turf: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),

    // Lit-drop programs
    prisma.fieldProgram.findMany({
      where: { campaignId, deletedAt: null, isActive: true, programType: "lit_drop" },
      select: { id: true, name: true, programType: true, status: true, goalDoors: true },
      orderBy: { name: "asc" },
    }),

    // Minimal turfs for Programs client (create drawer)
    prisma.turf.findMany({
      where: { campaignId },
      select: { id: true, name: true, ward: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // ── Wave 2: route completion stats ────────────────────────────────────────

  const routeIds = rawRoutes.map((r) => r.id);
  const targetStats = routeIds.length > 0
    ? await prisma.fieldTarget.groupBy({
        by: ["routeId", "status"],
        where: { routeId: { in: routeIds }, deletedAt: null },
        _count: { _all: true },
      })
    : [];

  const statsByRoute = new Map<string, Record<string, number>>();
  for (const stat of targetStats) {
    if (!stat.routeId) continue;
    if (!statsByRoute.has(stat.routeId)) statsByRoute.set(stat.routeId, {});
    statsByRoute.get(stat.routeId)![stat.status] = stat._count._all;
  }

  const routes = rawRoutes.map((r) => {
    const stats = statsByRoute.get(r.id) ?? {};
    const total = Object.values(stats).reduce((a, b) => a + b, 0);
    const done = (stats["contacted"] ?? 0) + (stats["refused"] ?? 0) +
      (stats["moved"] ?? 0) + (stats["inaccessible"] ?? 0) + (stats["complete"] ?? 0);
    return { ...r, completionPct: total > 0 ? Math.round((done / total) * 100) : 0 };
  });

  // ── Serialization ─────────────────────────────────────────────────────────

  const now = new Date().toISOString();

  const serializedPrograms: Program[] = programs.map((p) => ({
    ...p,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    deletedAt: p.deletedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
    contactedCount: 0,
    supporterCount: 0,
    completedRoutes: 0,
  }));

  const serializedShifts: ShiftRow[] = canvassShifts.map((s) => ({
    ...s,
    leadUserId: s.leadUserId ?? null,
    turfId: s.turfId ?? null,
    routeId: s.routeId ?? null,
    fieldProgramId: s.fieldProgramId ?? null,
    ward: s.ward ?? null,
    pollNumber: s.pollNumber ?? null,
    scheduledDate: s.scheduledDate.toISOString(),
    deletedAt: s.deletedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    materialsJson: (s.materialsJson ?? null) as Record<string, unknown> | null,
  }));

  const shiftPrograms = programs
    .filter((p) => p.isActive)
    .map((p) => ({ id: p.id, name: p.name, programType: p.programType }));

  const serializedLitDrops: LitDropRow[] = litDropShifts.map((s) => ({
    ...s,
    leadUserId: s.leadUserId ?? null,
    turfId: s.turfId ?? null,
    routeId: s.routeId ?? null,
    fieldProgramId: s.fieldProgramId ?? null,
    ward: s.ward ?? null,
    pollNumber: s.pollNumber ?? null,
    scheduledDate: s.scheduledDate.toISOString(),
    deletedAt: s.deletedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    materialsJson: (s.materialsJson ?? null) as Record<string, unknown> | null,
  }));

  const serializedTeams: TeamRow[] = teams.map((t) => ({
    ...t,
    createdAt: t.createdAt.toISOString(),
    updatedAt: t.updatedAt.toISOString(),
    members: t.members.map((m) => ({
      ...m,
      joinedAt: m.joinedAt.toISOString(),
      leftAt: m.leftAt?.toISOString() ?? null,
    })),
  }));

  const serializedFollowUps: FollowUpRow[] = followUps.map((f) => ({
    ...f,
    dueDate: f.dueDate?.toISOString() ?? null,
    completedAt: f.completedAt?.toISOString() ?? null,
    createdAt: f.createdAt.toISOString(),
    updatedAt: f.updatedAt.toISOString(),
    contact: f.contact ?? null,
    household: f.household ?? null,
    assignedTo: f.assignedTo ?? null,
    fieldAttempt: null,
  }));

  const serializedAudit: AuditRow[] = auditLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    oldValueJson: l.oldValueJson as Record<string, unknown> | null,
    newValueJson: l.newValueJson as Record<string, unknown> | null,
  }));

  const serializedMobileShifts: ActiveShiftRow[] = mobileShifts.map((s) => ({
    ...s,
    ward: s.ward ?? null,
    pollNumber: s.pollNumber ?? null,
    meetingPoint: s.meetingPoint ?? null,
    meetingAddress: s.meetingAddress ?? null,
    notes: s.notes ?? null,
    deletedAt: s.deletedAt?.toISOString() ?? null,
    scheduledDate: s.scheduledDate.toISOString(),
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  const serializedMaterialShifts: ShiftWithMaterials[] = materialShifts.map((s) => ({
    ...s,
    scheduledDate: s.scheduledDate.toISOString(),
    materialsJson: (s.materialsJson ?? null) as Record<string, unknown> | null,
  }));

  const turfDensity = rawWardData.map((d) => ({
    poll: d.municipalPoll!,
    ward: d.ward ?? null,
    contactCount: d._count.id,
  }));

  const routeDensity = rawWardData.map((d) => ({
    poll: d.municipalPoll!,
    contactCount: d._count.id,
  }));

  const teamMembers = memberships.map((m) => ({
    id: m.user.id,
    name: m.user.name,
    email: m.user.email,
  }));

  const activePrograms = programs
    .filter((p) => p.status === "planning" || p.status === "active")
    .map((p) => ({ id: p.id, name: p.name, programType: p.programType }));

  return (
    <Suspense>
      <FieldOpsClient
        campaignId={campaignId}
        campaignName={campaignName}
        // Programs tab
        initialPrograms={serializedPrograms}
        programTurfs={programTurfs}
        // Routes tab
        initialRoutes={routes}
        routePrograms={activePrograms}
        routeTurfs={programTurfs}
        routeDensity={routeDensity}
        // Turf tab
        initialTurfs={rawTurfs}
        turfPrograms={activePrograms}
        teamMembers={teamMembers}
        turfDensity={turfDensity}
        // Runs tab
        initialShifts={serializedShifts}
        shiftPrograms={shiftPrograms}
        // Lit Drops tab
        initialLitDrops={serializedLitDrops}
        litDropPrograms={litDropPrograms as LitProgramRow[]}
        // Teams tab
        initialTeams={serializedTeams}
        // Materials tab
        inventory={inventory as InventoryRow[]}
        materialShifts={serializedMaterialShifts}
        // Follow-Ups tab
        initialFollowUps={serializedFollowUps}
        // Mobile tab
        activeShifts={serializedMobileShifts}
        // Audit tab
        logs={serializedAudit}
      />
    </Suspense>
  );
}
