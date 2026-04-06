import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  itemType: z.enum(["allocation", "expense"]).optional(),
  category: z.string().min(1).max(100).optional(),
  amount: z.number().positive().optional(),
  description: z.string().max(1000).nullish(),
  vendor: z.string().max(200).nullish(),
  paymentMethod: z.string().max(50).nullish(),
  receiptUrl: z.string().max(1000).nullish(),
  receiptNumber: z.string().max(100).nullish(),
  status: z.enum(["pending", "approved", "paid", "rejected", "reconciled"]).optional(),
  tags: z.array(z.string().max(50)).max(10).optional(),
  incurredAt: z.string().nullish(),
  paidAt: z.string().nullish(),
});

async function getAuthorisedItem(req: NextRequest, id: string, userId: string) {
  const item = await prisma.budgetItem.findUnique({ where: { id } });
  if (!item) return { status: 404 as const };
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: item.campaignId } },
  });
  if (!membership) return { status: 403 as const };
  return { status: 200 as const, item, membership };
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "budget:write");
  if (permError) return permError;

  const result = await getAuthorisedItem(req, params.id, session!.user.id);
  if (result.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  try {
    const updated = await prisma.budgetItem.update({
      where: { id: params.id },
      data: {
        ...(body.itemType !== undefined && { itemType: body.itemType }),
        ...(body.category !== undefined && { category: body.category.trim() }),
        ...(body.amount !== undefined && { amount: body.amount }),
        ...(body.description !== undefined && { description: body.description?.trim() || null }),
        ...(body.vendor !== undefined && { vendor: body.vendor?.trim() || null }),
        ...(body.paymentMethod !== undefined && { paymentMethod: body.paymentMethod?.trim() || null }),
        ...(body.receiptUrl !== undefined && { receiptUrl: body.receiptUrl?.trim() || null }),
        ...(body.receiptNumber !== undefined && { receiptNumber: body.receiptNumber?.trim() || null }),
        ...(body.status !== undefined && {
          status: body.status,
          approvedById: body.status === "approved" || body.status === "paid" ? session!.user.id : result.item!.approvedById,
        }),
        ...(body.tags !== undefined && { tags: body.tags }),
        ...(body.incurredAt !== undefined && { incurredAt: body.incurredAt ? new Date(body.incurredAt) : new Date() }),
        ...(body.paidAt !== undefined && { paidAt: body.paidAt ? new Date(body.paidAt) : null }),
      },
    });
    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("[budget/patch]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError2 = requirePermission(session!.user.role as string, "budget:write");
  if (permError2) return permError2;

  const result = await getAuthorisedItem(req, params.id, session!.user.id);
  if (result.status === 404) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (result.status === 403) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.budgetItem.delete({ where: { id: params.id } });
    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    console.error("[budget/delete]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
