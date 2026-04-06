/**
 * GET /api/import/progress?id=<jobId> — Poll import progress.
 * Frontend polls every 2 seconds during processing.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required" }, { status: 400 });

  const job = await prisma.importLog.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      totalRows: true,
      processedRows: true,
      importedCount: true,
      updatedCount: true,
      skippedCount: true,
      errorCount: true,
      errors: true,
      warnings: true,
      filename: true,
      currentChunk: true,
      chunkSize: true,
      rollbackDeadline: true,
      completedAt: true,
      createdAt: true,
      userId: true,
    },
  });

  if (!job) return NextResponse.json({ error: "Import not found" }, { status: 404 });
  if (job.userId !== session!.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const totalChunks = job.totalRows > 0 ? Math.ceil(job.totalRows / (job.chunkSize || 500)) : 0;
  const progressPct = job.totalRows > 0 ? Math.round((job.processedRows / job.totalRows) * 100) : 0;
  const canRollback =
    ["completed", "completed_with_errors"].includes(job.status) &&
    job.rollbackDeadline &&
    new Date() < job.rollbackDeadline;

  return NextResponse.json({
    id: job.id,
    status: job.status,
    filename: job.filename,
    totalRows: job.totalRows,
    processedRows: job.processedRows,
    importedCount: job.importedCount,
    updatedCount: job.updatedCount,
    skippedCount: job.skippedCount,
    errorCount: job.errorCount,
    progressPct,
    currentChunk: job.currentChunk,
    totalChunks,
    errors: (job.errors as string[])?.slice(0, 20) ?? [],
    warnings: job.warnings,
    canRollback,
    rollbackDeadline: job.rollbackDeadline,
    completedAt: job.completedAt,
    createdAt: job.createdAt,
  });
}
