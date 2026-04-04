import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const items = await prisma.budgetItem.findMany({ where: { campaignId }, orderBy: { incurredAt: "desc" } });

  const totals = items.reduce(
    (acc, item) => {
      if (item.itemType === "allocation") acc.allocation += item.amount;
      else acc.expense += item.amount;
      return acc;
    },
    { allocation: 0, expense: 0 }
  );

  return NextResponse.json({ data: { items, totals, remaining: totals.allocation - totals.expense } });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string; itemType?: "allocation" | "expense"; category?: string; amount?: number; description?: string; incurredAt?: string;
  } | null;

  if (!body?.campaignId || !body.itemType || !body.category?.trim() || !body.amount) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.budgetItem.create({
    data: {
      campaignId: body.campaignId,
      itemType: body.itemType,
      category: body.category.trim(),
      amount: Number(body.amount),
      description: body.description?.trim() || null,
      incurredAt: body.incurredAt ? new Date(body.incurredAt) : new Date(),
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
