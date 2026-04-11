import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  description: z.string().max(1000).nullish(),
  plannedAmount: z.number().min(0).optional(),
  warningThresholdPct: z.number().min(0).max(1).optional(),
  ownerUserId: z.string().nullish(),
  sortOrder: z.number().int().optional(),
  isActive: z.boolean().optional(),
  isLocked: z.boolean().optional(),
});

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const line = await prisma.budgetLine.findUnique({ where: { id: params.id } });
  if (!line) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: line.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (line.isLocked && membership.role !== "SUPER_ADMIN" && membership.role !== "ADMIN") {
    return NextResponse.json({ error: "Budget line is locked" }, { status: 409 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;
  const oldValue = { name: line.name, plannedAmount: Number(line.plannedAmount) };

  const updated = await prisma.budgetLine.update({
    where: { id: params.id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.description !== undefined ? { description: sanitizeUserText(body.description) } : {}),
      ...(body.plannedAmount !== undefined ? { plannedAmount: body.plannedAmount } : {}),
      ...(body.warningThresholdPct !== undefined ? { warningThresholdPct: body.warningThresholdPct } : {}),
      ...(body.ownerUserId !== undefined ? { ownerUserId: body.ownerUserId } : {}),
      ...(body.sortOrder !== undefined ? { sortOrder: body.sortOrder } : {}),
      ...(body.isActive !== undefined ? { isActive: body.isActive } : {}),
      ...(body.isLocked !== undefined ? { isLocked: body.isLocked } : {}),
    },
  });

  await logFinanceAudit({
    campaignId: line.campaignId,
    entityType: "BudgetLine",
    entityId: params.id,
    action: "updated",
    oldValue: oldValue as Record<string, unknown>,
    newValue: { name: updated.name, plannedAmount: Number(updated.plannedAmount) },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const line = await prisma.budgetLine.findUnique({ where: { id: params.id } });
  if (!line) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: line.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const expenseCount = await prisma.financeExpense.count({
    where: { budgetLineId: params.id, deletedAt: null },
  });
  if (expenseCount > 0) {
    return NextResponse.json(
      { error: `Cannot deactivate line with ${expenseCount} active expense(s). Reassign first.` },
      { status: 409 }
    );
  }

  await prisma.budgetLine.update({ where: { id: params.id }, data: { isActive: false } });

  await logFinanceAudit({
    campaignId: line.campaignId,
    entityType: "BudgetLine",
    entityId: params.id,
    action: "deactivated",
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: { id: params.id } });
}
