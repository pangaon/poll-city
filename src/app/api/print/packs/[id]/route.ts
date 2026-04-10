import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const VALID_TRANSITIONS: Record<string, string[]> = {
  draft: ["fulfilled", "cancelled"],
  fulfilled: ["distributed", "draft", "cancelled"],
  distributed: ["returned", "cancelled"],
  returned: [],
  cancelled: [],
};

const patchSchema = z.object({
  campaignId: z.string().min(1),
  status: z.enum(["draft", "fulfilled", "distributed", "returned", "cancelled"]).optional(),
  notes: z.string().optional(),
  fieldAssignmentId: z.string().nullable().optional(),
});

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pack = await prisma.printPack.findUnique({
    where: { id: params.id },
    include: {
      items: {
        include: {
          inventory: true,
        },
      },
    },
  });

  if (!pack || pack.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({ data: pack });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = patchSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, status: newStatus, notes, fieldAssignmentId } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const pack = await prisma.printPack.findUnique({
    where: { id: params.id },
    include: { items: { include: { inventory: true } } },
  });
  if (!pack || pack.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Validate status transition
  if (newStatus && newStatus !== pack.status) {
    const allowed = VALID_TRANSITIONS[pack.status] ?? [];
    if (!allowed.includes(newStatus)) {
      return NextResponse.json(
        { error: `Cannot transition from '${pack.status}' to '${newStatus}'` },
        { status: 409 }
      );
    }
  }

  // On fulfilled: verify all items have inventory assigned
  if (newStatus === "fulfilled") {
    const unassigned = pack.items.filter((item) => !item.inventoryId);
    if (unassigned.length > 0) {
      return NextResponse.json(
        {
          error: "All pack items must have inventory assigned before fulfilling",
          unassigned: unassigned.map((i) => ({ productType: i.productType, requiredQty: i.requiredQty })),
        },
        { status: 409 }
      );
    }
  }

  // On distributed: reserve inventory for all items
  if (newStatus === "distributed") {
    for (const item of pack.items) {
      if (!item.inventoryId || !item.inventory) continue;
      const inv = item.inventory;
      if (inv.availableQty < item.requiredQty) {
        return NextResponse.json(
          {
            error: `Insufficient inventory for ${item.productType}: need ${item.requiredQty}, have ${inv.availableQty}`,
          },
          { status: 409 }
        );
      }
    }

    // Atomic reserve all items
    for (const item of pack.items) {
      if (!item.inventoryId) continue;
      await prisma.$transaction(async (tx) => {
        const inv = await tx.printInventory.update({
          where: { id: item.inventoryId! },
          data: {
            availableQty: { decrement: item.requiredQty },
            reservedQty: { increment: item.requiredQty },
          },
        });
        await tx.printInventoryLog.create({
          data: {
            inventoryId: item.inventoryId!,
            campaignId,
            action: "assigned",
            qty: -item.requiredQty,
            balance: inv.availableQty,
            notes: `Reserved for pack: ${pack.name}`,
            referenceId: pack.id,
            referenceType: "pack",
            userId: session!.user.id,
          },
        });
        await tx.printPackItem.update({
          where: { id: item.id },
          data: { fulfilledQty: item.requiredQty },
        });
      });
    }
  }

  const updated = await prisma.printPack.update({
    where: { id: params.id },
    data: {
      ...(newStatus && { status: newStatus }),
      ...(notes !== undefined && { notes }),
      ...(fieldAssignmentId !== undefined && { fieldAssignmentId }),
      ...(newStatus === "distributed" && { distributedAt: new Date() }),
    },
    include: { items: { include: { inventory: true } } },
  });

  return NextResponse.json({ data: updated });
}
