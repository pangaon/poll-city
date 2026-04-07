import { NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { computeApprovalRating } from "@/lib/intelligence/aggregator";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const officials = await prisma.official.findMany({
    select: { id: true },
    take: 500,
  });

  let computed = 0;
  for (const official of officials) {
    try {
      await computeApprovalRating(official.id);
      computed++;
    } catch {
      // Continue on individual failures
    }
  }

  return NextResponse.json({ computed, total: officials.length });
}
