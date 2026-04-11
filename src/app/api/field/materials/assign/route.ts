import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";

// ── POST /api/field/materials/assign ────────────────────────────────────────
// Assigns print materials to a field shift.
// Decrements PrintInventory.availableQty, increments reservedQty.
// Creates a PrintInventoryLog audit row.
// Updates FieldShift.materialsJson with the assignment summary.

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const body = (await req.json().catch(() => null)) as {
    campaignId?: string;
    shiftId?: string;
    assignments?: Array<{
      inventoryId: string;
      qty: number;
      notes?: string;
    }>;
  } | null;

  if (!body?.campaignId || !body?.shiftId || !Array.isArray(body.assignments) || body.assignments.length === 0) {
    return NextResponse.json({ error: "campaignId, shiftId, and assignments are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, body.campaignId, "canvassing:write");
  if (forbidden) return forbidden;

  // Verify shift exists
  const shift = await prisma.fieldShift.findFirst({
    where: { id: body.shiftId, campaignId: body.campaignId, deletedAt: null },
  });
  if (!shift) {
    return NextResponse.json({ error: "Shift not found" }, { status: 404 });
  }

  // Validate all inventory items have sufficient stock
  const inventoryIds = body.assignments.map((a) => a.inventoryId);
  const items = await prisma.printInventory.findMany({
    where: { id: { in: inventoryIds }, campaignId: body.campaignId },
    select: { id: true, sku: true, availableQty: true, productType: true, description: true },
  });

  const itemMap = new Map(items.map((i) => [i.id, i]));
  for (const assignment of body.assignments) {
    const item = itemMap.get(assignment.inventoryId);
    if (!item) {
      return NextResponse.json(
        { error: `Inventory item ${assignment.inventoryId} not found` },
        { status: 404 }
      );
    }
    if (item.availableQty < assignment.qty) {
      return NextResponse.json(
        { error: `Insufficient stock for ${item.sku}: requested ${assignment.qty}, available ${item.availableQty}` },
        { status: 409 }
      );
    }
    if (assignment.qty <= 0) {
      return NextResponse.json({ error: "Quantity must be greater than 0" }, { status: 400 });
    }
  }

  // Execute in a transaction
  const result = await prisma.$transaction(async (tx) => {
    const logs = [];

    for (const assignment of body.assignments!) {
      const item = itemMap.get(assignment.inventoryId)!;
      const newAvailable = item.availableQty - assignment.qty;

      // Update inventory quantities
      await tx.printInventory.update({
        where: { id: assignment.inventoryId },
        data: {
          availableQty: { decrement: assignment.qty },
          reservedQty: { increment: assignment.qty },
        },
      });

      // Create audit log
      const log = await tx.printInventoryLog.create({
        data: {
          inventoryId: assignment.inventoryId,
          campaignId: body.campaignId!,
          action: "assigned",
          qty: -assignment.qty,
          balance: newAvailable,
          notes: assignment.notes ?? `Assigned to shift: ${shift.name}`,
          referenceId: body.shiftId,
          referenceType: "field_shift",
          userId: session!.user.id,
        },
      });

      logs.push({ ...log, item: { sku: item.sku, productType: item.productType } });
    }

    // Build materials summary for FieldShift.materialsJson
    const existingMaterials = (shift.materialsJson as Record<string, unknown> | null) ?? {};
    const assignments = (existingMaterials.assignments as Array<{
      inventoryId: string; sku: string; qty: number; assignedAt: string;
    }> | undefined) ?? [];

    for (const assignment of body.assignments!) {
      const item = itemMap.get(assignment.inventoryId)!;
      const existing = assignments.find((a) => a.inventoryId === assignment.inventoryId);
      if (existing) {
        existing.qty += assignment.qty;
      } else {
        assignments.push({
          inventoryId: assignment.inventoryId,
          sku: item.sku,
          qty: assignment.qty,
          assignedAt: new Date().toISOString(),
        });
      }
    }

    await tx.fieldShift.update({
      where: { id: body.shiftId },
      data: {
        materialsJson: {
          ...existingMaterials,
          assignments,
          lastUpdated: new Date().toISOString(),
        },
      },
    });

    return logs;
  });

  return NextResponse.json({ data: result }, { status: 201 });
}

// ── POST /api/field/materials/return would go in a separate route ────────────
// For now, we handle returns via the inventory system
