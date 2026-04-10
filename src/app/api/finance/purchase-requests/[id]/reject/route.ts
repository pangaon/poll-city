import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { z } from "zod";
import { logFinanceAudit } from "@/lib/finance/audit";

export const dynamic = "force-dynamic";

const schema = z.object({ reason: z.string().min(1).max(500) });

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

  const raw = await req.json().catch(() => null);
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ error: "reason is required" }, { status: 400 });

  const updated = await prisma.financePurchaseRequest.update({
    where: { id: params.id },
    data: {
      requestStatus: "rejected",
      rejectionReason: parsed.data.reason,
      approverUserId: session!.user.id,
      decidedDate: new Date(),
    },
  });

  await logFinanceAudit({
    campaignId: pr.campaignId,
    entityType: "FinancePurchaseRequest",
    entityId: params.id,
    action: "rejected",
    newValue: { reason: parsed.data.reason },
    actorUserId: session!.user.id,
  });

  return NextResponse.json({ data: updated });
}
