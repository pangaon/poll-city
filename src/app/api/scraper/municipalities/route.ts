import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { error } = await apiAuth(req);
  if (error) return error;

  const province = req.nextUrl.searchParams.get("province") ?? "ON";

  const runs = await prisma.muniScrapeRun.findMany({
    where: { province, status: "completed" },
    select: {
      municipality: true,
      province: true,
      completedAt: true,
      rawCount: true,
      sourceUrl: true,
      strategy: true,
    },
    orderBy: { completedAt: "desc" },
  });

  // Deduplicate — keep most recent run per municipality
  const seen = new Set<string>();
  const municipalities = runs.filter((r) => {
    const key = `${r.province}:${r.municipality}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  return NextResponse.json({ data: municipalities });
}
