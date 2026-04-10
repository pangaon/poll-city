import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  budgetLineId: z.string().nullish(),
  vendorId: z.string().nullish(),
  title: z.string().min(1).max(300),
  description: z.string().max(2000).nullish(),
  requestedAmount: z.number().positive(),
  urgency: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
  notes: z.string().max(2000).nullish(),
});

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const status = p.get("status");
  const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role);

  const prs = await prisma.financePurchaseRequest.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(status ? { requestStatus: status as NonNullable<Parameters<typeof prisma.financePurchaseRequest.findMany>[0]>["where"] extends { requestStatus?: infer E } ? E : never } : {}),
      // Non-managers only see their own
      ...(!isManager ? { requestedByUserId: session!.user.id } : {}),
    },
    include: {
      vendor: { select: { id: true, name: true } },
      budgetLine: { select: { id: true, name: true, category: true } },
      requestedBy: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
    orderBy: { requestedDate: "desc" },
  });

  return NextResponse.json({ data: prs });
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

  const pr = await prisma.financePurchaseRequest.create({
    data: {
      campaignId: body.campaignId,
      budgetLineId: body.budgetLineId ?? null,
      vendorId: body.vendorId ?? null,
      requestedByUserId: session!.user.id,
      title: body.title.trim(),
      description: body.description?.trim() ?? null,
      requestedAmount: body.requestedAmount,
      urgency: body.urgency,
      notes: body.notes?.trim() ?? null,
    },
  });

  await logFinanceAudit({
    campaignId: body.campaignId,
    entityType: "FinancePurchaseRequest",
    entityId: pr.id,
    action: "created",
    newValue: { title: pr.title, requestedAmount: Number(pr.requestedAmount) },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: pr }, { status: 201 });
}
