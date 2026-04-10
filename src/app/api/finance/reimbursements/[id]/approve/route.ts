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

  const r = await prisma.financeReimbursement.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: r.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (r.status !== "submitted") {
    return NextResponse.json({ error: "Reimbursement must be submitted to approve" }, { status: 409 });
  }

  const raw = await req.json().catch(() => ({}));
  const parsed = schema.safeParse(raw);
  const approvedAmount = parsed.success && parsed.data.approvedAmount ? parsed.data.approvedAmount : Number(r.amountRequested);
  const isPartial = approvedAmount < Number(r.amountRequested);

  const updated = await prisma.financeReimbursement.update({
    where: { id: params.id },
    data: {
      status: isPartial ? "partially_approved" : "approved",
      amountApproved: approvedAmount,
      approverUserId: session!.user.id,
      decidedDate: new Date(),
    },
  });

  await logFinanceAudit({
    campaignId: r.campaignId,
    entityType: "FinanceReimbursement",
    entityId: params.id,
    action: isPartial ? "partially_approved" : "approved",
    newValue: { approvedAmount },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}
