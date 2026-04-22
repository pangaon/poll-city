import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { PrintProductType } from "@prisma/client";

// Open job board — available jobs a vendor can bid on
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
  const productType = sp.get("productType") as PrintProductType | null;
  const page = Math.max(1, Number(sp.get("page") ?? "1"));
  const pageSize = 20;

  const where = {
    status: { in: ["posted" as const, "bidding" as const] },
    ...(productType ? { productType } : {}),
  };

  const [jobs, total] = await Promise.all([
    prisma.printJob.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        _count: { select: { bids: true } },
        // Include vendor's own bid on this job if any
        bids: {
          where: { shopId: shop.id },
          select: { id: true, price: true, turnaround: true, isAccepted: true },
        },
      },
    }),
    prisma.printJob.count({ where }),
  ]);

  return NextResponse.json({ data: jobs, total, page, pageSize });
}
