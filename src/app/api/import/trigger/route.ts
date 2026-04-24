/**
 * POST /api/import/trigger — Server-side trigger for queued imports.
 *
 * Fix 1: Eliminates the cron dependency that caused imports to stall forever
 * when CRON_SECRET is not configured. This endpoint is called immediately after
 * upload by the import wizard and processes all chunks of the job to completion.
 *
 * Auth: apiAuth (campaign membership) — NOT cron secret.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { processNextChunk } from "@/lib/import/background-processor";

export const dynamic = "force-dynamic";
// Allow up to 5 minutes for large imports (10k+ rows = 20+ chunks × processing time)
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: { jobId?: string } = {};
  try { body = await req.json() as { jobId?: string }; } catch { /* empty body ok */ }

  const jobId = body.jobId;
  if (!jobId) return NextResponse.json({ error: "jobId is required" }, { status: 400 });

  // Verify the job belongs to this user
  const job = await prisma.importLog.findUnique({
    where: { id: jobId },
    select: { id: true, userId: true, campaignId: true, status: true, totalRows: true },
  });

  if (!job) return NextResponse.json({ error: "Import not found" }, { status: 404 });
  if (job.userId !== session!.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (!["queued", "processing"].includes(job.status)) {
    return NextResponse.json({
      message: "Import already in terminal state",
      status: job.status,
    });
  }

  // Process all chunks to completion — runs synchronously in this request
  let totalImported = 0;
  let totalUpdated = 0;
  let totalSkipped = 0;
  let totalErrors = 0;
  let chunks = 0;
  const MAX_CHUNKS = 200; // safety ceiling: 200 × 500 = 100k rows max per request

  while (chunks < MAX_CHUNKS) {
    const result = await processNextChunk(jobId);
    totalImported += result.importedInChunk;
    totalUpdated += result.updatedInChunk;
    totalSkipped += result.skippedInChunk;
    totalErrors += result.errorsInChunk;
    chunks++;

    if (result.done) break;
  }

  // Fetch final state
  const finalJob = await prisma.importLog.findUnique({
    where: { id: jobId },
    select: {
      id: true,
      status: true,
      importedCount: true,
      updatedCount: true,
      skippedCount: true,
      errorCount: true,
      processedRows: true,
      totalRows: true,
      errors: true,
      warnings: true,
    },
  });

  const warningsJson = (finalJob?.warnings as { caslIssueCount?: number; missingNameCount?: number } | null) ?? {};

  return NextResponse.json({
    jobId,
    status: finalJob?.status ?? "unknown",
    processed: finalJob?.processedRows ?? 0,
    total: finalJob?.totalRows ?? 0,
    imported: finalJob?.importedCount ?? totalImported,
    updated: finalJob?.updatedCount ?? totalUpdated,
    skipped: finalJob?.skippedCount ?? totalSkipped,
    errors: finalJob?.errorCount ?? totalErrors,
    errorMessages: (finalJob?.errors as string[])?.slice(0, 20) ?? [],
    chunksProcessed: chunks,
    caslIssueCount: warningsJson.caslIssueCount ?? 0,
    missingNameCount: warningsJson.missingNameCount ?? 0,
  });
}
