import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { PrintProductType } from "@prisma/client";

const packItemSchema = z.object({
  productType: z.nativeEnum(PrintProductType),
  requiredQty: z.number().int().positive(),
  inventoryId: z.string().optional(),
  notes: z.string().optional(),
});

const createSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1),
  packType: z.enum(["walk_kit", "sign_install_kit", "lit_drop_kit", "event_kit", "gotv_kit"]),
  targetCount: z.number().int().nonnegative().default(0),
  bufferPct: z.number().min(0).max(1).default(0.20),
  turfId: z.string().optional(),
  pollNumber: z.string().optional(),
  fieldAssignmentId: z.string().optional(),
  eventId: z.string().optional(),
  items: z.array(packItemSchema).min(1, "At least one item required"),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const packType = req.nextUrl.searchParams.get("packType");
  const status = req.nextUrl.searchParams.get("status");
  const fieldAssignmentId = req.nextUrl.searchParams.get("fieldAssignmentId");

  const packs = await prisma.printPack.findMany({
    where: {
      campaignId,
      ...(packType && { packType }),
      ...(status && { status }),
      ...(fieldAssignmentId && { fieldAssignmentId }),
    },
    orderBy: { createdAt: "desc" },
    include: {
      items: {
        include: {
          inventory: { select: { id: true, sku: true, availableQty: true, productType: true } },
        },
      },
    },
  });

  return NextResponse.json({ data: packs });
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

  const { campaignId, name, packType, targetCount, bufferPct, turfId, pollNumber, fieldAssignmentId, eventId, items, notes } =
    parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  // Verify inventory IDs belong to this campaign
  const inventoryIds = items.map((i) => i.inventoryId).filter(Boolean) as string[];
  if (inventoryIds.length > 0) {
    const invRecords = await prisma.printInventory.findMany({
      where: { id: { in: inventoryIds }, campaignId },
      select: { id: true },
    });
    if (invRecords.length !== inventoryIds.length) {
      return NextResponse.json({ error: "One or more inventory items not found" }, { status: 404 });
    }
  }

  const pack = await prisma.printPack.create({
    data: {
      campaignId,
      name,
      packType,
      targetCount,
      bufferPct,
      turfId: turfId ?? null,
      pollNumber: pollNumber ?? null,
      fieldAssignmentId: fieldAssignmentId ?? null,
      eventId: eventId ?? null,
      notes: notes ?? null,
      generatedAt: new Date(),
      items: {
        create: items.map((item) => ({
          productType: item.productType,
          requiredQty: item.requiredQty,
          inventoryId: item.inventoryId ?? null,
          notes: item.notes ?? null,
        })),
      },
    },
    include: {
      items: {
        include: {
          inventory: { select: { id: true, sku: true, availableQty: true } },
        },
      },
    },
  });

  return NextResponse.json({ data: pack }, { status: 201 });
}
