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
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }
  if (!["approved", "partially_approved"].includes(r.status)) {
    return NextResponse.json({ error: "Reimbursement must be approved before marking paid" }, { status: 409 });
  }

  const updated = await prisma.financeReimbursement.update({
    where: { id: params.id },
    data: { status: "paid" },
  });

  await logFinanceAudit({
    campaignId: r.campaignId,
    entityType: "FinanceReimbursement",
    entityId: params.id,
    action: "paid",
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}
