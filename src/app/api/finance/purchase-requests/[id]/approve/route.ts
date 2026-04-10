import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";

export const dynamic = "force-dynamic";

const schema = z.object({
  approvedAmount: z.number().positive().optional(),
  notes: z.string().max(500).nullish(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const pr = await prisma.financePurchaseRequest.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: pr.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (pr.requestStatus !== "submitted") {
    return NextResponse.json({ error: "Request must be submitted to approve" }, { status: 409 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  const approvedAmount = parsed.success ? parsed.data.approvedAmount : undefined;
  const notes = parsed.success ? parsed.data.notes : undefined;

  const isPartial = approvedAmount !== undefined && approvedAmount < Number(pr.requestedAmount);

  const updated = await prisma.financePurchaseRequest.update({
    where: { id: params.id },
    data: {
      requestStatus: isPartial ? "partially_approved" : "approved",
      approvedAmount: approvedAmount ?? pr.requestedAmount,
      approverUserId: session!.user.id,
      decidedDate: new Date(),
      ...(notes ? { notes: pr.notes ? `${pr.notes}\n\n${notes}` : notes } : {}),
    },
  });

  // Update committed amount on budget line
  if (pr.budgetLineId) {
    await prisma.budgetLine.update({
      where: { id: pr.budgetLineId },
      data: { committedAmount: { increment: Number(updated.approvedAmount) } },
    });
  }

  await logFinanceAudit({
    campaignId: pr.campaignId,
    entityType: "FinancePurchaseRequest",
    entityId: params.id,
    action: isPartial ? "partially_approved" : "approved",
    newValue: { approvedAmount: Number(updated.approvedAmount) },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}
