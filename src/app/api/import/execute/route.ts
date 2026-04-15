import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import {
  isLikelyDuplicate,
  parseAndMapImportFile,
  toContactWriteData,
  type MappingConfig,
} from "@/lib/import/import-pipeline";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { MAX_UPLOAD_BYTES } from "@/lib/security/xlsx-safety";
import type { Session } from "next-auth";

const MAX_FILE_SIZE = MAX_UPLOAD_BYTES;

// ─── JSON batch path ──────────────────────────────────────────────────────────

interface BatchMeta {
  batchIndex: number;
  totalBatches: number;
  totalRows: number;
  filename: string;
  importLogId?: string;
}

interface BatchRequest {
  campaignId: string;
  mappings: Record<string, string>;
  rows: Record<string, string>[];
  batchMeta: BatchMeta;
}

async function handleJsonBatch(
  req: NextRequest,
  session: Session,
): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  if (
    typeof body !== "object" ||
    body === null ||
    !("campaignId" in body) ||
    !("mappings" in body) ||
    !("rows" in body) ||
    !("batchMeta" in body)
  ) {
    return NextResponse.json(
      { error: "campaignId, mappings, rows, and batchMeta are required" },
      { status: 400 },
    );
  }

  const { campaignId, mappings, rows, batchMeta } = body as BatchRequest;

  const { forbidden } = await guardCampaignRoute(session.user.id, campaignId, "import:write");
  if (forbidden) return forbidden;

  // Apply mappings: sourceColumn → targetField
  const mappedRows: Record<string, string>[] = rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [sourceColumn, targetField] of Object.entries(mappings)) {
      if (!targetField) continue;
      mapped[targetField] = row[sourceColumn] ?? "";
    }
    return mapped;
  });

  // Validate — rows missing both firstName and lastName are invalid
  const invalidRows: { rowIndex: number; reason: string }[] = [];
  const validMapped: Record<string, string>[] = [];
  mappedRows.forEach((row, idx) => {
    const first = (row.firstName ?? "").trim();
    const last = (row.lastName ?? "").trim();
    if (!first && !last) {
      invalidRows.push({ rowIndex: batchMeta.batchIndex * rows.length + idx + 1, reason: "Missing both firstName and lastName" });
    } else {
      validMapped.push(row);
    }
  });

  const writeDataBatch = validMapped.map((row) => toContactWriteData(row));

  // ── Create or load ImportLog ─────────────────────────────────────────────────
  let importLogId: string;
  if (batchMeta.batchIndex === 0) {
    const importLog = await prisma.importLog.create({
      data: {
        campaignId,
        userId: session.user.id,
        filename: batchMeta.filename,
        fileType: "import",
        totalRows: batchMeta.totalRows,
        status: "processing",
        warnings: [],
        mapping: mappings,
        invalidRows: [],
      },
    });
    importLogId = importLog.id;
  } else {
    if (!batchMeta.importLogId) {
      return NextResponse.json({ error: "importLogId is required for batches after the first" }, { status: 400 });
    }
    importLogId = batchMeta.importLogId;
  }

  // ── Batch dedup — two queries, not N queries ─────────────────────────────────
  const batchExternalIds = writeDataBatch.map((d) => d.externalId).filter(Boolean) as string[];
  const existingByExtId =
    batchExternalIds.length > 0
      ? await prisma.contact.findMany({
          where: { campaignId, externalId: { in: batchExternalIds }, deletedAt: null },
          select: { id: true, externalId: true },
        })
      : [];
  const extIdMap = new Map(existingByExtId.map((e) => [e.externalId, e.id]));

  const lastNames = Array.from(
    new Set(
      writeDataBatch
        .filter((d) => !d.externalId && d.lastName !== "Unknown")
        .map((d) => d.lastName)
        .filter(Boolean) as string[],
    ),
  );
  const existingByName =
    lastNames.length > 0
      ? await prisma.contact.findMany({
          where: { campaignId, deletedAt: null, lastName: { in: lastNames } },
          select: { id: true, firstName: true, lastName: true, postalCode: true, externalId: true },
        })
      : [];

  // ── Classify rows ────────────────────────────────────────────────────────────
  const toCreate: (ReturnType<typeof toContactWriteData>)[] = [];
  const toUpdate: { id: string; data: ReturnType<typeof toContactWriteData> }[] = [];

  for (const writeData of writeDataBatch) {
    // Check externalId first
    if (writeData.externalId) {
      const existingId = extIdMap.get(writeData.externalId);
      if (existingId) {
        toUpdate.push({ id: existingId, data: writeData });
        continue;
      }
    }
    // Fallback: name + postalCode match
    const nameMatch = existingByName.find(
      (e) =>
        e.firstName?.toLowerCase() === (writeData.firstName ?? "").toLowerCase() &&
        e.lastName?.toLowerCase() === (writeData.lastName ?? "").toLowerCase() &&
        (writeData.postalCode
          ? e.postalCode?.replace(/\s/g, "").toUpperCase() ===
            writeData.postalCode.replace(/\s/g, "").toUpperCase()
          : true),
    );
    if (nameMatch) {
      toUpdate.push({ id: nameMatch.id, data: writeData });
    } else {
      toCreate.push(writeData);
    }
  }

  // ── Bulk create ──────────────────────────────────────────────────────────────
  let importedCount = 0;
  const errors: string[] = [];
  if (toCreate.length > 0) {
    try {
      const result = await prisma.contact.createMany({
        data: toCreate.map((d) => ({ campaignId, ...d, importSource: "smart_import" })),
        skipDuplicates: true,
      });
      importedCount = result.count;
    } catch (e) {
      errors.push(`Batch create failed: ${(e as Error).message}`);
    }
  }

  // ── Individual updates ───────────────────────────────────────────────────────
  let updatedCount = 0;
  for (const { id, data } of toUpdate) {
    try {
      await prisma.contact.update({
        where: { id },
        data: { ...data, importSource: "smart_import", source: data.source ?? "smart_import" },
      });
      updatedCount++;
    } catch (e) {
      errors.push(`Update ${id}: ${(e as Error).message}`);
    }
  }

  const skippedCount = invalidRows.length;
  const isLastBatch = batchMeta.batchIndex === batchMeta.totalBatches - 1;

  // ── Update ImportLog ─────────────────────────────────────────────────────────
  // Increment running totals using atomic increments
  await prisma.importLog.update({
    where: { id: importLogId },
    data: {
      importedCount: { increment: importedCount },
      updatedCount: { increment: updatedCount },
      skippedCount: { increment: skippedCount },
      errorCount: { increment: errors.length },
      processedRows: { increment: validMapped.length },
      ...(isLastBatch
        ? { status: errors.length > 0 ? "completed_with_errors" : "completed", completedAt: new Date() }
        : {}),
    },
  });

  // ── Activity log on last batch ───────────────────────────────────────────────
  if (isLastBatch) {
    // Read final totals for the activity log entry
    const finalLog = await prisma.importLog.findUnique({
      where: { id: importLogId },
      select: { importedCount: true, updatedCount: true, skippedCount: true, errorCount: true },
    });
    await prisma.activityLog.create({
      data: {
        campaignId,
        userId: session.user.id,
        action: "smart_import_execute",
        entityType: "campaign",
        entityId: campaignId,
        details: {
          importLogId,
          importedCount: finalLog?.importedCount ?? importedCount,
          updatedCount: finalLog?.updatedCount ?? updatedCount,
          skippedCount: finalLog?.skippedCount ?? skippedCount,
          errorCount: finalLog?.errorCount ?? errors.length,
        },
      },
    });
  }

  return NextResponse.json({
    data: {
      importLogId,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors: errors.slice(0, 20),
    },
  });
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const limited = await enforceLimit(req, "import", session!.user.id);
  if (limited) return limited;

  const contentType = req.headers.get("content-type") ?? "";

  // JSON batch path — browser-parsed rows, no file size limit
  if (contentType.includes("application/json")) {
    return handleJsonBatch(req, session!);
  }

  // ── FormData path: file upload (existing, unchanged) ─────────────────────────
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FILE_SIZE) {
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

  const prepared = await parseAndMapImportFile(file, mappings);

  const importLog = await prisma.importLog.create({
    data: {
      campaignId: campaignId!,
      userId: session!.user.id,
      filename: prepared.filename,
      fileType: prepared.fileType,
      totalRows: prepared.totalRows,
      status: "processing",
      warnings: prepared.warnings,
      mapping: mappings,
      invalidRows: prepared.invalidRows,
    },
  });

  const existingContacts = await prisma.contact.findMany({
    where: { campaignId: campaignId! },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      postalCode: true,
      phone: true,
      email: true,
      externalId: true,
    },
  });

  let importedCount = 0;
  let updatedCount = 0;
  let skippedCount = prepared.invalidRows.length;
  const errors: string[] = [];

  for (let i = 0; i < prepared.validRows.length; i++) {
    const row = prepared.validRows[i];
    const writeData = toContactWriteData(row);
    const duplicate = existingContacts.find((existing) => isLikelyDuplicate(row, existing));

    try {
      if (duplicate) {
        await prisma.contact.update({
          where: { id: duplicate.id },
          data: {
            ...writeData,
            importSource: "smart_import",
            source: writeData.source ?? "smart_import",
          },
        });
        updatedCount++;
      } else {
        const created = await prisma.contact.create({
          data: {
            campaignId: campaignId!,
            ...writeData,
            importSource: "smart_import",
          },
          select: {
            id: true,
            firstName: true,
            lastName: true,
            postalCode: true,
            phone: true,
            email: true,
            externalId: true,
          },
        });
        existingContacts.push(created);
        importedCount++;
      }
    } catch (e) {
      skippedCount++;
      errors.push(`Row ${i + 1}: ${(e as Error).message}`);
    }
  }

  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      status: errors.length > 0 ? "completed_with_errors" : "completed",
      processedRows: prepared.validRows.length,
      importedCount,
      updatedCount,
      skippedCount,
      errorCount: errors.length,
      errors: errors.slice(0, 250),
      completedAt: new Date(),
    },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: campaignId!,
      userId: session!.user.id,
      action: "smart_import_execute",
      entityType: "campaign",
      entityId: campaignId!,
      details: {
        importLogId: importLog.id,
        importedCount,
        updatedCount,
        skippedCount,
        errorCount: errors.length,
      },
    },
  });

  return NextResponse.json({
    data: {
      importLogId: importLog.id,
      imported: importedCount,
      updated: updatedCount,
      skipped: skippedCount,
      errors,
    },
  });
}
