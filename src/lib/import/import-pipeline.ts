import { SupportLevel, type Contact } from "@prisma/client";
import { detectFileType, parseAnyFile, parseExcelFile } from "@/lib/import/file-parser";

export type MappingConfig = Record<string, string>;

export interface ParseAndMapResult {
  filename: string;
  fileType: "csv" | "excel" | "tsv" | "text";
  totalRows: number;
  skippedRows: number;
  rawHeaders: string[];
  sampleRows: Record<string, string>[];
  warnings: string[];
  mappedRows: Record<string, string>[];
  validRows: Record<string, string>[];
  invalidRows: { rowIndex: number; reason: string }[];
}

const VALID_SUPPORT_LEVELS = new Set(Object.values(SupportLevel));
const NICKNAME_MAP: Record<string, string> = {
  bob: "robert",
  rob: "robert",
  bobby: "robert",
  bill: "william",
  billy: "william",
  will: "william",
  liz: "elizabeth",
  beth: "elizabeth",
  mike: "michael",
  mick: "michael",
  jim: "james",
  jimmy: "james",
  kate: "katherine",
  katie: "katherine",
  chris: "christopher",
  alex: "alexander",
  andy: "andrew",
  drew: "andrew",
  steve: "steven",
  steven: "stephen",
};

function normalizeString(value: string | undefined): string {
  return value?.trim() ?? "";
}

function normalizePhone(value: string | undefined): string {
  return (value ?? "").replace(/\D/g, "").slice(-10);
}

function normalizeEmail(value: string | undefined): string {
  return (value ?? "").trim().toLowerCase();
}

function normalizeName(value: string | undefined): string {
  const cleaned = normalizeString(value).toLowerCase();
  return NICKNAME_MAP[cleaned] ?? cleaned;
}

function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const temp = row[j];
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(
        row[j] + 1,
        prev + 1,
        row[j - 1] + cost
      );
      prev = temp;
    }
    row[0] = i;
  }

  return row[b.length];
}

export async function parseAndMapImportFile(file: File, mappings: MappingConfig): Promise<ParseAndMapResult> {
  const fileType = detectFileType(file.name);
  const buffer = await file.arrayBuffer();

  const parsed = fileType === "excel"
    ? await parseExcelFile(buffer)
    : await parseAnyFile(new TextDecoder().decode(buffer), file.name);

  const mappedRows = parsed.rows.map((row) => {
    const mapped: Record<string, string> = {};
    for (const [sourceColumn, targetField] of Object.entries(mappings)) {
      if (!targetField) continue;
      mapped[targetField] = row[sourceColumn] ?? "";
    }
    return mapped;
  });

  const invalidRows: { rowIndex: number; reason: string }[] = [];
  const validRows: Record<string, string>[] = [];

  mappedRows.forEach((row, index) => {
    const firstName = normalizeString(row.firstName);
    const lastName = normalizeString(row.lastName);
    if (!firstName && !lastName) {
      invalidRows.push({ rowIndex: index + 1, reason: "Missing both firstName and lastName" });
      return;
    }
    validRows.push(row);
  });

  return {
    filename: file.name,
    fileType,
    totalRows: parsed.totalRows,
    skippedRows: parsed.skippedRows,
    rawHeaders: parsed.rawHeaders,
    sampleRows: parsed.sampleRows,
    warnings: parsed.warnings,
    mappedRows,
    validRows,
    invalidRows,
  };
}

export function toContactWriteData(row: Record<string, string>) {
  const support = normalizeString(row.supportLevel) as SupportLevel;
  const supportLevel = VALID_SUPPORT_LEVELS.has(support) ? support : SupportLevel.unknown;

  const address1 = normalizeString(row.address1)
    || [normalizeString(row.streetNumber), normalizeString(row.streetName), normalizeString(row.streetType)]
      .filter(Boolean)
      .join(" ")
    || null;

  const firstName = normalizeString(row.firstName) || "Unknown";
  const lastName = normalizeString(row.lastName) || "Unknown";

  return {
    firstName,
    lastName,
    email: normalizeString(row.email) || null,
    email2: normalizeString(row.email2) || null,
    phone: normalizeString(row.phone) || null,
    phone2: normalizeString(row.phone2) || null,
    phoneAreaCode: normalizeString(row.phoneAreaCode) || null,
    cellAreaCode: normalizeString(row.cellAreaCode) || null,
    businessPhone: normalizeString(row.businessPhone) || null,
    address1,
    city: normalizeString(row.city) || null,
    province: normalizeString(row.province) || null,
    postalCode: normalizeString(row.postalCode) || null,
    ward: normalizeString(row.ward) || null,
    riding: normalizeString(row.riding) || null,
    federalDistrict: normalizeString(row.federalDistrict) || null,
    federalPoll: normalizeString(row.federalPoll) || null,
    provincialDistrict: normalizeString(row.provincialDistrict) || null,
    provincialPoll: normalizeString(row.provincialPoll) || null,
    municipalDistrict: normalizeString(row.municipalDistrict) || null,
    municipalPoll: normalizeString(row.municipalPoll) || null,
    pollDistrict: normalizeString(row.pollDistrict) || null,
    votingLocation: normalizeString(row.votingLocation) || null,
    streetNumber: normalizeString(row.streetNumber) || null,
    streetName: normalizeString(row.streetName) || null,
    streetType: normalizeString(row.streetType) || null,
    streetDirection: normalizeString(row.streetDirection) || null,
    unitApt: normalizeString(row.unitApt) || null,
    externalId: normalizeString(row.externalId) || null,
    notes: normalizeString(row.notes) || null,
    source: normalizeString(row.source) || "import",
    preferredLanguage: normalizeString(row.preferredLanguage) || "en",
    firstChoice: normalizeString(row.firstChoice) || null,
    secondChoice: normalizeString(row.secondChoice) || null,
    supportLevel,
  };
}

export function isLikelyDuplicate(row: Record<string, string>, existing: Pick<Contact, "firstName" | "lastName" | "postalCode" | "phone" | "email" | "externalId">): boolean {
  const rowExternalId = normalizeString(row.externalId);
  const rowFirst = normalizeName(row.firstName);
  const rowLast = normalizeName(row.lastName);
  const rowPostal = normalizeString(row.postalCode).replace(/\s/g, "").toUpperCase();
  const rowPhone = normalizePhone(row.phone);
  const rowEmail = normalizeEmail(row.email);

  const existingFirst = normalizeName(existing.firstName ?? "");
  const existingLast = normalizeName(existing.lastName ?? "");
  const existingPostal = (existing.postalCode ?? "").replace(/\s/g, "").toUpperCase();
  const existingPhone = normalizePhone(existing.phone ?? "");
  const existingEmail = normalizeEmail(existing.email ?? "");

  if (rowExternalId && existing.externalId && rowExternalId === existing.externalId) {
    return true;
  }
  if (rowEmail && existingEmail && rowEmail === existingEmail) {
    return true;
  }
  if (rowPhone && existingPhone && rowPhone === existingPhone) {
    return true;
  }
  if (rowFirst && rowLast && rowFirst === existingFirst && rowLast === existingLast) {
    return !rowPostal || !existingPostal || rowPostal === existingPostal;
  }

  const firstDistance = rowFirst && existingFirst ? levenshteinDistance(rowFirst, existingFirst) : 99;
  const lastDistance = rowLast && existingLast ? levenshteinDistance(rowLast, existingLast) : 99;
  const looksLikeFuzzyNameMatch = firstDistance <= 1 && lastDistance <= 1;

  if (looksLikeFuzzyNameMatch) {
    const hasLocationMatch = !rowPostal || !existingPostal || rowPostal === existingPostal;
    const hasContactMatch = Boolean(
      (rowEmail && existingEmail && rowEmail === existingEmail)
      || (rowPhone && existingPhone && rowPhone === existingPhone)
    );
    return hasLocationMatch || hasContactMatch;
  }

  return false;
}