import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { detectFileType, parseAnyFile, parseExcelFile } from "@/lib/import/file-parser";

const MAX_FILE_SIZE = 10_000_000;

type MappingConfig = Record<string, string>;

function normalize(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function mapRow(row: Record<string, string>, mappings: MappingConfig): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [source, target] of Object.entries(mappings)) {
    if (!target) continue;
    out[target] = row[source] ?? "";
  }
  return out;
}

function isSafeUrl(url: string): boolean {
  if (!url) return false;
  return /^https?:\/\//i.test(url);
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
  }

  const formData = await req.formData().catch(() => null);
  if (!formData) return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });

  const file = formData.get("file") as File | null;
  const campaignId = formData.get("campaignId") as string | null;
  const mappingsRaw = formData.get("mappings") as string | null;

  if (!file || !mappingsRaw) {
    return NextResponse.json({ error: "file, campaignId, and mappings are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "import:write");
  if (forbidden) return forbidden;

  const mappings = JSON.parse(mappingsRaw) as MappingConfig;
  const fileType = detectFileType(file.name);
  const buffer = await file.arrayBuffer();

  const parsed = fileType === "excel"
    ? await parseExcelFile(buffer)
    : await parseAnyFile(new TextDecoder().decode(buffer), file.name);

  const importLog = await prisma.importLog.create({
    data: {
      campaignId: campaignId!,
      userId: session!.user.id,
      filename: file.name,
      fileType,
      totalRows: parsed.totalRows,
      status: "processing",
      mapping: mappings,
    },
  });

  let imported = 0;
  let updated = 0;
  let skipped = parsed.skippedRows;
  const errors: string[] = [];

  for (let i = 0; i < parsed.rows.length; i += 1) {
    const mapped = mapRow(parsed.rows[i], mappings);

    const title = normalize(mapped.documentTitle) || normalize(mapped.title);
    const category = normalize(mapped.documentCategory) || null;
    const fileUrl = normalize(mapped.documentUrl) || null;
    const notes = normalize(mapped.documentNotes) || null;
    const externalId = normalize(mapped.externalId) || null;

    if (!title) {
      skipped += 1;
      continue;
    }

    if (fileUrl && !isSafeUrl(fileUrl)) {
      skipped += 1;
      errors.push(`Row ${i + 1}: invalid file URL`);
      continue;
    }

    try {
      const existing = await prisma.campaignDocument.findFirst({
        where: {
          campaignId: campaignId!,
          OR: [
            ...(externalId ? [{ externalId }] : []),
            { title, fileUrl: fileUrl ?? undefined },
          ],
        },
        select: { id: true },
      });

      if (existing) {
        await prisma.campaignDocument.update({
          where: { id: existing.id },
          data: {
            category,
            fileUrl,
            notes,
            externalId,
            source: "document_import",
            uploadedBy: session!.user.id,
            metadata: { importedAt: new Date().toISOString() },
          },
        });
        updated += 1;
      } else {
        await prisma.campaignDocument.create({
          data: {
            campaignId: campaignId!,
            uploadedBy: session!.user.id,
            title,
            category,
            fileUrl,
            notes,
            externalId,
            source: "document_import",
            metadata: { importedAt: new Date().toISOString() },
          },
        });
        imported += 1;
      }
    } catch (e) {
      skipped += 1;
      errors.push(`Row ${i + 1}: ${(e as Error).message}`);
    }
  }

  await prisma.importLog.update({
    where: { id: importLog.id },
    data: {
      status: errors.length > 0 ? "completed_with_errors" : "completed",
      processedRows: parsed.rows.length,
      importedCount: imported,
      updatedCount: updated,
      skippedCount: skipped,
      errorCount: errors.length,
      errors: errors.slice(0, 200),
      completedAt: new Date(),
    },
  });

  return NextResponse.json({ data: { importLogId: importLog.id, imported, updated, skipped, errors } });
}
