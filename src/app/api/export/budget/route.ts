import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { rowsToCsv, csvResponse, exportFilename } from "@/lib/export/csv";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "budget:read");
  if (permError) return permError;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const campaign = await prisma.campaign.findUnique({
    where: { id: campaignId },
    select: { slug: true },
  });

  const items = await prisma.budgetItem.findMany({
    where: { campaignId },
    orderBy: [{ incurredAt: "desc" }],
  });

  const rows = items.map((item) => ({
    itemType: item.itemType,
    category: item.category,
    amount: item.amount.toFixed(2),
    status: item.status,
    vendor: item.vendor ?? "",
    paymentMethod: item.paymentMethod ?? "",
    receiptNumber: item.receiptNumber ?? "",
    receiptUrl: item.receiptUrl ?? "",
    description: item.description ?? "",
    tags: item.tags.join(";"),
    incurredAt: item.incurredAt.toISOString().slice(0, 10),
    paidAt: item.paidAt ? item.paidAt.toISOString().slice(0, 10) : "",
    createdAt: item.createdAt.toISOString(),
  }));

  const csv = rowsToCsv(rows, [
    { key: "itemType", header: "Type" },
    { key: "category", header: "Category" },
    { key: "amount", header: "Amount" },
    { key: "status", header: "Status" },
    { key: "vendor", header: "Vendor" },
    { key: "paymentMethod", header: "Payment Method" },
    { key: "receiptNumber", header: "Receipt Number" },
    { key: "receiptUrl", header: "Receipt URL" },
    { key: "description", header: "Description" },
    { key: "tags", header: "Tags" },
    { key: "incurredAt", header: "Incurred Date" },
    { key: "paidAt", header: "Paid Date" },
    { key: "createdAt", header: "Created At" },
  ]);

  const filename = exportFilename(campaign?.slug ?? "campaign", "budget");

  // Log the export
  try {
    await prisma.exportLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        exportType: "budget",
        format: "csv",
        recordCount: rows.length,
      },
    });
  } catch (e) {
    console.error("[export/budget] log failed", e);
  }

  return csvResponse(csv, filename);
}
