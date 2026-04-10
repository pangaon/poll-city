import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import RoutesClient from "./routes-client";

export const metadata = { title: "Field Routes — Poll City" };

export default async function FieldRoutesPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const [routes, programs, turfs, wardData] = await Promise.all([
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
