import { NextRequest } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { FinanceExpenseStatus } from "@prisma/client";

export const dynamic = "force-dynamic";

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function row(fields: unknown[]): string {
  return fields.map(escapeCSV).join(",");
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  if (!campaignId) {
    return new Response("campaignId required", { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return new Response("Forbidden", { status: 403 });

  const status = p.get("status");
  const from = p.get("from");
  const to = p.get("to");

  const expenses = await prisma.financeExpense.findMany({
    where: {
      campaignId,
      deletedAt: null,
      ...(status ? { expenseStatus: status as FinanceExpenseStatus } : {}),
      ...(from || to
        ? {
            expenseDate: {
              ...(from ? { gte: new Date(from) } : {}),
              ...(to ? { lte: new Date(to) } : {}),
            },
          }
        : {}),
    },
    include: {
      vendor: { select: { name: true } },
      budgetLine: { select: { name: true, category: true } },
      enteredBy: { select: { name: true } },
    },
    orderBy: { expenseDate: "desc" },
    take: 5000,
  });

  const header = row([
    "Date",
    "Description",
    "Category",
    "Budget Line",
    "Vendor",
    "Amount",
    "Tax",
    "Currency",
    "Status",
    "Payment Status",
    "Source",
    "External Reference",
    "Entered By",
  ]);

  const lines = expenses.map((e) =>
    row([
      e.expenseDate.toISOString().slice(0, 10),
      e.description,
      e.budgetLine?.category ?? "",
      e.budgetLine?.name ?? "",
      e.vendor?.name ?? "",
      Number(e.amount).toFixed(2),
      Number(e.taxAmount).toFixed(2),
      e.currency,
      e.expenseStatus,
      e.paymentStatus,
      e.sourceType,
      e.externalReference ?? "",
      e.enteredBy?.name ?? "",
    ])
  );

  const csv = [header, ...lines].join("\n");
  const filename = `expenses-${campaignId}-${new Date().toISOString().slice(0, 10)}.csv`;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
