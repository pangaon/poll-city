import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const patchSchema = z.object({
  campaignId: z.string().min(1),
  location: z.enum(["hq", "storage", "event", "in_field"]).optional(),
  reorderThreshold: z.number().int().positive().nullable().optional(),
  notes: z.string().optional(),
  description: z.string().optional(),
});

async function resolveInventory(id: string, campaignId: string) {
  const inv = await prisma.printInventory.findUnique({ where: { id } });
  if (!inv || inv.campaignId !== campaignId) return null;
  return inv;
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const inv = await prisma.printInventory.findUnique({
    where: { id: params.id },
    include: {
      order: { select: { id: true, status: true, quantity: true, totalPriceCad: true, productType: true } },
      packItems: {
        include: { pack: { select: { id: true, name: true, packType: true, status: true } } },
      },
    },
  });
  if (!inv || inv.campaignId !== campaignId) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const logs = await prisma.printInventoryLog.findMany({
    where: { inventoryId: params.id },
    orderBy: { createdAt: "desc" },
    take: 50,
    include: { user: { select: { id: true, name: true } } },
  });

  return NextResponse.json({ data: inv, logs });
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

  const { campaignId } = parsed.data;
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const inv = await resolveInventory(params.id, campaignId);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await prisma.printInventory.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.location !== undefined && { location: parsed.data.location }),
      ...(parsed.data.reorderThreshold !== undefined && { reorderThreshold: parsed.data.reorderThreshold }),
      ...(parsed.data.notes !== undefined && { notes: parsed.data.notes }),
      ...(parsed.data.description !== undefined && { description: parsed.data.description }),
    },
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions — ADMIN+ required" }, { status: 403 });
  }

  const inv = await resolveInventory(params.id, campaignId);
  if (!inv) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Only allow delete if no committed quantities (EC-006)
  if (inv.availableQty < inv.totalQty) {
    return NextResponse.json(
      { error: "Cannot delete inventory with committed quantities. Adjust to zero first." },
      { status: 409 }
    );
  }

  await prisma.printInventory.delete({ where: { id: params.id } });
  return NextResponse.json({ ok: true });
}
