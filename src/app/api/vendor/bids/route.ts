import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  if (session!.user.role !== "PRINT_VENDOR") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const shop = await prisma.printShop.findUnique({
    where: { userId: session!.user.id },
  });

  if (!shop) {
    return NextResponse.json({ error: "No shop linked to this account" }, { status: 404 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 20;

  const [bids, total] = await Promise.all([
    prisma.printBid.findMany({
      where: { shopId: shop.id },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        job: {
          select: {
            id: true,
            title: true,
            productType: true,
            quantity: true,
            deadline: true,
            deliveryCity: true,
            deliveryPostal: true,
            status: true,
            awardedBidId: true,
            trackingNumber: true,
            carrier: true,
            estimatedDelivery: true,
          },
        },
      },
    }),
    prisma.printBid.count({ where: { shopId: shop.id } }),
  ]);

  return NextResponse.json({ data: bids, total, page, pageSize });
}
