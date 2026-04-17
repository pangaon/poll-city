import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const r = await prisma.financeReimbursement.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      user: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
      budgetLine: { select: { id: true, name: true } },
      expenses: { where: { deletedAt: null } },
    },
  });
  if (!r) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: r.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isOwner = r.userId === session!.user.id;
  const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role);
  if (!isOwner && !isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ data: r });
}
