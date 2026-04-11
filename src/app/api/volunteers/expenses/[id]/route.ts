import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { sanitizeUserText } from "@/lib/security/monitor";

const MANAGER_ROLES = new Set(["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"]);

function isAllowedTransition(from: string, to: string): boolean {
  if (from === "pending") return to === "approved" || to === "rejected";
  if (from === "approved") return to === "reimbursed";
  return false;
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  let body: { status?: string; notes?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const nextStatus = (body.status ?? "").trim().toLowerCase();
  if (!["approved", "rejected", "reimbursed"].includes(nextStatus)) {
    return NextResponse.json({ error: "Invalid status transition target" }, { status: 422 });
  }

  const expense = await prisma.volunteerExpense.findUnique({
    where: { id: params.id },
    select: { id: true, campaignId: true, status: true, notes: true },
  });
  if (!expense) return NextResponse.json({ error: "Expense not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: expense.campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!MANAGER_ROLES.has(membership.role)) {
    return NextResponse.json({ error: "Forbidden - manager role required" }, { status: 403 });
  }

  if (!isAllowedTransition(expense.status, nextStatus)) {
    return NextResponse.json(
      { error: `Invalid transition: ${expense.status} -> ${nextStatus}` },
      { status: 409 }
    );
  }

  const updated = await prisma.volunteerExpense.update({
    where: { id: expense.id },
    data: {
      status: nextStatus as "approved" | "rejected" | "reimbursed",
      notes: body.notes === undefined ? undefined : sanitizeUserText(body.notes),
    },
    include: {
      volunteerProfile: {
        include: {
          user: { select: { id: true, name: true, email: true } },
          contact: { select: { id: true, firstName: true, lastName: true } },
        },
      },
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: expense.campaignId,
      userId: session!.user.id,
      action: "updated_volunteer_expense_status",
      entityType: "volunteer_expense",
      entityId: expense.id,
      details: {
        from: expense.status,
        to: nextStatus,
      },
    },
  });

  return NextResponse.json({ data: updated });
}
