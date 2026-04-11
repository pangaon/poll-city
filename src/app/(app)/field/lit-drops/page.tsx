import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import LitDropsClient, { type LitDropRow, type LitProgramRow } from "./lit-drops-client";

export const metadata = { title: "Literature Drops — Poll City" };

export default async function LitDropsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const [shifts, programs] = await Promise.all([
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
    prisma.fieldProgram.findMany({
      where: { campaignId, deletedAt: null, isActive: true, programType: "lit_drop" },
      select: { id: true, name: true, programType: true, status: true, goalDoors: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const serializedShifts: LitDropRow[] = shifts.map((s) => ({
    ...s,
    scheduledDate: s.scheduledDate.toISOString(),
    deletedAt: s.deletedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
    materialsJson: s.materialsJson as Record<string, unknown> | null,
  }));

  const serializedPrograms: LitProgramRow[] = programs.map((p) => ({
    ...p,
    goalDoors: p.goalDoors,
  }));

  return (
    <LitDropsClient
      campaignId={campaignId}
      campaignName={campaignName}
      initialShifts={serializedShifts}
      programs={serializedPrograms}
    />
  );
}
