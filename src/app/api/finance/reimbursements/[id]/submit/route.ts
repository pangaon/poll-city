import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { logFinanceAudit } from "@/lib/finance/audit";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const r = await prisma.financeReimbursement.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: r.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (r.userId !== session!.user.id) return NextResponse.json({ error: "Can only submit your own reimbursement" }, { status: 403 });
  if (r.status !== "draft") return NextResponse.json({ error: "Only draft reimbursements can be submitted" }, { status: 409 });

  const updated = await prisma.financeReimbursement.update({
    where: { id: params.id },
    data: { status: "submitted", submittedDate: new Date() },
  });

  await logFinanceAudit({ campaignId: r.campaignId, entityType: "FinanceReimbursement", entityId: params.id, action: "submitted", actorUserId: session!.user.id });

  return NextResponse.json({ data: updated });
}
