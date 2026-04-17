import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignBudgetId: z.string().min(1),
  campaignId: z.string().min(1),
  parentBudgetLineId: z.string().nullish(),
  code: z.string().max(50).nullish(),
  name: z.string().min(1).max(200),
  description: z.string().max(1000).nullish(),
  category: z.enum([
    "advertising", "digital_ads", "print", "signs", "literature", "events",
    "staffing", "contractors", "volunteer_support", "travel", "office",
    "software", "phones", "outreach", "canvassing", "fundraising",
    "compliance", "research", "photography", "merchandise", "shipping",
    "contingency", "other",
  ]).default("other"),
  subcategory: z.string().max(100).nullish(),
  plannedAmount: z.number().min(0).default(0),
  warningThresholdPct: z.number().min(0).max(1).default(0.85),
  ownerUserId: z.string().nullish(),
  sortOrder: z.number().int().default(0),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const budgetId = req.nextUrl.searchParams.get("budgetId");
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!budgetId && !campaignId) {
    return NextResponse.json({ error: "budgetId or campaignId required" }, { status: 400 });
  }

  const where = budgetId ? { campaignBudgetId: budgetId } : { campaignId: campaignId! };

  // Verify membership
  let cId = campaignId;
  if (budgetId && !campaignId) {
    const budget = await prisma.campaignBudget.findUnique({ where: { id: budgetId }, select: { campaignId: true } });
    if (!budget) return NextResponse.json({ error: "Budget not found" }, { status: 404 });
    cId = budget.campaignId;
  }
  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: cId! } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const staffingFilter = membership.role === "FINANCE" ? { category: { not: "staffing" as const } } : {};

  const lines = await prisma.budgetLine.findMany({
    where: { ...where, isActive: true, ...staffingFilter },
    orderBy: [{ parentBudgetLineId: "asc" }, { sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: { select: { expenses: true, purchaseRequests: true } },
    },
  });

  return NextResponse.json({ data: lines });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (membership.role === "FINANCE" && body.category === "staffing") {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const budget = await prisma.campaignBudget.findUnique({
    where: { id: body.campaignBudgetId },
    select: { campaignId: true, status: true },
  });
  if (!budget || budget.campaignId !== body.campaignId) {
    return NextResponse.json({ error: "Budget not found" }, { status: 404 });
  }
  if (budget.status === "locked") {
    return NextResponse.json({ error: "Budget is locked" }, { status: 409 });
  }

  try {
    const line = await prisma.budgetLine.create({
      data: {
        campaignBudgetId: body.campaignBudgetId,
        campaignId: body.campaignId,
        parentBudgetLineId: body.parentBudgetLineId ?? null,
        code: body.code?.trim() ?? null,
        name: body.name.trim(),
        description: sanitizeUserText(body.description),
        category: body.category,
        subcategory: body.subcategory?.trim() ?? null,
        plannedAmount: body.plannedAmount,
        warningThresholdPct: body.warningThresholdPct,
        ownerUserId: body.ownerUserId ?? null,
        sortOrder: body.sortOrder,
      },
    });

    await logFinanceAudit({
      campaignId: body.campaignId,
      entityType: "BudgetLine",
      entityId: line.id,
      action: "created",
      newValue: { name: line.name, category: line.category, plannedAmount: Number(line.plannedAmount) },
      actorUserId: session!.user.id,
    });

    return NextResponse.json({ data: line }, { status: 201 });
  } catch (e) {
    console.error("[finance/budget-lines/create]", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
