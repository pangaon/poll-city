/**
 * POST /api/import/background — Upload and queue an import for background processing.
 * Returns immediately with a job ID. Frontend polls /api/import/progress?id=<jobId>.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { parseAndMapImportFile, type MappingConfig, type TransformConfig } from "@/lib/import/import-pipeline";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { MAX_UPLOAD_BYTES } from "@/lib/security/xlsx-safety";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const limited = await enforceLimit(req, "import", session!.user.id);
  if (limited) return limited;

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 50MB." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const file = formData.get("file") as File | null;
  const campaignId = formData.get("campaignId") as string | null;
  const mappingsRaw = formData.get("mappings") as string | null;
  const mergeStrategyRaw = (formData.get("mergeStrategy") as string | null) ?? "update";
  const transformsRaw = formData.get("transforms") as string | null;

  if (!file || !mappingsRaw) {
    return NextResponse.json({ error: "file, campaignId, and mappings are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "import:write");
  if (forbidden) return forbidden;

  let mappings: MappingConfig;
  try {
    mappings = JSON.parse(mappingsRaw) as MappingConfig;
  } catch {
    return NextResponse.json({ error: "Invalid mappings JSON" }, { status: 400 });
  }

  const mergeStrategy = ["skip", "update", "update_empty", "create_all"].includes(mergeStrategyRaw)
    ? mergeStrategyRaw
    : "update";

  let transforms: TransformConfig | undefined;
  if (transformsRaw) {
    try {
      transforms = JSON.parse(transformsRaw) as TransformConfig;
    } catch { /* ignore malformed transforms */ }
  }

  // Parse and validate the file (fast — just reading rows, not writing to DB)
  const prepared = await parseAndMapImportFile(file, mappings, transforms);

  // Create job in queued state with parsed data stored for background processing
  // mergeStrategy is packed into the mapping JSON (no schema change needed)
  const importLog = await prisma.importLog.create({
    data: {
      campaignId: campaignId!,
      userId: session!.user.id,
      filename: prepared.filename,
      fileType: prepared.fileType,
      totalRows: prepared.totalRows,
      status: "queued",
      mapping: { columns: mappings, mergeStrategy } as unknown as object,
      warnings: prepared.warnings,
      invalidRows: prepared.invalidRows,
      parsedData: prepared.validRows as unknown as object[],
      chunkSize: 500,
      currentChunk: 0,
      skippedCount: prepared.invalidRows.length,
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: campaignId!,
      userId: session!.user.id,
      action: "import.queued",
      entityType: "ImportLog",
      entityId: importLog.id,
      details: {
        filename: prepared.filename,
        totalRows: prepared.totalRows,
        validRows: prepared.validRows.length,
        invalidRows: prepared.invalidRows.length,
      } as object,
    },
  });

  // Return immediately — cron will process chunks
  return NextResponse.json({
    jobId: importLog.id,
    status: "queued",
    totalRows: prepared.totalRows,
    validRows: prepared.validRows.length,
    invalidRows: prepared.invalidRows.length,
    warnings: prepared.warnings,
    message: "Import queued. Poll /api/import/progress?id=" + importLog.id + " for status.",
  });
}
