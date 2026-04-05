import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";

export const dynamic = "force-dynamic";

const ruleSchema = z.object({
  campaignId: z.string().min(1),
  category: z.string().min(1).max(100),
  percentOfTotal: z.number().min(0).max(1).nullish(),
  fixedAmount: z.number().nonnegative().nullish(),
  priority: z.number().int().min(1).max(10).default(1),
  warnAtPercent: z.number().min(0).max(1).default(0.85),
  notes: z.string().max(500).nullish(),
  isActive: z.boolean().default(true),
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

  const rules = await prisma.budgetRule.findMany({
    where: { campaignId },
    orderBy: [{ priority: "asc" }, { category: "asc" }],
  });
  return NextResponse.json({ data: rules });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = ruleSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const body = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const created = await prisma.budgetRule.create({
      data: {
        campaignId: body.campaignId,
        category: body.category.trim(),
        percentOfTotal: body.percentOfTotal ?? null,
        fixedAmount: body.fixedAmount ?? null,
        priority: body.priority,
        warnAtPercent: body.warnAtPercent,
        notes: body.notes?.trim() || null,
        isActive: body.isActive,
      },
    });
    return NextResponse.json({ data: created }, { status: 201 });
  } catch (e) {
    console.error("[budget/rules/create]", e);
    return NextResponse.json({ error: "Create failed" }, { status: 500 });
  }
}
