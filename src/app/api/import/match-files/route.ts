import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { isLikelyDuplicate, parseAndMapImportFile, toContactWriteData, type MappingConfig } from "@/lib/import/import-pipeline";
import { DEFAULT_CONFIG, matchLists, mergeRecords, type ContactRecord, type MatchConfig } from "@/lib/import/fuzzy-matcher";

const MAX_FILE_SIZE = 10_000_000;
const MAX_ROWS = 10_000;

type ApplyStrategy = "threshold" | "selected" | "selected_or_threshold";
type ApplyScope = "preview_sample" | "all_matches";

function parseBoolean(raw: FormDataEntryValue | null, fallback: boolean): boolean {
  if (typeof raw !== "string") return fallback;
  return raw === "true" || raw === "1";
}

function parseNumber(raw: FormDataEntryValue | null, fallback: number): number {
  if (typeof raw !== "string") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function parseSelectedRowIndexes(raw: FormDataEntryValue | null): Set<number> {
  if (typeof raw !== "string") return new Set<number>();
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set<number>();
    return new Set(
      parsed
        .map((v) => Number(v))
        .filter((v) => Number.isFinite(v) && v > 0)
    );
  } catch {
    return new Set<number>();
  }
}

function nonEmptyWriteData(input: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(input)) {
    if (value === null || value === undefined) continue;
    if (typeof value === "string" && value.trim() === "") continue;
    out[key] = value;
  }
  return out;
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
  const modeRaw = formData.get("mode");
  const applyStrategyRaw = formData.get("applyStrategy");
  const applyScopeRaw = formData.get("applyScope");
  const selectedRowIndexesRaw = formData.get("selectedRowIndexes");
  const applyConfidenceThreshold = parseNumber(formData.get("applyConfidenceThreshold"), 80);
  const allowCreateFromUnmatched = parseBoolean(formData.get("allowCreateFromUnmatched"), false);

  const mode = typeof modeRaw === "string" && modeRaw === "apply" ? "apply" : "preview";
  const applyStrategy: ApplyStrategy =
    applyStrategyRaw === "threshold" || applyStrategyRaw === "selected" || applyStrategyRaw === "selected_or_threshold"
      ? applyStrategyRaw
      : "selected_or_threshold";
  const applyScope: ApplyScope = applyScopeRaw === "all_matches" ? "all_matches" : "preview_sample";
  const selectedRowIndexes = parseSelectedRowIndexes(selectedRowIndexesRaw);

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
      totalMatches: matchResults.length,
      voterRows: voterRows.length,
      phoneRows: phoneRows.length,
      autoMerged: matchResults.filter((m) => m.action === "auto_merge").length,
      needsReview: matchResults.filter((m) => m.action === "review").length,
      unmatched: matchResults.filter((m) => m.action === "new_record").length,
      highConfidence: matchResults.filter((m) => m.confidence === "high").length,
      mediumConfidence: matchResults.filter((m) => m.confidence === "medium").length,
      eligibleAtThreshold: matchResults.filter((m) => m.action !== "new_record" && m.score >= applyConfidenceThreshold).length,
    };

    const samples = matchResults.slice(0, 60).map((result, index) => ({
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
      eligibleByThreshold: result.action !== "new_record" && result.score >= applyConfidenceThreshold,
    }));

    if (mode === "preview") {
      return NextResponse.json({
        data: {
          summary,
          samples,
          truncated: matchResults.length > 60,
        },
      });
    }

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

    let created = 0;
    let updated = 0;
    let skipped = 0;
    let considered = 0;
    const PREVIEW_LIMIT = 60;

    for (let i = 0; i < matchResults.length; i++) {
      const rowIndex = i + 1;
      const match = matchResults[i];
      const inScope = applyScope === "all_matches" || rowIndex <= PREVIEW_LIMIT;
      if (!inScope) continue;

      const selected = selectedRowIndexes.has(rowIndex);
      const meetsThreshold = match.action !== "new_record" && match.score >= applyConfidenceThreshold;

      const shouldApply =
        applyStrategy === "threshold"
          ? meetsThreshold
          : applyStrategy === "selected"
            ? selected
            : selected || meetsThreshold;

      if (!shouldApply) continue;

      if (match.action === "new_record" && !allowCreateFromUnmatched) {
        skipped++;
        continue;
      }

      considered++;

      const merged = match.mergedRecord ?? mergeRecords(match.recordA, match.recordB, true);
      const writeData = toContactWriteData(
        Object.fromEntries(
          Object.entries(merged).map(([k, v]) => [k, typeof v === "string" ? v : ""])
        )
      );

      const dup = existingContacts.find((contact) =>
        isLikelyDuplicate(
          Object.fromEntries(Object.entries(merged).map(([k, v]) => [k, typeof v === "string" ? v : ""])),
          contact
        )
      );

      try {
        if (dup) {
          const updateData = nonEmptyWriteData({
            ...writeData,
            importSource: "phone_match",
            source: writeData.source ?? "phone_match",
          });
          await prisma.contact.update({ where: { id: dup.id }, data: updateData });
          updated++;
        } else {
          const createdContact = await prisma.contact.create({
            data: {
              campaignId,
              ...writeData,
              importSource: "phone_match",
              source: writeData.source ?? "phone_match",
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
          existingContacts.push(createdContact);
          created++;
        }
      } catch {
        skipped++;
      }
    }

    await prisma.activityLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        action: "phone_match_apply",
        entityType: "campaign",
        entityId: campaignId,
        details: {
          considered,
          created,
          updated,
          skipped,
          applyStrategy,
          applyScope,
          applyConfidenceThreshold,
          selectedRows: selectedRowIndexes.size,
          allowCreateFromUnmatched,
        },
      },
    });

    return NextResponse.json({
      data: {
        summary,
        samples,
        truncated: matchResults.length > 60,
        apply: {
          considered,
          created,
          updated,
          skipped,
          applied: created + updated,
          strategy: applyStrategy,
          scope: applyScope,
          threshold: applyConfidenceThreshold,
          allowCreateFromUnmatched,
        },
      },
    });
  } catch (err) {
    return NextResponse.json({ error: `Failed to match lists: ${(err as Error).message}` }, { status: 422 });
  }
}
