import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import RoutesClient from "./routes-client";

export const metadata = { title: "Field Routes — Poll City" };

export default async function FieldRoutesPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const [rawRoutes, programs, turfs, wardData] = await Promise.all([
    // Routes with target counts and program/turf associations
    prisma.route.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        _count: { select: { targets: true, shifts: true, attempts: true } },
        fieldProgram: { select: { id: true, name: true, programType: true } },
        turf: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    // Active programs for the create drawer
    prisma.fieldProgram.findMany({
      where: { campaignId, deletedAt: null, status: { in: ["planning", "active"] } },
      select: { id: true, name: true, programType: true },
      orderBy: { name: "asc" },
    }),
    // Turfs for grouping
    prisma.turf.findMany({
      where: { campaignId },
      select: { id: true, name: true, ward: true },
      orderBy: { name: "asc" },
    }),
    // Target density by poll — contacts with municipalPoll
    prisma.contact.groupBy({
      by: ["municipalPoll"],
      where: { campaignId, deletedAt: null, municipalPoll: { not: null } },
      _count: { id: true },
      orderBy: { _count: { id: "desc" as const } },
    }),
  ]);

  const density = wardData.map((d) => ({
    poll: d.municipalPoll!,
    contactCount: d._count.id,
  }));

  // Augment routes with completion percentages
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

  return (
    <RoutesClient
      campaignId={campaignId}
      campaignName={campaignName}
      initialRoutes={routes}
      programs={programs}
      turfs={turfs}
      density={density}
    />
  );
}
