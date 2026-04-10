import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

const assignSchema = z.object({
  campaignId: z.string().min(1),
  qty: z.number().int().positive(),
  assignmentType: z.enum(["volunteer", "field_assignment", "event", "storage"]),
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

  const parsed = assignSchema.safeParse(rawBody);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input", details: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignId, qty, assignmentType, referenceId, notes } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const updated = await prisma.$transaction(async (tx) => {
      // Atomic check + update guards against concurrent requests (EC-006)
      const inv = await tx.printInventory.findUnique({ where: { id: params.id } });
      if (!inv || inv.campaignId !== campaignId) throw new Error("NOT_FOUND");
      if (inv.availableQty < qty) throw new Error("INSUFFICIENT");

      const result = await tx.printInventory.update({
        where: { id: params.id },
        data: {
          availableQty: { decrement: qty },
          reservedQty: { increment: qty },
        },
      });

      await tx.printInventoryLog.create({
        data: {
          inventoryId: inv.id,
          campaignId,
          action: "assigned",
          qty: -qty,
          balance: result.availableQty,
          notes: notes ?? `Assigned ${qty} units (${assignmentType})`,
          referenceId: referenceId ?? null,
          referenceType: assignmentType,
          userId: session!.user.id,
        },
      });

      return result;
    });

    return NextResponse.json({ data: updated });
  } catch (err) {
    if (err instanceof Error) {
      if (err.message === "NOT_FOUND") return NextResponse.json({ error: "Not found" }, { status: 404 });
      if (err.message === "INSUFFICIENT") return NextResponse.json({ error: "Insufficient inventory available" }, { status: 409 });
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
