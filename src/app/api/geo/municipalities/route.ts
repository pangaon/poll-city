import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  void session;

  const province = req.nextUrl.searchParams.get("province");

  // Get distinct jurisdictions from election results (most reliable source for municipality names)
  const results = await prisma.electionResult.findMany({
    where: {
      electionType: "municipal",
      ...(province ? { province } : {}),
    },
    select: { jurisdiction: true, province: true },
    distinct: ["jurisdiction"],
    orderBy: { jurisdiction: "asc" },
    take: 500,
  });

  const municipalities = results.map((r) => ({
    name: r.jurisdiction,
    province: r.province,
  }));

  return NextResponse.json({ data: municipalities });
}
