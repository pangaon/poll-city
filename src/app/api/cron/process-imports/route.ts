/**
 * Cron: /api/cron/process-imports — runs every minute.
 * Picks up queued/processing imports and processes their next chunk.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { processNextChunk } from "@/lib/import/background-processor";

export const dynamic = "force-dynamic";
export const maxDuration = 55; // slightly under 1 minute

export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization");
  if (!cronSecret || auth !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  // Find all active imports (queued or processing)
  const activeJobs = await prisma.importLog.findMany({
    where: { status: { in: ["queued", "processing"] } },
    orderBy: { createdAt: "asc" },
    take: 5, // process up to 5 concurrent imports
    select: { id: true, filename: true, status: true },
  });

  if (activeJobs.length === 0) {
    return NextResponse.json({ processed: 0, message: "No imports in queue" });
  }

  const results = [];

  for (const job of activeJobs) {
    try {
      const result = await processNextChunk(job.id);
      results.push({ jobId: job.id, filename: job.filename, ...result });
    } catch (e) {
      // Mark job as failed if processing throws
      await prisma.importLog.update({
        where: { id: job.id },
        data: { status: "failed", errors: [(e as Error).message] },
      }).catch(() => {});
      results.push({ jobId: job.id, filename: job.filename, error: (e as Error).message });
    }
  }

  return NextResponse.json({ processed: results.length, results });
}
