import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { parseAndMapImportFile, toContactWriteData, type MappingConfig } from "@/lib/import/import-pipeline";

const MAX_FILE_SIZE = 10_000_000;

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FILE_SIZE) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
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

  try {
    const prepared = await parseAndMapImportFile(file, mappings);
    const cleanedPreview = prepared.validRows.slice(0, 25).map((row) => toContactWriteData(row));

    return NextResponse.json({
      data: {
        filename: prepared.filename,
        fileType: prepared.fileType,
        totalRows: prepared.totalRows,
        validRows: prepared.validRows.length,
        invalidRows: prepared.invalidRows.length,
        skippedRows: prepared.skippedRows,
        warnings: prepared.warnings,
        invalidRowSamples: prepared.invalidRows.slice(0, 20),
        cleanedPreview,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: `Failed to clean rows: ${(e as Error).message}` }, { status: 422 });
  }
}
