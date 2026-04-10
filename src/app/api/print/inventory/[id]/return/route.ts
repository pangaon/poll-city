import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const returnSchema = z.object({
  campaignId: z.string().min(1),
  qty: z.number().int().positive(),
  referenceId: z.string().optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let rawBody: unknown;
  try {
    rawBody = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = returnSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, qty, referenceId, notes } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.printInventory.findUnique({ where: { id: params.id } });
      if (!inv || inv.campaignId !== campaignId) throw new Error("NOT_FOUND");
      if (inv.reservedQty < qty) throw new Error("OVER_RETURN");

      const result = await tx.printInventory.update({
        where: { id: params.id },
        data: {
          availableQty: { increment: qty },
          reservedQty: { decrement: qty },
        },
      });

      await tx.printInventoryLog.create({
        data: {
          inventoryId: inv.id,
          campaignId,
          action: "returned",
          qty,
          balance: result.availableQty,
          notes: notes ?? `Returned ${qty} units`,
          referenceId: referenceId ?? null,
          referenceType: "manual",
          userId: session!.user.id,
        },
      });

      return result;
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (err.message === "OVER_RETURN") return NextResponse.json({ error: "Cannot return more than reserved quantity" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
