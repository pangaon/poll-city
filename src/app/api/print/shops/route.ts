import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { PrintProductType } from "@prisma/client";

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const specialty = sp.get("specialty") as PrintProductType | null;
  const search = sp.get("search") ?? "";

  const shops = await prisma.printShop.findMany({
    where: {
      isActive: true,
      ...(specialty ? { specialties: { has: specialty } } : {}),
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
              { serviceAreas: { has: search } },
            ],
          }
        : {}),
    },
    orderBy: [{ isVerified: "desc" }, { rating: "desc" }, { name: "asc" }],
    include: {
      _count: { select: { bids: true } },
    },
  });

  return NextResponse.json({ data: shops });
}
