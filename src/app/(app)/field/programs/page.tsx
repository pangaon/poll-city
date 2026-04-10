import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import ProgramsClient, { type Program } from "./programs-client";

export const metadata = { title: "Field Programs — Poll City" };

export default async function FieldProgramsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const [programs, turfs] = await Promise.all([
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

  // Serialize dates for client component
  const serialized: Program[] = programs.map((p) => ({
    ...p,
    startDate: p.startDate?.toISOString() ?? null,
    endDate: p.endDate?.toISOString() ?? null,
    deletedAt: p.deletedAt?.toISOString() ?? null,
    createdAt: p.createdAt.toISOString(),
    updatedAt: p.updatedAt.toISOString(),
  }));

  return (
    <ProgramsClient
      campaignId={campaignId}
      campaignName={campaignName}
      initialPrograms={serialized}
      turfs={turfs}
    />
  );
}
