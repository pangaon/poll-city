import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { detectFileType, parseAnyFile, parseExcelFile } from "@/lib/import/file-parser";
import { mapColumns, type MappingResult } from "@/lib/import/column-mapper";

const MAX_FILE_SIZE = 10_000_000;

// ─── Known format fingerprints ────────────────────────────────────────────────
// Match against normalised header strings (lowercase, spaces→underscore)

type KnownFormat = {
  id: string;
  label: string;
  description: string;
  signals: string[];      // column name fragments that identify this format
  minSignals: number;     // how many must match
  templateId?: string;    // built-in template to auto-apply
};

const KNOWN_FORMATS: KnownFormat[] = [
  {
    id: "ontario_electoral",
    label: "Ontario Electoral List",
    description: "Elections Ontario standard voter file",
    signals: ["block", "subdivision", "last_name", "first_name", "postal_code", "residency", "occupancy", "k_school"],
    minSignals: 4,
    templateId: "builtin-ontario-voter-file",
  },
  {
    id: "elections_canada",
    label: "Elections Canada List",
    description: "Federal electoral list (Elections Canada)",
    signals: ["polling_division", "elector_id", "last_name", "first_name", "civic_no", "street_name", "apt_unit"],
    minSignals: 4,
  },
  {
    id: "nationbuilder",
    label: "NationBuilder Export",
    description: "Exported from NationBuilder",
    signals: ["external_id", "support_level", "primary_address", "mobile_number", "recruiter_id"],
    minSignals: 3,
  },
  {
    id: "ngpvan",
    label: "NGP VAN / EveryAction Export",
    description: "Exported from NGP VAN or EveryAction",
    signals: ["vanid", "statefileid", "myfolks_commitment", "activist_code", "last_canvassed"],
    minSignals: 2,
  },
  {
    id: "generic_voter",
    label: "Voter File",
    description: "Standard voter list format",
    signals: ["last_name", "first_name", "ward", "poll", "riding", "riding_name", "electoral"],
    minSignals: 3,
  },
  {
    id: "contact_list",
    label: "Contact List",
    description: "General contact / supporter list",
    signals: ["first", "last", "email", "phone"],
    minSignals: 2,
  },
];

function detectFormat(rawHeaders: string[]): {
  format: KnownFormat | null;
  confidence: number;
} {
  const normalized = rawHeaders.map((h) =>
    h.toLowerCase().replace(/[\s\-\.\/]/g, "_").replace(/[^a-z0-9_]/g, "")
  );

  for (const fmt of KNOWN_FORMATS) {
    const matched = fmt.signals.filter((signal) =>
      normalized.some((h) => h === signal || h.includes(signal) || signal.includes(h))
    );
    if (matched.length >= fmt.minSignals) {
      const confidence = Math.round((matched.length / fmt.signals.length) * 100);
      return { format: fmt, confidence: Math.min(99, confidence + 20) }; // +20 bonus for matching minimum
    }
  }

  return { format: null, confidence: 0 };
}

// ─── Mapping confidence score ──────────────────────────────────────────────────
// How confident are we that the suggested mappings are correct overall?

function computeAutoConfidence(mappings: MappingResult, requiredMapped: boolean): number {
  const values = Object.values(mappings).filter((m) => m.targetField !== null);
  if (values.length === 0) return 0;
  const highConf = values.filter((m) => m.confidence >= 80).length;
  const base = Math.round((highConf / values.length) * 100);
  return requiredMapped ? base : Math.max(0, base - 30); // penalise if name fields not covered
}

// ─── Field stats ───────────────────────────────────────────────────────────────
// After applying mappings, count what we actually have

interface FieldStats {
  totalRows: number;
  withName: number;
  withPhone: number;
  withEmail: number;
  withAddress: number;
  withPollNumber: number;
  withPostalCode: number;
  phonePercent: number;
  emailPercent: number;
  addressPercent: number;
}

function computeFieldStats(
  rows: Record<string, string>[],
  mappings: MappingResult,
): FieldStats {
  // Build: targetField → sourceColumn
  const t2s: Record<string, string> = {};
  for (const [src, m] of Object.entries(mappings)) {
    if (m.targetField) t2s[m.targetField] = src;
  }

  const get = (field: string, row: Record<string, string>): string =>
    (t2s[field] ? (row[t2s[field]] ?? "") : "").trim();

  let withName = 0, withPhone = 0, withEmail = 0, withAddress = 0, withPoll = 0, withPostal = 0;

  for (const row of rows) {
    const first = get("firstName", row);
    const last = get("lastName", row);
    if (first || last) withName++;
    if (get("phone", row) || get("phone2", row) || get("businessPhone", row)) withPhone++;
    if (get("email", row)) withEmail++;
    if (get("address1", row) || get("streetName", row)) withAddress++;
    if (
      get("municipalPoll", row) || get("pollDistrict", row) ||
      get("federalPoll", row) || get("provincialPoll", row)
    ) withPoll++;
    if (get("postalCode", row)) withPostal++;
  }

  const n = Math.max(1, rows.length);
  return {
    totalRows: rows.length,
    withName,
    withPhone,
    withEmail,
    withAddress,
    withPollNumber: withPoll,
    withPostalCode: withPostal,
    phonePercent: Math.round((withPhone / n) * 100),
    emailPercent: Math.round((withEmail / n) * 100),
    addressPercent: Math.round((withAddress / n) * 100),
  };
}

// ─── Preview rows ──────────────────────────────────────────────────────────────
// Return 5 sample rows mapped to human-readable field labels

function buildPreviewRows(
  sampleRows: Record<string, string>[],
  mappings: MappingResult,
): Array<Record<string, string>> {
  const t2s: Record<string, string> = {};
  const fieldLabels: Record<string, string> = {
    firstName: "First Name", lastName: "Last Name", phone: "Phone", email: "Email",
    address1: "Address", city: "City", postalCode: "Postal Code", ward: "Ward",
    municipalPoll: "Poll #", pollDistrict: "Block", municipalDistrict: "Subdivision",
    province: "Province", riding: "Riding", externalId: "Voter ID", unitApt: "Unit",
    streetNumber: "Street #", streetName: "Street", notes: "Notes",
  };

  for (const [src, m] of Object.entries(mappings)) {
    if (m.targetField && fieldLabels[m.targetField]) t2s[m.targetField] = src;
  }

  return sampleRows.slice(0, 5).map((row) => {
    const preview: Record<string, string> = {};
    for (const [target, src] of Object.entries(t2s)) {
      const val = row[src] ?? "";
      if (val.trim()) preview[fieldLabels[target]] = val.trim();
    }
    return preview;
  });
}

// ─── Route ─────────────────────────────────────────────────────────────────────

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

  if (!file) {
    return NextResponse.json({ error: "file and campaignId are required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "import:write");
  if (forbidden) return forbidden;

  const fileType = detectFileType(file.name);
  const buffer = await file.arrayBuffer();

  let parsed: Awaited<ReturnType<typeof parseAnyFile>>;
  try {
    if (fileType === "excel") {
      parsed = await parseExcelFile(buffer);
    } else {
      const text = new TextDecoder().decode(buffer);
      parsed = await parseAnyFile(text, file.name);
    }
  } catch (primaryErr) {
    // Retry: for Excel, fall back to treating as CSV (some recovered/exported files work this way)
    if (fileType === "excel") {
      try {
        const text = new TextDecoder("utf-8", { fatal: false }).decode(buffer);
        parsed = await parseAnyFile(text, file.name);
      } catch {
        return NextResponse.json(
          {
            error: `Could not read this Excel file: ${(primaryErr as Error).message}. Try saving it as CSV first: File → Save As → CSV (Comma delimited).`,
          },
          { status: 422 },
        );
      }
    } else {
      return NextResponse.json(
        { error: `Could not parse file: ${(primaryErr as Error).message}` },
        { status: 422 },
      );
    }
  }

  // Column mapping (AI-assisted)
  const suggestedMappings = await mapColumns(parsed.rawHeaders, parsed.sampleRows);

  // Format detection
  const { format: detectedFormat, confidence: formatConfidence } = detectFormat(parsed.rawHeaders);

  // If we detected a known format with a template, apply the template mappings over the AI suggestions
  let finalMappings = suggestedMappings;
  if (detectedFormat?.templateId) {
    // Load the template mappings and apply them (template mappings override AI suggestions for matched columns)
    // We do this inline since built-in templates are static
    const TEMPLATE_OVERRIDES: Record<string, Record<string, string>> = {
      "builtin-ontario-voter-file": {
        "Block": "pollDistrict",
        "Subdivision": "municipalDistrict",
        "Street Num": "streetNumber",
        "Street No.": "streetName",
        "Unit": "unitApt",
        "Last Name": "lastName",
        "First Name": "firstName",
        "Clan": "notes",
        "Prov": "province",
        "Postal Code": "postalCode",
      },
    };
    const overrides = TEMPLATE_OVERRIDES[detectedFormat.templateId] ?? {};
    const overriddenMappings: MappingResult = { ...suggestedMappings };
    for (const [sourceCol, targetField] of Object.entries(overrides)) {
      // Match case-insensitively against actual headers
      const actualHeader = parsed.rawHeaders.find(
        (h) => h.toLowerCase().replace(/[\s\.]/g, "_") === sourceCol.toLowerCase().replace(/[\s\.]/g, "_")
          || h.toLowerCase() === sourceCol.toLowerCase()
      );
      if (actualHeader) {
        overriddenMappings[actualHeader] = {
          sourceColumn: actualHeader,
          targetField,
          confidence: 99,
          method: "exact",
          alternatives: [],
        };
      }
    }
    finalMappings = overriddenMappings;
  }

  // Check if required name fields are covered
  const mappedTargets = new Set(
    Object.values(finalMappings).map((m) => m.targetField).filter(Boolean)
  );
  const hasNameField = mappedTargets.has("firstName") || mappedTargets.has("lastName");

  // Auto-confidence: can we skip the mapping step?
  const autoConfidence = computeAutoConfidence(finalMappings, hasNameField);

  // Field stats and preview
  const stats = computeFieldStats(parsed.rows, finalMappings);
  const previewRows = buildPreviewRows(parsed.sampleRows, finalMappings);

  // Duplicate count against existing contacts (quick — just check by externalId/name)
  let existingCount = 0;
  if (campaignId && parsed.rows.length > 0) {
    try {
      existingCount = await prisma.contact.count({
        where: { campaignId, deletedAt: null },
      });
    } catch {
      // Non-blocking
    }
  }

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
      suggestedMappings: finalMappings,
      warnings: parsed.warnings,
      // New intelligence fields
      detectedFormat: detectedFormat?.id ?? "unknown",
      detectedFormatLabel: detectedFormat?.label ?? null,
      detectedFormatDescription: detectedFormat?.description ?? null,
      formatConfidence,
      autoConfidence,
      hasNameField,
      fieldStats: stats,
      previewRows,
      existingContactCount: existingCount,
    },
  });
}
