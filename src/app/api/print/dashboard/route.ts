import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

// GET /api/print/dashboard?campaignId=...
// Aggregate stats for the Print Command Centre.
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const campaignId = req.nextUrl.searchParams.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const [
    draftOrders,
    activeJobs,
    inventoryItems,
    recentJobs,
    recentOrders,
  ] = await Promise.all([
    prisma.printOrder.count({ where: { campaignId, status: "draft" } }),

    prisma.printJob.groupBy({
      by: ["status"],
      where: { campaignId, status: { notIn: ["delivered", "cancelled"] } },
      _count: { _all: true },
    }),

    // Fetch inventory to compute totals and low-stock count in JS
    prisma.printInventory.findMany({
      where: { campaignId },
      select: { availableQty: true, reorderThreshold: true },
    }),

    prisma.printJob.findMany({
      where: { campaignId, status: { notIn: ["cancelled"] } },
      orderBy: { updatedAt: "desc" },
      take: 8,
      select: {
        id: true,
        title: true,
        productType: true,
        quantity: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        _count: { select: { bids: true } },
      },
    }),

    prisma.printOrder.findMany({
      where: { campaignId, status: "draft" },
      orderBy: { updatedAt: "desc" },
      take: 5,
      select: {
        id: true,
        productType: true,
        quantity: true,
        totalPriceCad: true,
        createdAt: true,
        template: { select: { name: true, slug: true } },
      },
    }),
  ]);

  const jobCounts: Record<string, number> = {};
  for (const g of activeJobs) jobCounts[g.status] = g._count._all;

  const totalAvailable = inventoryItems.reduce((s, i) => s + i.availableQty, 0);
  const lowStock = inventoryItems.filter(
    (i) => (i.reorderThreshold ?? 0) > 0 && i.availableQty <= (i.reorderThreshold ?? 0)
  ).length;

  return NextResponse.json({
    orders: { draft: draftOrders },
    jobs: {
      posted: jobCounts["posted"] ?? 0,
      bidding: jobCounts["bidding"] ?? 0,
      awarded: jobCounts["awarded"] ?? 0,
      in_production: jobCounts["in_production"] ?? 0,
      quality_check: jobCounts["quality_check"] ?? 0,
      shipped: jobCounts["shipped"] ?? 0,
      total: activeJobs.reduce((s, g) => s + g._count._all, 0),
    },
    inventory: {
      totalItems: inventoryItems.length,
      totalAvailable,
      lowStock,
    },
    recentJobs,
    recentOrders,
  });
}
