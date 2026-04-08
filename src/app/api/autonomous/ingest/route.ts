import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { checkSource } from "@/lib/autonomous/source-monitor";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  // Verify cron secret — fail closed. If CRON_SECRET is unset, lock the endpoint entirely.
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[autonomous/ingest] CRON_SECRET is not configured — endpoint locked");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.autonomousSource.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
  });

  if (sources.length === 0) {
    return NextResponse.json({ message: "No active sources", checked: 0, newContent: 0, errors: 0 });
  }

  // Process with concurrency limit of 3
  const results = [];
  for (let i = 0; i < sources.length; i += 3) {
    const batch = sources.slice(i, i + 3);
    const batchResults = await Promise.all(batch.map((s) => checkSource(s.id)));
    results.push(...batchResults);
  }

  const totalNew = results.reduce((sum, r) => sum + r.newItems, 0);
  const totalErrors = results.reduce((sum, r) => sum + r.errors.length, 0);

  return NextResponse.json({
    checked: sources.length,
    newContent: totalNew,
    errors: totalErrors,
    details: results.map((r) => ({ sourceId: r.sourceId, newItems: r.newItems, errors: r.errors })),
  });
}
