import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const pr = await prisma.financePurchaseRequest.findUnique({
    where: { id: params.id, deletedAt: null },
    include: {
      vendor: true,
      budgetLine: { select: { id: true, name: true, category: true, plannedAmount: true, actualAmount: true } },
      requestedBy: { select: { id: true, name: true, email: true } },
      approver: { select: { id: true, name: true } },
      expenses: { where: { deletedAt: null }, select: { id: true, amount: true, expenseStatus: true, expenseDate: true } },
      purchaseOrders: { where: { deletedAt: null }, select: { id: true, poNumber: true, status: true, totalAmount: true } },
    },
  });
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: pr.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  return NextResponse.json({ data: pr });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const pr = await prisma.financePurchaseRequest.findUnique({ where: { id: params.id, deletedAt: null } });
  if (!pr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: pr.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const isOwner = pr.requestedByUserId === session!.user.id;
  const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN", "FINANCE"].includes(membership.role);
  if (!isOwner && !isManager) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["draft", "submitted"].includes(pr.requestStatus)) {
    return NextResponse.json({ error: "Can only cancel draft or submitted requests" }, { status: 409 });
  }

  await prisma.financePurchaseRequest.update({
    where: { id: params.id },
    data: { requestStatus: "cancelled" },
  });

  return NextResponse.json({ data: { id: params.id } });
}
