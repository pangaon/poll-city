import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import MobileFieldClient, { type ActiveShiftRow } from "./mobile-client";

export const metadata = { title: "Mobile Field Entry — Poll City" };

export default async function MobileFieldPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const activeShifts = await prisma.fieldShift.findMany({
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
  });

  const serialized: ActiveShiftRow[] = activeShifts.map((s) => ({
    ...s,
    scheduledDate: s.scheduledDate.toISOString(),
    deletedAt: s.deletedAt?.toISOString() ?? null,
    createdAt: s.createdAt.toISOString(),
    updatedAt: s.updatedAt.toISOString(),
  }));

  return (
    <MobileFieldClient
      campaignId={campaignId}
      campaignName={campaignName}
      activeShifts={serialized}
    />
  );
}
