import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { parseAndMapImportFile, type MappingConfig } from "@/lib/import/import-pipeline";
import { DEFAULT_CONFIG, matchLists, type ContactRecord, type MatchConfig } from "@/lib/import/fuzzy-matcher";

const MAX_FILE_SIZE = 10_000_000;
const MAX_ROWS = 10_000;

function parseBoolean(raw: FormDataEntryValue | null, fallback: boolean): boolean {
  if (typeof raw !== "string") return fallback;
  return raw === "true" || raw === "1";
}

function parseNumber(raw: FormDataEntryValue | null, fallback: number): number {
  if (typeof raw !== "string") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function toContactRecord(row: Record<string, string>): ContactRecord {
  return {
    firstName: row.firstName,
    lastName: row.lastName,
    address1: row.address1,
    streetNumber: row.streetNumber,
    streetName: row.streetName,
    city: row.city,
    postalCode: row.postalCode,
    phone: row.phone,
    email: row.email,
    externalId: row.externalId,
  };
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_FILE_SIZE * 2) {
    return NextResponse.json({ error: "Combined payload too large." }, { status: 413 });
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  const campaignId = formData.get("campaignId");
  const voterFile = formData.get("voterFile");
  const phoneFile = formData.get("phoneFile");
  const voterMappingsRaw = formData.get("voterMappings");
  const phoneMappingsRaw = formData.get("phoneMappings");

  if (
    typeof campaignId !== "string" ||
    !(voterFile instanceof File) ||
    !(phoneFile instanceof File) ||
    typeof voterMappingsRaw !== "string" ||
    typeof phoneMappingsRaw !== "string"
  ) {
    return NextResponse.json(
      { error: "campaignId, voterFile, phoneFile, voterMappings, and phoneMappings are required" },
      { status: 400 }
    );
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  let voterMappings: MappingConfig;
  let phoneMappings: MappingConfig;
  try {
    voterMappings = JSON.parse(voterMappingsRaw) as MappingConfig;
    phoneMappings = JSON.parse(phoneMappingsRaw) as MappingConfig;
  } catch {
    return NextResponse.json({ error: "Invalid mapping JSON" }, { status: 400 });
  }

  try {
    const [voterPrepared, phonePrepared] = await Promise.all([
      parseAndMapImportFile(voterFile, voterMappings),
      parseAndMapImportFile(phoneFile, phoneMappings),
    ]);

    const config: MatchConfig = {
      autoMergeThreshold: parseNumber(formData.get("autoMergeThreshold"), DEFAULT_CONFIG.autoMergeThreshold),
      reviewThreshold: parseNumber(formData.get("reviewThreshold"), DEFAULT_CONFIG.reviewThreshold),
      useAI: parseBoolean(formData.get("useAI"), true),
      preferExisting: true,
    };

    const voterRows = voterPrepared.validRows.slice(0, MAX_ROWS).map(toContactRecord);
    const phoneRows = phonePrepared.validRows.slice(0, MAX_ROWS).map(toContactRecord);

    if (voterRows.length === 0 || phoneRows.length === 0) {
      return NextResponse.json({ error: "Both files must contain valid rows after mapping." }, { status: 400 });
    }

    const matchResults = await matchLists(voterRows, phoneRows, config);

    const summary = {
      voterRows: voterRows.length,
      phoneRows: phoneRows.length,
      autoMerged: matchResults.filter((m) => m.action === "auto_merge").length,
      needsReview: matchResults.filter((m) => m.action === "review").length,
      unmatched: matchResults.filter((m) => m.action === "new_record").length,
      highConfidence: matchResults.filter((m) => m.confidence === "high").length,
      mediumConfidence: matchResults.filter((m) => m.confidence === "medium").length,
    };

    const samples = matchResults.slice(0, 30).map((result, index) => ({
      rowIndex: index + 1,
      action: result.action,
      confidence: result.confidence,
      score: result.score,
      matchedOn: result.matchedOn,
      voter: {
        firstName: result.recordA.firstName,
        lastName: result.recordA.lastName,
        phone: result.recordA.phone,
        email: result.recordA.email,
      },
      phoneRecord: {
        firstName: result.recordB.firstName,
        lastName: result.recordB.lastName,
        phone: result.recordB.phone,
        email: result.recordB.email,
      },
    }));

    return NextResponse.json({
      data: {
        summary,
        samples,
        truncated: matchResults.length > 30,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `Failed to match lists: ${(err as Error).message}` }, { status: 422 });
  }
}
