import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { PrintProductType } from "@prisma/client";

const generateSchema = z.object({
  campaignId: z.string().min(1),
  packType: z.enum(["walk_kit", "sign_install_kit", "lit_drop_kit", "event_kit", "gotv_kit"]),
  turfId: z.string().optional(),
  pollNumber: z.string().optional(),
  fieldAssignmentId: z.string().optional(),
  eventId: z.string().optional(),
  bufferPct: z.number().min(0).max(1).default(0.20),
  productTypes: z.array(z.nativeEnum(PrintProductType)).min(1),
});

// Round up to nearest multiple (default 50 for bulk print quantities)
function roundUp(n: number, multiple = 50): number {
  return Math.ceil(n / multiple) * multiple;
}

// Default product types per pack type
const PACK_DEFAULTS: Record<string, PrintProductType[]> = {
  walk_kit: [PrintProductType.flyer, PrintProductType.door_hanger],
  sign_install_kit: [PrintProductType.lawn_sign],
  lit_drop_kit: [PrintProductType.flyer],
  event_kit: [PrintProductType.palm_card],
  gotv_kit: [PrintProductType.palm_card, PrintProductType.flyer],
};

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = generateSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, packType, turfId, pollNumber, fieldAssignmentId, eventId, bufferPct, productTypes } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // ── Step 1: Calculate targetCount from campaign data ──────────────────────
  let targetCount = 0;
  let packName = "";

  if (packType === "sign_install_kit") {
    // Count requested signs — optionally scoped to turf/poll
    const where: Record<string, unknown> = {
      campaignId,
      status: { in: ["requested", "scheduled"] },
      deletedAt: null,
    };
    targetCount = await prisma.sign.count({ where });
    packName = `Sign Install Kit — ${targetCount} signs`;
  } else if (turfId) {
    const turf = await prisma.turf.findUnique({
      where: { id: turfId },
      select: { id: true, name: true, totalDoors: true, campaignId: true, pollNumber: true },
    });
    if (!turf || turf.campaignId !== campaignId) {
      return NextResponse.json({ error: "Turf not found" }, { status: 404 });
    }
    targetCount = turf.totalDoors;
    packName = `${packType === "walk_kit" ? "Walk Kit" : packType === "lit_drop_kit" ? "Lit Drop Kit" : "GOTV Kit"} — ${turf.name}`;
  } else if (pollNumber) {
    // Count households in this poll
    const householdCount = await prisma.household.count({
      where: { campaignId, pollNumber, deletedAt: null },
    });
    targetCount = householdCount;
    packName = `${packType === "walk_kit" ? "Walk Kit" : "GOTV Kit"} — Poll ${pollNumber}`;
  } else if (eventId) {
    const event = await prisma.event.findUnique({
      where: { id: eventId },
      select: { id: true, title: true, maxCapacity: true, campaignId: true, deletedAt: true },
    });
    if (!event || event.campaignId !== campaignId || event.deletedAt) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }
    targetCount = event.maxCapacity ?? 100;
    packName = `Event Kit — ${event.title}`;
  } else {
    return NextResponse.json(
      { error: "Must provide one of: turfId, pollNumber, eventId (or use sign_install_kit without scope)" },
      { status: 400 }
    );
  }

  // ── Step 2: Calculate required quantities ─────────────────────────────────
  const requiredQty = roundUp(Math.ceil(targetCount * (1 + bufferPct)));

  // ── Step 3: Check inventory sufficiency for each product type ─────────────
  const effectiveProductTypes = productTypes.length > 0 ? productTypes : (PACK_DEFAULTS[packType] ?? []);

  const itemsWithStatus = await Promise.all(
    effectiveProductTypes.map(async (productType) => {
      // Find best available inventory for this product type
      const available = await prisma.printInventory.findFirst({
        where: {
          campaignId,
          productType,
          availableQty: { gt: 0 },
        },
        orderBy: { availableQty: "desc" },
        select: { id: true, sku: true, availableQty: true, productType: true },
      });

      const shortfall = available ? Math.max(0, requiredQty - available.availableQty) : requiredQty;

      return {
        productType,
        requiredQty,
        inventorySufficient: shortfall === 0,
        inventoryAvailable: available?.availableQty ?? 0,
        inventoryId: available?.id ?? null,
        shortfall: shortfall > 0 ? shortfall : undefined,
      };
    })
  );

  // ── Step 4: Create the PrintPack ──────────────────────────────────────────
  const pack = await prisma.printPack.create({
    data: {
      campaignId,
      name: packName,
      packType,
      targetCount,
      bufferPct,
      turfId: turfId ?? null,
      pollNumber: pollNumber ?? null,
      fieldAssignmentId: fieldAssignmentId ?? null,
      eventId: eventId ?? null,
      generatedAt: new Date(),
      items: {
        create: itemsWithStatus.map((item) => ({
          productType: item.productType,
          requiredQty: item.requiredQty,
          inventoryId: item.inventoryId,
        })),
      },
    },
    include: { items: true },
  });

  const hasShortfall = itemsWithStatus.some((i) => i.shortfall);

  return NextResponse.json({
    data: {
      ...pack,
      items: itemsWithStatus.map((item, idx) => ({
        ...pack.items[idx],
        ...item,
      })),
    },
    hasShortfall,
    message: hasShortfall
      ? "Pack created with shortfalls. Order more materials before distributing."
      : "Pack created successfully. All inventory available.",
  }, { status: 201 });
}
