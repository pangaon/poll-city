import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
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

  const job = await prisma.printJob.findUnique({
    where: { id: params.id },
    include: {
      _count: { select: { bids: true } },
      bids: {
        where: { shopId: shop.id },
        select: { id: true, price: true, turnaround: true, isAccepted: true, notes: true },
      },
    },
  });

  // Only expose jobs that are posted/bidding, OR jobs where this shop has a bid
  if (!job) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  const isVisible =
    ["posted", "bidding"].includes(job.status) || job.bids.length > 0;

  if (!isVisible) {
    return NextResponse.json({ error: "Job not found" }, { status: 404 });
  }

  return NextResponse.json({ data: job });
}
