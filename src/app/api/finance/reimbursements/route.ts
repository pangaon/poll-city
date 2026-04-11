import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";
import { sanitizeUserText } from "@/lib/security/monitor";

export const dynamic = "force-dynamic";

const createSchema = z.object({
  campaignId: z.string().min(1),
  budgetLineId: z.string().nullish(),
  title: z.string().min(1).max(300),
  amountRequested: z.number().positive(),
  notes: z.string().max(2000).nullish(),
  payoutMethod: z.string().max(100).nullish(),
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

  const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role);
  const status = req.nextUrl.searchParams.get("status");

  const reimbursements = await prisma.financeReimbursement.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(status ? { status: status as NonNullable<Parameters<typeof prisma.financeReimbursement.findMany>[0]>["where"] extends { status?: infer E } ? E : never } : {}),
      ...(!isManager ? { userId: session!.user.id } : {}),
    },
    include: {
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
      budgetLine: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: reimbursements });
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

  const reimbursement = await prisma.financeReimbursement.create({
    data: {
      campaignId: body.campaignId,
      budgetLineId: body.budgetLineId ?? null,
      userId: session!.user.id,
      title: body.title.trim(),
      amountRequested: body.amountRequested,
      notes: sanitizeUserText(body.notes),
      payoutMethod: body.payoutMethod?.trim() ?? null,
    },
  });

  await logFinanceAudit({
    campaignId: body.campaignId,
    entityType: "FinanceReimbursement",
    entityId: reimbursement.id,
    action: "created",
    newValue: { title: reimbursement.title, amountRequested: Number(reimbursement.amountRequested) },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: reimbursement }, { status: 201 });
}
