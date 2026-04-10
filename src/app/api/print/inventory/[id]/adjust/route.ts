import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const adjustSchema = z.object({
  campaignId: z.string().min(1),
  qty: z.number().int(), // positive = add stock, negative = remove
  notes: z.string().min(1, "Notes required for manual adjustments"),
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

  const parsed = adjustSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, qty, notes } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  // Only ADMIN+ can adjust (manual reconciliation is sensitive)
  if (!["ADMIN", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions — ADMIN+ required for manual adjustments" }, { status: 403 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      const inv = await tx.printInventory.findUnique({ where: { id: params.id } });
      if (!inv || inv.campaignId !== campaignId) throw new Error("NOT_FOUND");

      const newAvailable = inv.availableQty + qty;
      if (newAvailable < 0) throw new Error("NEGATIVE");

      const result = await tx.printInventory.update({
        where: { id: params.id },
        data: {
          availableQty: { increment: qty },
          // Positive adjustments increase totalQty; negative go to wastedQty
          ...(qty > 0 ? { totalQty: { increment: qty } } : { wastedQty: { increment: Math.abs(qty) } }),
        },
      });

      await tx.printInventoryLog.create({
        data: {
          inventoryId: inv.id,
          campaignId,
          action: "adjusted",
          qty,
          balance: result.availableQty,
          notes,
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
      if (err.message === "NEGATIVE") return NextResponse.json({ error: "Adjustment would result in negative available quantity" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
