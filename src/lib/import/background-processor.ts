/**
 * Background import processor — processes imports in 500-row chunks with transactions.
 * Called by the process-imports cron every minute.
 */

import prisma from "@/lib/db/prisma";
import { isLikelyDuplicate, toContactWriteData, extractConsentFromRow } from "./import-pipeline";

const CHUNK_SIZE = 500;
const ROLLBACK_HOURS = 24;

/** Process the next chunk of a queued/processing import */
export async function processNextChunk(importLogId: string): Promise<{
  done: boolean;
  processedInChunk: number;
  importedInChunk: number;
  updatedInChunk: number;
  errorsInChunk: number;
}> {
  const job = await prisma.importLog.findUnique({ where: { id: importLogId } });
  if (!job || !["queued", "processing"].includes(job.status)) {
    return { done: true, processedInChunk: 0, importedInChunk: 0, updatedInChunk: 0, errorsInChunk: 0 };
  }

  const rows = (job.parsedData as Array<Record<string, unknown>>) ?? [];
  if (rows.length === 0) {
    await prisma.importLog.update({
      where: { id: importLogId },
      data: { status: "completed", completedAt: new Date(), rollbackDeadline: new Date(Date.now() + ROLLBACK_HOURS * 60 * 60 * 1000) },
    });
    return { done: true, processedInChunk: 0, importedInChunk: 0, updatedInChunk: 0, errorsInChunk: 0 };
  }

  // Calculate chunk bounds
  const chunkStart = job.currentChunk * CHUNK_SIZE;
  if (chunkStart >= rows.length) {
    const hasErrors = (job.errorCount ?? 0) > 0;
    await prisma.importLog.update({
      where: { id: importLogId },
      data: {
        status: hasErrors ? "completed_with_errors" : "completed",
        completedAt: new Date(),
        rollbackDeadline: new Date(Date.now() + ROLLBACK_HOURS * 60 * 60 * 1000),
      },
    });
    return { done: true, processedInChunk: 0, importedInChunk: 0, updatedInChunk: 0, errorsInChunk: 0 };
  }

  const chunkEnd = Math.min(chunkStart + CHUNK_SIZE, rows.length);
  const chunk = rows.slice(chunkStart, chunkEnd);

  // Mark as processing
  if (job.status === "queued") {
    await prisma.importLog.update({ where: { id: importLogId }, data: { status: "processing" } });
  }

  // Read merge strategy packed into mapping JSON (backward-compat: default "update")
  const mappingJson = job.mapping as { columns?: unknown; mergeStrategy?: string } | null;
  const mergeStrategy: string = mappingJson?.mergeStrategy ?? "update";

  // Load existing contacts for dedup
  const existingContacts = await prisma.contact.findMany({
    where: { campaignId: job.campaignId, deletedAt: null },
    select: {
      id: true, firstName: true, lastName: true, postalCode: true,
      phone: true, email: true, externalId: true,
      // fields needed for update_empty strategy
      phone2: true, businessPhone: true, email2: true, address1: true,
      city: true, province: true, ward: true, riding: true, notes: true,
      preferredLanguage: true, source: true,
    },
  });

  let importedInChunk = 0;
  let updatedInChunk = 0;
  let errorsInChunk = 0;
  const newErrors: string[] = [];
  const createdIds: string[] = ((job.rollbackData as string[]) ?? []);

  // Process chunk in a transaction
  try {
    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < chunk.length; i++) {
        const row = chunk[i] as Record<string, string>;
        const writeData = toContactWriteData(row);
        const duplicate = existingContacts.find((existing) => isLikelyDuplicate(row, existing));

        try {
          if (duplicate && mergeStrategy === "skip") {
            // skip duplicates — count as skipped, no DB write
            updatedInChunk++; // reuse counter but mark as "handled"
          } else if (duplicate && mergeStrategy !== "create_all") {
            // update or update_empty
            let updatePayload: Partial<typeof writeData>;
            if (mergeStrategy === "update_empty") {
              // Only fill fields that are currently null/empty on the existing record
              const existing = duplicate as Record<string, unknown>;
              updatePayload = Object.fromEntries(
                Object.entries(writeData).filter(([key, val]) => {
                  const cur = existing[key];
                  return val && (cur === null || cur === undefined || cur === "");
                })
              ) as Partial<typeof writeData>;
            } else {
              updatePayload = writeData;
            }
            // Only issue the UPDATE if there's actually something to change
            if (Object.keys(updatePayload).length > 0) {
              await tx.contact.update({
                where: { id: duplicate.id },
                data: { ...updatePayload, importSource: "smart_import" },
              });
            }
            updatedInChunk++;
          } else {
            // create_all or no duplicate found
            const created = await tx.contact.create({
              data: { campaignId: job.campaignId, ...writeData, importSource: "smart_import" },
              select: { id: true, firstName: true, lastName: true, postalCode: true, phone: true, email: true, externalId: true },
            });
            existingContacts.push({ ...created, phone2: null, businessPhone: null, email2: null, address1: null, city: null, province: null, ward: null, riding: null, notes: null, preferredLanguage: "en", source: "smart_import" });
            createdIds.push(created.id);
            importedInChunk++;

            // CASL: create ConsentRecord if consent was mapped from this row
            const consent = extractConsentFromRow(row);
            if (consent?.consentGiven) {
              await tx.consentRecord.create({
                data: {
                  contactId: created.id,
                  campaignId: job.campaignId,
                  consentType: "implied",
                  channel: "email",
                  source: "import",
                  collectedAt: consent.collectedAt,
                  // implied consent expires 2 years from collection per CASL
                  expiresAt: new Date(consent.collectedAt.getTime() + 2 * 365.25 * 24 * 60 * 60 * 1000),
                  notes: "Mapped from import CSV consent column",
                },
              });
            }
          }
        } catch (e) {
          errorsInChunk++;
          newErrors.push(`Row ${chunkStart + i + 1}: ${(e as Error).message}`);
        }
      }
    });
  } catch (e) {
    // Transaction failed — whole chunk rolls back
    errorsInChunk = chunk.length;
    newErrors.push(`Chunk ${job.currentChunk + 1} failed: ${(e as Error).message}`);
  }

  // Update progress
  const existingErrors = (job.errors as string[]) ?? [];
  const allErrors = [...existingErrors, ...newErrors].slice(0, 500);
  const isDone = chunkEnd >= rows.length;

  await prisma.importLog.update({
    where: { id: importLogId },
    data: {
      currentChunk: job.currentChunk + 1,
      processedRows: Math.min(chunkEnd, rows.length),
      importedCount: (job.importedCount ?? 0) + importedInChunk,
      updatedCount: (job.updatedCount ?? 0) + updatedInChunk,
      skippedCount: (job.skippedCount ?? 0) + errorsInChunk,
      errorCount: (job.errorCount ?? 0) + errorsInChunk,
      errors: allErrors.length > 0 ? allErrors : undefined,
      rollbackData: createdIds,
      ...(isDone
        ? {
            status: allErrors.length > 0 ? "completed_with_errors" : "completed",
            completedAt: new Date(),
            rollbackDeadline: new Date(Date.now() + ROLLBACK_HOURS * 60 * 60 * 1000),
          }
        : {}),
    },
  });

  return { done: isDone, processedInChunk: chunk.length, importedInChunk, updatedInChunk, errorsInChunk };
}

/** Rollback an import — delete all contacts created by this import */
export async function rollbackImport(importLogId: string): Promise<{ deletedCount: number }> {
  const job = await prisma.importLog.findUnique({ where: { id: importLogId } });
  if (!job) throw new Error("Import not found");

  if (!["completed", "completed_with_errors"].includes(job.status)) {
    throw new Error("Can only rollback completed imports");
  }

  if (job.rollbackDeadline && new Date() > job.rollbackDeadline) {
    throw new Error("Rollback window has expired (24 hours)");
  }

  const createdIds = (job.rollbackData as string[]) ?? [];
  if (createdIds.length === 0) {
    await prisma.importLog.update({ where: { id: importLogId }, data: { status: "rolled_back" } });
    return { deletedCount: 0 };
  }

  // Delete in chunks to avoid overwhelming the DB
  let deletedCount = 0;
  for (let i = 0; i < createdIds.length; i += 500) {
    const batch = createdIds.slice(i, i + 500);
    const result = await prisma.contact.deleteMany({
      where: { id: { in: batch }, campaignId: job.campaignId },
    });
    deletedCount += result.count;
  }

  await prisma.importLog.update({
    where: { id: importLogId },
    data: { status: "rolled_back" },
  });

  await prisma.activityLog.create({
    data: {
      campaignId: job.campaignId,
      userId: job.userId,
      action: "import.rollback",
      entityType: "ImportLog",
      entityId: importLogId,
      details: { deletedCount } as object,
    },
  });

  return { deletedCount };
}
