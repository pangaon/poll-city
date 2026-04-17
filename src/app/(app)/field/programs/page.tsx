import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import ProgramsClient from "./programs-client";

export const metadata = { title: "Field Programs — Poll City" };

const CONTACT_OUTCOMES = new Set([
  "contacted", "supporter", "undecided", "volunteer_interest",
  "donor_interest", "sign_requested", "follow_up",
]);

export default async function FieldProgramsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const [rawPrograms, turfs] = await Promise.all([
    prisma.fieldProgram.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        _count: { select: { routes: true, targets: true, shifts: true, attempts: true } },
        createdBy: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    }),
    prisma.turf.findMany({
      where: { campaignId },
      select: { id: true, name: true, ward: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const programIds = rawPrograms.map((p) => p.id);

  const [outcomeCounts, completedRouteCounts] = programIds.length > 0
    ? await Promise.all([
        prisma.fieldAttempt.groupBy({
          by: ["fieldProgramId", "outcome"],
          where: { campaignId, fieldProgramId: { in: programIds } },
          _count: { _all: true },
        }),
        prisma.route.groupBy({
          by: ["fieldProgramId"],
          where: {
            campaignId,
            fieldProgramId: { in: programIds },
            deletedAt: null,
            status: "completed",
          },
          _count: { _all: true },
        }),
      ])
    : [[], []];

  const analyticsMap = new Map<string, { contactedCount: number; supporterCount: number }>();
  for (const row of outcomeCounts) {
    if (!row.fieldProgramId) continue;
    const e = analyticsMap.get(row.fieldProgramId) ?? { contactedCount: 0, supporterCount: 0 };
    if (CONTACT_OUTCOMES.has(row.outcome)) e.contactedCount += row._count._all;
    if (row.outcome === "supporter") e.supporterCount += row._count._all;
    analyticsMap.set(row.fieldProgramId, e);
  }

  const completedMap = new Map(
    completedRouteCounts
      .filter((r): r is typeof r & { fieldProgramId: string } => r.fieldProgramId != null)
      .map((r) => [r.fieldProgramId, r._count._all])
  );

  const programs = rawPrograms.map((p) => ({
    ...p,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    ...(analyticsMap.get(p.id) ?? { contactedCount: 0, supporterCount: 0 }),
    completedRoutes: completedMap.get(p.id) ?? 0,
  }));

  return (
    <ProgramsClient
      campaignId={campaignId}
      campaignName={campaignName}
      initialPrograms={programs}
      turfs={turfs}
    />
  );
}
