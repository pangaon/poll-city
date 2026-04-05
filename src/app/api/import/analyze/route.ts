import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { detectFileType, parseAnyFile, parseExcelFile } from "@/lib/import/file-parser";
import { mapColumns } from "@/lib/import/column-mapper";

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

  if (!file || !campaignId) {
    return NextResponse.json({ error: "file and campaignId are required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const fileType = detectFileType(file.name);
  const buffer = await file.arrayBuffer();

  try {
    const parsed = fileType === "excel"
      ? await parseExcelFile(buffer)
      : await parseAnyFile(new TextDecoder().decode(buffer), file.name);
    const suggestedMappings = await mapColumns(parsed.rawHeaders, parsed.sampleRows);

    return NextResponse.json({
      data: {
        filename: file.name,
        fileType,
        totalRows: parsed.totalRows,
        skippedRows: parsed.skippedRows,
        detectedDelimiter: parsed.detectedDelimiter,
        hasHeaders: parsed.hasHeaders,
        rawHeaders: parsed.rawHeaders,
        sampleRows: parsed.sampleRows,
        suggestedMappings,
        warnings: parsed.warnings,
      },
    });
  } catch (e) {
    return NextResponse.json({ error: `Failed to analyze file: ${(e as Error).message}` }, { status: 422 });
  }
}