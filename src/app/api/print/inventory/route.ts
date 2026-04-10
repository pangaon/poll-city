import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { PrintProductType } from "@prisma/client";

const createSchema = z.object({
  campaignId: z.string().min(1),
  productType: z.nativeEnum(PrintProductType),
  description: z.string().optional(),
  totalQty: z.number().int().positive(),
  location: z.enum(["hq", "storage", "event", "in_field"]).default("hq"),
  reorderThreshold: z.number().int().positive().optional(),
  notes: z.string().optional(),
  receivedAt: z.string().datetime().optional(),
  orderId: z.string().optional(),
});

// Generate a SKU: <productType>-<timestamp-base36>
function generateSku(productType: string): string {
  const prefix = productType.replace(/_/g, "-").toUpperCase().slice(0, 8);
  const suffix = Date.now().toString(36).toUpperCase().slice(-5);
  return `${prefix}-${suffix}`;
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const productType = req.nextUrl.searchParams.get("productType") as PrintProductType | null;
  const location = req.nextUrl.searchParams.get("location");
  const lowStock = req.nextUrl.searchParams.get("lowStock") === "true";

  const where: Record<string, unknown> = { campaignId };
  if (productType) where.productType = productType;
  if (location) where.location = location;

  const allItems = await prisma.printInventory.findMany({
    where,
    orderBy: [{ productType: "asc" }, { createdAt: "desc" }],
    include: {
      order: { select: { id: true, status: true, quantity: true, totalPriceCad: true } },
    },
  });

  // Low-stock filter happens in code (row-to-row comparison not supported by Prisma ORM)
  const items = lowStock
    ? allItems.filter((i) => i.reorderThreshold !== null && i.availableQty <= i.reorderThreshold)
    : allItems;

  // Summary aggregates (always over full campaign set for accurate totals)
  const summary = {
    skuCount: allItems.length,
    totalItems: allItems.reduce((s, i) => s + i.totalQty, 0),
    availableItems: allItems.reduce((s, i) => s + i.availableQty, 0),
    reservedItems: allItems.reduce((s, i) => s + i.reservedQty, 0),
    depletedItems: allItems.reduce((s, i) => s + i.depletedQty, 0),
    reorderAlerts: allItems.filter(
      (i) => i.reorderThreshold !== null && i.availableQty <= i.reorderThreshold
    ).length,
  };

  return NextResponse.json({ data: items, summary });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = createSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, productType, description, totalQty, location, reorderThreshold, notes, receivedAt, orderId } =
    parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Verify orderId belongs to this campaign if provided
  if (orderId) {
    const order = await prisma.printOrder.findUnique({ where: { id: orderId } });
    if (!order || order.campaignId !== campaignId) {
      return NextResponse.json({ error: "Print order not found" }, { status: 404 });
    }
    // Check not already linked
    const existing = await prisma.printInventory.findUnique({ where: { orderId } });
    if (existing) {
      return NextResponse.json({ error: "This order already has inventory created" }, { status: 409 });
    }
  }

  const sku = generateSku(productType);

  const inventory = await prisma.$transaction(async (tx) => {
    const inv = await tx.printInventory.create({
      data: {
        campaignId,
        sku,
        productType,
        description: description ?? null,
        orderId: orderId ?? null,
        totalQty,
        availableQty: totalQty,
        location,
        reorderThreshold: reorderThreshold ?? null,
        notes: notes ?? null,
        receivedAt: receivedAt ? new Date(receivedAt) : new Date(),
      },
    });

    await tx.printInventoryLog.create({
      data: {
        inventoryId: inv.id,
        campaignId,
        action: "received",
        qty: totalQty,
        balance: totalQty,
        notes: notes ?? `Received ${totalQty} units`,
        referenceId: orderId ?? null,
        referenceType: orderId ? "order" : "manual",
        userId: session!.user.id,
      },
    });

    return inv;
  });

  return NextResponse.json({ data: inventory }, { status: 201 });
}
