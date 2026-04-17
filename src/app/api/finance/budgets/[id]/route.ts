import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const updateSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  electionCycle: z.string().max(100).nullish(),
  totalBudget: z.number().positive().optional(),
  currency: z.string().length(3).optional(),
  status: z.enum(["draft", "active", "locked", "archived"]).optional(),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  notes: z.string().max(2000).nullish(),
});

async function getBudget(id: string, userId: string) {
  const budget = await prisma.campaignBudget.findUnique({ where: { id } });
  if (!budget) return { budget: null, membership: null };
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId, campaignId: budget.campaignId } },
  });
  return { budget, membership };
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { budget, membership } = await getBudget(params.id, session!.user.id);
  if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const full = await prisma.campaignBudget.findUnique({
    where: { id: params.id },
    include: {
      budgetLines: {
        where: { isActive: true },
        orderBy: [{ parentBudgetLineId: "asc" }, { sortOrder: "asc" }],
        include: {
          _count: { select: { expenses: true } },
        },
      },
      _count: { select: { budgetLines: true, transfers: true } },
    },
  });

  return NextResponse.json({ data: full });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { budget, membership } = await getBudget(params.id, session!.user.id);
  if (!budget) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (budget.status === "locked") {
    return NextResponse.json({ error: "Budget is locked" }, { status: 409 });
  }

  const raw = await req.json().catch(() => null);
  const parsed = updateSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;
  const oldValue = { status: budget.status, name: budget.name };

  const updated = await prisma.campaignBudget.update({
    where: { id: params.id },
    data: {
      ...(body.name ? { name: body.name.trim() } : {}),
      ...(body.electionCycle !== undefined ? { electionCycle: body.electionCycle?.trim() ?? null } : {}),
      ...(body.totalBudget ? { totalBudget: body.totalBudget } : {}),
      ...(body.currency ? { currency: body.currency } : {}),
      ...(body.status ? { status: body.status } : {}),
      ...(body.startDate !== undefined ? { startDate: body.startDate ? new Date(body.startDate) : null } : {}),
      ...(body.endDate !== undefined ? { endDate: body.endDate ? new Date(body.endDate) : null } : {}),
      ...(body.notes !== undefined ? { notes: sanitizeUserText(body.notes) } : {}),
      updatedByUserId: session!.user.id,
    },
  });

  await logFinanceAudit({
    campaignId: budget.campaignId,
    entityType: "CampaignBudget",
    entityId: params.id,
    action: "updated",
    oldValue: oldValue as Record<string, unknown>,
    newValue: { status: updated.status, name: updated.name },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}
