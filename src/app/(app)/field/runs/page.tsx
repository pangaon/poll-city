import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import RunsClient, { type ShiftRow } from "./runs-client";

export const metadata = { title: "Canvassing Runs — Poll City" };

export default async function FieldRunsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const [shifts, programs] = await Promise.all([
    prisma.fieldShift.findMany({
      where: { campaignId, deletedAt: null },
      include: {
        _count: { select: { assignments: true, attempts: true } },
        leadUser: { select: { id: true, name: true } },
        fieldProgram: { select: { id: true, name: true } },
        turf: { select: { id: true, name: true } },
        route: { select: { id: true, name: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
    }),
    prisma.fieldProgram.findMany({
      where: { campaignId, deletedAt: null, isActive: true },
      select: { id: true, name: true, programType: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serialized: ShiftRow[] = shifts.map((s) => ({
    ...s,
    scheduledDate: s.scheduledDate.toISOString(),
    deletedAt: s.deletedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <RunsClient
      campaignId={campaignId}
      campaignName={campaignName}
      initialShifts={serialized}
      programs={programs}
    />
  );
}
