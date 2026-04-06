import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  category: z.string().min(1).max(100).optional(),
  percentOfTotal: z.number().min(0).max(1).nullish(),
  fixedAmount: z.number().nonnegative().nullish(),
  priority: z.number().int().min(1).max(10).optional(),
  warnAtPercent: z.number().min(0).max(1).optional(),
  notes: z.string().max(500).nullish(),
  isActive: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const rule = await prisma.budgetRule.findUnique({ where: { id: params.id } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: rule.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const raw = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  try {
    const updated = await prisma.budgetRule.update({
      where: { id: params.id },
      data: {
        ...(body.category !== undefined && { category: body.category.trim() }),
        ...(body.percentOfTotal !== undefined && { percentOfTotal: body.percentOfTotal }),
        ...(body.fixedAmount !== undefined && { fixedAmount: body.fixedAmount }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.warnAtPercent !== undefined && { warnAtPercent: body.warnAtPercent }),
        ...(body.notes !== undefined && { notes: body.notes?.trim() || null }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    await prisma.activityLog.create({
      data: {
        campaignId: rule.campaignId,
        userId: session!.user.id,
        action: "budget_rule_updated",
        entityType: "BudgetRule",
        entityId: updated.id,
        details: { ...body },
      },
    });

    return NextResponse.json({ data: updated });
  } catch (e) {
    console.error("[budget/rules/patch]", e);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const rule = await prisma.budgetRule.findUnique({ where: { id: params.id } });
  if (!rule) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: rule.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    await prisma.budgetRule.delete({ where: { id: params.id } });

    await prisma.activityLog.create({
      data: {
        campaignId: rule.campaignId,
        userId: session!.user.id,
        action: "budget_rule_deleted",
        entityType: "BudgetRule",
        entityId: params.id,
        details: { category: rule.category },
      },
    });

    return NextResponse.json({ data: { deleted: true } });
  } catch (e) {
    console.error("[budget/rules/delete]", e);
    return NextResponse.json({ error: "Delete failed" }, { status: 500 });
  }
}
