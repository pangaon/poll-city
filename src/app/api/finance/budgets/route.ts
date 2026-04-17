import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  name: z.string().min(1).max(200),
  electionCycle: z.string().max(100).nullish(),
  totalBudget: z.number().positive(),
  currency: z.string().length(3).default("CAD"),
  startDate: z.string().nullish(),
  endDate: z.string().nullish(),
  notes: z.string().max(2000).nullish(),
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

  const budgets = await prisma.campaignBudget.findMany({
    where: { campaignId },
    include: {
      budgetLines: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          category: true,
          plannedAmount: true,
          committedAmount: true,
          actualAmount: true,
          isLocked: true,
          isActive: true,
          warningThresholdPct: true,
          parentBudgetLineId: true,
          _count: { select: { expenses: true } },
        },
        orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      },
      _count: { select: { budgetLines: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: budgets });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = createSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  try {
    const budget = await prisma.campaignBudget.create({
      data: {
        campaignId: body.campaignId,
        name: body.name.trim(),
        electionCycle: body.electionCycle?.trim() ?? null,
        totalBudget: body.totalBudget,
        currency: body.currency,
        startDate: body.startDate ? new Date(body.startDate) : null,
        endDate: body.endDate ? new Date(body.endDate) : null,
        notes: sanitizeUserText(body.notes),
        createdByUserId: session!.user.id,
      },
    });

    await logFinanceAudit({
      campaignId: body.campaignId,
      entityType: "CampaignBudget",
      entityId: budget.id,
      action: "created",
      newValue: { name: budget.name, totalBudget: Number(budget.totalBudget) },
      actorUserId: session!.user.id,
    });

    return NextResponse.json({ data: budget }, { status: 201 });
  } catch (e) {
    console.error("[finance/budgets/create]", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
