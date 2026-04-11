import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import MaterialsClient, { type InventoryRow, type ShiftWithMaterials } from "./materials-client";

export const metadata = { title: "Field Materials — Poll City" };

export default async function FieldMaterialsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const [inventory, shifts] = await Promise.all([
    prisma.printInventory.findMany({
      where: { campaignId },
      orderBy: [{ productType: "asc" }, { sku: "asc" }],
      select: {
        id: true, sku: true, productType: true, description: true,
        totalQty: true, availableQty: true, reservedQty: true, depletedQty: true,
        wastedQty: true, location: true, notes: true,
      },
    }),
    prisma.fieldShift.findMany({
      where: { campaignId, deletedAt: null, status: { in: ["draft", "open", "in_progress"] } },
      select: {
        id: true, name: true, shiftType: true, status: true,
        scheduledDate: true, startTime: true, materialsJson: true,
        ward: true, pollNumber: true,
      },
      orderBy: [{ scheduledDate: "asc" }],
    }),
  ]);

  const serializedShifts: ShiftWithMaterials[] = shifts.map((s) => ({
    ...s,
    scheduledDate: s.scheduledDate.toISOString(),
    materialsJson: s.materialsJson as Record<string, unknown> | null,
  }));

  return (
    <MaterialsClient
      campaignId={campaignId}
      campaignName={campaignName}
      inventory={inventory as InventoryRow[]}
      shifts={serializedShifts}
    />
  );
}
