import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { parseAnyFile, parseExcelFile, detectFileType } from "@/lib/import/file-parser";
import { mapColumns } from "@/lib/import/column-mapper";
import { matchLists, mergeRecords, type ContactRecord, DEFAULT_CONFIG } from "@/lib/import/fuzzy-matcher";
import { SupportLevel } from "@prisma/client";

const VALID_SUPPORT_LEVELS = Object.values(SupportLevel);

/**
 * POST /api/import/analyze
 * Step 1: Upload file → get parsed columns and AI mapping suggestion
 * Body: FormData with file + campaignId
 */
export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  // File size guard: reject requests over 10MB before parsing
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 10_000_000) {
    return NextResponse.json({ error: "File too large. Maximum size is 10MB." }, { status: 413 });
  }

  const action = req.nextUrl.searchParams.get("action") ?? "analyze";

  // ── Action: analyze ──────────────────────────────────────────────────────────
  if (action === "analyze") {
    let formData: FormData;
    try { formData = await req.formData(); }
    catch { return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 }); }

    const file = formData.get("file") as File | null;
    const campaignId = formData.get("campaignId") as string | null;

    if (!file) return NextResponse.json({ error: "file and campaignId required" }, { status: 400 });

    const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "import:write");
    if (forbidden) return forbidden;

    const fileType = detectFileType(file.name);
    const buffer = await file.arrayBuffer();

    let parsed;
    try {
      if (fileType === "excel") {
        parsed = await parseExcelFile(buffer);
      } else {
        const text = new TextDecoder().decode(buffer);
        parsed = await parseAnyFile(text, file.name);
      }
    } catch (e) {
      return NextResponse.json({ error: `Failed to parse file: ${(e as Error).message}` }, { status: 422 });
    }

    // Map columns with AI
    const mappings = await mapColumns(parsed.rawHeaders, parsed.sampleRows);

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
        suggestedMappings: mappings,
        warnings: parsed.warnings,
      },
    });
  }

  // ── Action: match (for phone list matching) ───────────────────────────────
  if (action === "match") {
    let body: { campaignId: string; voterRows: ContactRecord[]; phoneRows: ContactRecord[]; config?: typeof DEFAULT_CONFIG };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { campaignId, voterRows, phoneRows, config } = body;

    const { forbidden: forbidden2 } = await guardCampaignRoute(session!.user.id, campaignId, "import:write");
    if (forbidden2) return forbidden2;

    // Match voter list against phone list
    const matchResults = await matchLists(voterRows, phoneRows, config ?? DEFAULT_CONFIG);

    // Also check against existing DB contacts for deduplication
    const existingContacts = await prisma.contact.findMany({
      where: { campaignId },
      select: { id: true, firstName: true, lastName: true, phone: true, email: true, address1: true, streetNumber: true, streetName: true, postalCode: true, city: true, externalId: true },
    });

    const dedupResults = await matchLists(
      matchResults.map(r => r.mergedRecord ?? r.recordA),
      existingContacts.map(c => ({
        id: c.id,
        firstName: c.firstName ?? undefined,
        lastName: c.lastName ?? undefined,
        phone: c.phone ?? undefined,
        email: c.email ?? undefined,
        address1: c.address1 ?? undefined,
        streetNumber: c.streetNumber ?? undefined,
        streetName: c.streetName ?? undefined,
        postalCode: c.postalCode ?? undefined,
        city: c.city ?? undefined,
        externalId: c.externalId ?? undefined,
      })),
      { ...DEFAULT_CONFIG, autoMergeThreshold: 90 }
    );

    return NextResponse.json({
      data: {
        matchResults,
        dedupResults,
        summary: {
          voterPhoneMatches: matchResults.filter(r => r.action === "auto_merge").length,
          needsReview: matchResults.filter(r => r.action === "review").length,
          existingDuplicates: dedupResults.filter(r => r.action === "auto_merge").length,
          newContacts: dedupResults.filter(r => r.action === "new_record").length,
        },
      },
    });
  }

  // ── Action: import (final step — write to DB) ─────────────────────────────
  if (action === "import") {
    let body: {
      campaignId: string;
      rows: ContactRecord[];
      importSource?: string;
    };
    try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

    const { campaignId, rows, importSource } = body;

    const { forbidden: forbidden3 } = await guardCampaignRoute(session!.user.id, campaignId, "import:write");
    if (forbidden3) return forbidden3;

    const results = { imported: 0, updated: 0, skipped: 0, errors: [] as string[] };

    // Pre-load existing contacts for in-memory deduplication (avoids N+1 queries)
    const existingContacts = await prisma.contact.findMany({
      where: { campaignId, deletedAt: null },
      select: { id: true, email: true, phone: true, externalId: true },
    });
    const byEmail = new Map<string, string>();
    const byPhone = new Map<string, string>();
    const byExtId = new Map<string, string>();
    for (const c of existingContacts) {
      if (c.email) byEmail.set(c.email.toLowerCase().trim(), c.id);
      if (c.phone) {
        const digits = c.phone.replace(/\D/g, "").slice(-10);
        if (digits.length === 10) byPhone.set(digits, c.id);
      }
      if (c.externalId) byExtId.set(c.externalId, c.id);
    }

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      if (!row.firstName?.trim() && !row.lastName?.trim()) {
        results.errors.push(`Row ${i + 1}: firstName or lastName required`);
        results.skipped++;
        continue;
      }

      const supportLevel = VALID_SUPPORT_LEVELS.includes(row.supportLevel as SupportLevel)
        ? (row.supportLevel as SupportLevel)
        : SupportLevel.unknown;

      // Build the full address1 from decomposed fields if needed
      const address1 = row.address1 ||
        [row.streetNumber, row.streetName, row.streetType].filter(Boolean).join(" ") ||
        null;

      try {
        // Deduplicate by externalId → email → phone (in that priority order)
        let existingId: string | null = null;
        if (row.externalId?.trim()) {
          existingId = byExtId.get(row.externalId.trim()) ?? null;
        }
        if (!existingId && row.email?.trim()) {
          existingId = byEmail.get(row.email.trim().toLowerCase()) ?? null;
        }
        if (!existingId && row.phone?.trim()) {
          const digits = row.phone.replace(/\D/g, "").slice(-10);
          if (digits.length === 10) existingId = byPhone.get(digits) ?? null;
        }

        const existing = existingId
          ? await prisma.contact.findUnique({ where: { id: existingId } })
          : null;

        if (existing) {
          // Update existing contact (fill in blanks, don't overwrite non-null values)
          await prisma.contact.update({
            where: { id: existing.id },
            data: {
              phone: existing.phone || row.phone || null,
              email: existing.email || row.email || null,
              ward: existing.ward || row.ward || null,
              riding: existing.riding || row.riding || null,
              federalDistrict: existing.federalDistrict || row.federalDistrict || null,
              federalPoll: existing.federalPoll || row.federalPoll || null,
              importSource: importSource ?? "smart_import",
            },
          });
          results.updated++;
        } else {
          await prisma.contact.create({
            data: {
              campaignId,
              firstName: (row.firstName ?? "").trim(),
              lastName: (row.lastName ?? "").trim(),
              email: row.email?.trim() || null,
              phone: row.phone?.trim() || null,
              address1,
              streetNumber: row.streetNumber?.trim() || null,
              streetName: row.streetName?.trim() || null,
              streetType: row.streetType?.trim() || null,
              streetDirection: row.streetDirection?.trim() || null,
              unitApt: row.unitApt?.trim() || null,
              city: row.city?.trim() || null,
              province: row.province?.trim() || null,
              postalCode: row.postalCode?.trim() || null,
              ward: row.ward?.trim() || null,
              riding: row.riding?.trim() || null,
              federalDistrict: row.federalDistrict?.trim() || null,
              federalPoll: row.federalPoll?.trim() || null,
              provincialDistrict: row.provincialDistrict?.trim() || null,
              provincialPoll: row.provincialPoll?.trim() || null,
              municipalDistrict: row.municipalDistrict?.trim() || null,
              municipalPoll: row.municipalPoll?.trim() || null,
              votingLocation: row.votingLocation?.trim() || null,
              externalId: row.externalId?.trim() || null,
              notes: row.notes?.trim() || null,
              preferredLanguage: row.preferredLanguage?.trim() || "en",
              supportLevel,
              source: row.source?.trim() || importSource || "import",
              importSource: importSource ?? "smart_import",
            },
          });
          results.imported++;
        }
      } catch (e) {
        results.errors.push(`Row ${i + 1}: ${(e as Error).message}`);
        results.skipped++;
      }
    }

    // Log activity
    await prisma.activityLog.create({
      data: {
        campaignId,
        userId: session!.user.id,
        action: "smart_import",
        entityType: "campaign",
        entityId: campaignId,
        details: { imported: results.imported, updated: results.updated, skipped: results.skipped, source: importSource },
      },
    });

    return NextResponse.json({ data: results });
  }

  return NextResponse.json({ error: "Invalid action. Use: analyze, match, import" }, { status: 400 });
}
