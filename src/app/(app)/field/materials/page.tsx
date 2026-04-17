import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import MaterialsClient, { type InventoryRow, type ShiftWithMaterials, type RecentLog } from "./materials-client";

export default async function FieldMaterialsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const upcomingCutoff = new Date();
  upcomingCutoff.setDate(upcomingCutoff.getDate() + 14);

  const [rawInventory, rawShifts, recentLogs] = await Promise.all([
    prisma.printInventory.findMany({
      where: { campaignId },
      orderBy: [{ productType: "asc" }, { sku: "asc" }],
      select: {
        id: true,
        sku: true,
        productType: true,
        description: true,
        totalQty: true,
        availableQty: true,
        reservedQty: true,
        depletedQty: true,
        wastedQty: true,
        location: true,
        reorderThreshold: true,
        notes: true,
      },
    }),
    prisma.fieldShift.findMany({
      where: {
        campaignId,
        deletedAt: null,
        status: { in: ["draft", "open", "full", "in_progress"] },
        scheduledDate: { gte: todayStart, lte: upcomingCutoff },
      },
      select: {
        id: true,
        name: true,
        shiftType: true,
        status: true,
        scheduledDate: true,
        startTime: true,
        ward: true,
        pollNumber: true,
        materialsJson: true,
        _count: { select: { assignments: true } },
      },
      orderBy: [{ scheduledDate: "asc" }, { startTime: "asc" }],
      take: 50,
    }),
    prisma.printInventoryLog.findMany({
      where: { campaignId, createdAt: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
      orderBy: { createdAt: "desc" },
      take: 20,
      select: {
        id: true,
        action: true,
        qty: true,
        balance: true,
        notes: true,
        referenceType: true,
        createdAt: true,
        inventory: { select: { sku: true, productType: true } },
      },
    }),
  ]);

  const inventory: InventoryRow[] = rawInventory.map((i) => ({ ...i }));

  const shifts: ShiftWithMaterials[] = rawShifts.map((s) => ({
    ...s,
    scheduledDate: s.scheduledDate.toISOString(),
    materialsJson: s.materialsJson as Record<string, unknown> | null,
  }));

  const logs: RecentLog[] = recentLogs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
  }));

  return (
    <MaterialsClient
      campaignId={campaignId}
      campaignName={campaignName}
      inventory={inventory}
      shifts={shifts}
      recentLogs={logs}
    />
  );
}
