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
    include: {
      _count: { select: { bids: true } },
    },
  });

  if (!shop) {
    return NextResponse.json({ error: "No shop found for this account" }, { status: 404 });
  }

  return NextResponse.json({ data: shop });
}
