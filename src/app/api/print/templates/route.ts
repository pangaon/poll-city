import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const category = req.nextUrl.searchParams.get("category");
  const templates = await prisma.printTemplate.findMany({
    where: { isActive: true, ...(category ? { category } : {}) },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: {
      id: true,
      slug: true,
      name: true,
      category: true,
      width: true,
      height: true,
      thumbnail: true,
      isPremium: true,
    },
  });
  return NextResponse.json({ templates });
}
