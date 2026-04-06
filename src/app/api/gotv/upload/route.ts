import { NextRequest, NextResponse } from "next/server";
import { apiAuth, requirePermission } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import { parseAnyFile, parseExcelFile, detectFileType } from "@/lib/import/file-parser";
import { matchLists } from "@/lib/import/fuzzy-matcher";
import { SupportLevel } from "@prisma/client";

const SUPPORTER_LEVELS = [SupportLevel.strong_support, SupportLevel.leaning_support];
const MAX_UPLOAD_BYTES = 5_000_000;
const MAX_ROWS = 50_000;

const FIRST_NAME_KEYS = ["first_name", "fname", "first name", "first_nm"];
const LAST_NAME_KEYS = ["last_name", "lname", "last name", "last_nm"];
const ADDRESS_KEYS = ["address", "addr"];
const EXTERNAL_ID_KEYS = ["voter_id", "id", "elector_id"];

function normalizeHeader(input: string): string {
  return input.toLowerCase().trim().replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
}

function pickValue(row: Record<string, string>, keys: string[]): string {
  const normalized = new Map<string, string>();
  for (const [k, v] of Object.entries(row)) {
    normalized.set(normalizeHeader(k), v ?? "");
  }

  for (const key of keys) {
    const value = normalized.get(normalizeHeader(key));
    if (value && value.trim()) return value;
  }
  return "";
}

function sanitizeText(value: string, maxLength: number): string {
  return value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function isValidRowShape(row: { firstName: string; lastName: string; address: string; externalId: string }): boolean {
  if (row.externalId) return true;
  if (row.firstName && row.lastName) return true;
  if (row.lastName && row.address) return true;
  return false;
}

function hasExpectedColumns(rawHeaders: string[]): boolean {
  const headers = new Set(rawHeaders.map(normalizeHeader));

  const hasFirst = FIRST_NAME_KEYS.some((k) => headers.has(normalizeHeader(k)));
  const hasLast = LAST_NAME_KEYS.some((k) => headers.has(normalizeHeader(k)));
  const hasAddress = ADDRESS_KEYS.some((k) => headers.has(normalizeHeader(k)));
  const hasExternal = EXTERNAL_ID_KEYS.some((k) => headers.has(normalizeHeader(k)));

  return hasExternal || (hasFirst && hasLast) || (hasLast && hasAddress);
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const permError = requirePermission(session!.user.role as string, "gotv:write");
  if (permError) return permError;

  // File size guard: reject requests over 5MB before parsing
  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 5MB for GOTV lists." }, { status: 413 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File;
  const campaignId = formData.get("campaignId") as string;
  const name = (formData.get("name") as string) ?? `Upload ${new Date().toLocaleTimeString()}`;

  if (!file || !campaignId) return NextResponse.json({ error: "file and campaignId required" }, { status: 400 });

  const fileType = detectFileType(file.name);
  if (!["csv", "excel", "tsv", "text"].includes(fileType)) {
    return NextResponse.json({ error: "Unsupported file type. Use CSV, TSV, TXT, XLS, or XLSX." }, { status: 400 });
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json({ error: "File too large. Maximum size is 5MB for GOTV lists." }, { status: 413 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Parse the voted list file
  const buffer = await file.arrayBuffer();
  const parsed = fileType === "excel"
    ? await parseExcelFile(buffer)
    : await parseAnyFile(new TextDecoder().decode(buffer), file.name);

  if (!hasExpectedColumns(parsed.rawHeaders)) {
    return NextResponse.json(
      {
        error: "GOTV file is missing required columns. Include voter_id, or a name/address combination.",
      },
      { status: 400 }
    );
  }

  if (parsed.rows.length > MAX_ROWS) {
    return NextResponse.json(
      { error: `File has too many rows (${parsed.rows.length}). Maximum supported rows: ${MAX_ROWS}.` },
      { status: 413 }
    );
  }

  // Build voted records from parsed file
  const votedRecords = parsed.rows
    .map((row) => {
      const firstName = sanitizeText(pickValue(row, FIRST_NAME_KEYS), 80);
      const lastName = sanitizeText(pickValue(row, LAST_NAME_KEYS), 80);
      const address = sanitizeText(pickValue(row, ADDRESS_KEYS), 200);
      const externalId = sanitizeText(pickValue(row, EXTERNAL_ID_KEYS), 120);
      return { firstName, lastName, address, externalId };
    })
    .filter(isValidRowShape);

  if (votedRecords.length === 0) {
    return NextResponse.json(
      {
        error: "No valid GOTV rows found. Provide voter_id or enough identity fields to match records.",
      },
      { status: 400 }
    );
  }

  // Load our supporters from DB
  const supporters = await prisma.contact.findMany({
    where: { campaignId, supportLevel: { in: SUPPORTER_LEVELS }, isDeceased: false },
    select: { id: true, firstName: true, lastName: true, address1: true, streetNumber: true, streetName: true, postalCode: true, phone: true, externalId: true },
  });

  // Fuzzy match voted list against our supporters
  const matchResults = await matchLists(
    votedRecords.map(r => ({ firstName: r.firstName, lastName: r.lastName, address1: r.address, externalId: r.externalId })),
    supporters.map(s => ({ id: s.id, firstName: s.firstName, lastName: s.lastName, address1: s.address1 ?? "", streetNumber: s.streetNumber ?? "", streetName: s.streetName ?? "", postalCode: s.postalCode ?? "", externalId: s.externalId ?? "" })),
    { autoMergeThreshold: 80, reviewThreshold: 60, useAI: false, preferExisting: true }
  );

  // Create batch record
  const batch = await prisma.gotvBatch.create({
    data: {
      campaignId,
      name,
      uploadedById: session!.user.id,
      totalRecords: votedRecords.length,
      sourceFile: file.name,
    },
  });

  let matchedCount = 0;
  let struckCount = 0;

  // Process matches
  for (let i = 0; i < matchResults.length; i++) {
    const result = matchResults[i];
    const voted = votedRecords[i];
    const matchedContact = result.action === "auto_merge" ? supporters.find(s => s.id === (result.recordB as any).id) : null;

    await prisma.gotvRecord.create({
      data: {
        batchId: batch.id,
        contactId: matchedContact?.id ?? null,
        firstName: voted.firstName,
        lastName: voted.lastName,
        address: voted.address,
        externalId: voted.externalId || null,
        hasVoted: true,
        matchScore: result.score,
      },
    });

    if (matchedContact) {
      matchedCount++;
      // Strike off — mark as voted in our DB
      await prisma.contact.update({
        where: { id: matchedContact.id },
        data: { gotvStatus: "voted" },
      });
      struckCount++;
    }
  }

  // Update batch totals
  await prisma.gotvBatch.update({
    where: { id: batch.id },
    data: { matchedCount, struckCount },
  });

  return NextResponse.json({ data: { batchId: batch.id, totalRecords: votedRecords.length, matchedCount, struckCount } });
}
