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

  const expenses = await prisma.volunteerExpense.findMany({
    where: { campaignId },
    include: { volunteerProfile: { include: { user: { select: { id: true, name: true, email: true } }, contact: { select: { id: true, firstName: true, lastName: true } } } } },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: expenses });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const body = await req.json().catch(() => null) as {
    campaignId?: string; volunteerProfileId?: string; amount?: number; category?: string; receiptUrl?: string; notes?: string;
  } | null;

  if (!body?.campaignId || !body.volunteerProfileId || !body.amount || !body.category?.trim()) {
    return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({ where: { userId_campaignId: { userId: session!.user.id, campaignId: body.campaignId } } });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const created = await prisma.volunteerExpense.create({
    data: {
      campaignId: body.campaignId,
      volunteerProfileId: body.volunteerProfileId,
      amount: Number(body.amount),
      category: body.category.trim(),
      receiptUrl: body.receiptUrl?.trim() || null,
      notes: body.notes?.trim() || null,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: body.campaignId,
      userId: session!.user.id,
      action: "created_volunteer_expense",
      entityType: "volunteer_expense",
      entityId: created.id,
      details: {
        amount: created.amount,
        category: created.category,
      },
    },
  });

  return NextResponse.json({ data: created }, { status: 201 });
}
