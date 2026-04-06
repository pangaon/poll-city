import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import {
  isLikelyDuplicate,
  parseAndMapImportFile,
  toContactWriteData,
  type MappingConfig,
} from "@/lib/import/import-pipeline";
import { enforceLimit } from "@/lib/rate-limit-redis";
import { MAX_UPLOAD_BYTES } from "@/lib/security/xlsx-safety";

const MAX_FILE_SIZE = MAX_UPLOAD_BYTES;

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const limited = await enforceLimit(req, "import", session!.user.id);
  if (limited) return limited;

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

  if (!file || !campaignId || !mappingsRaw) {
    return NextResponse.json({ error: "file, campaignId, and mappings are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let mappings: MappingConfig;
  try {
    mappings = JSON.parse(mappingsRaw) as MappingConfig;
  } catch {
    return NextResponse.json({ error: "Invalid mappings JSON" }, { status: 400 });
  }

  const prepared = await parseAndMapImportFile(file, mappings);

  const importLog = await prisma.importLog.create({
    data: {
      campaignId,
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
    where: { campaignId },
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
            campaignId,
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
      campaignId,
      userId: session!.user.id,
      action: "smart_import_execute",
      entityType: "campaign",
      entityId: campaignId,
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