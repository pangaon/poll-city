import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { SupportLevel } from "@prisma/client";
import { toCSV } from "@/lib/utils";
import {
  getCampaignFields,
  getBulkContactCustomFields,
  getCustomFieldCsvHeaders,
  parseCustomFieldFromCsv,
  setContactCustomFields,
} from "@/lib/db/custom-fields";

const VALID_SUPPORT_LEVELS = Object.values(SupportLevel);
const MAX_IMPORT_ROWS = 5000;

function normalizeHeaderKey(key: string): string {
  const cleaned = key.replace(/^\uFEFF/, "").trim().toLowerCase();
  const compact = cleaned.replace(/[^a-z0-9]/g, "");
  const aliases: Record<string, string> = {
    firstname: "firstName",
    lastname: "lastName",
    email: "email",
    phone: "phone",
    address: "address1",
    address1: "address1",
    address2: "address2",
    city: "city",
    province: "province",
    postalcode: "postalCode",
    postcode: "postalCode",
    ward: "ward",
    riding: "riding",
    supportlevel: "supportLevel",
    issues: "issues",
    signrequested: "signRequested",
    volunteerinterest: "volunteerInterest",
    donotcontact: "doNotContact",
    notes: "notes",
    tags: "tags",
    lastcontactedat: "lastContactedAt",
  };
  return aliases[compact] ?? key.trim();
}

function normalizeImportRow(row: Record<string, string>): Record<string, string> {
  const normalized: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    normalized[normalizeHeaderKey(key)] = value;
  }
  return normalized;
}

function parseBoolean(value?: string | null): boolean {
  const normalized = value?.trim().toLowerCase();
  return normalized === "yes" || normalized === "true" || normalized === "1" || normalized === "y";
}

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  const type = sp.get("type") ?? "contacts";

  if (!campaignId) return NextResponse.json({ error: "campaignId is required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  if (type !== "contacts") {
    return NextResponse.json({ error: "Invalid export type" }, { status: 400 });
  }

  const contacts = await prisma.contact.findMany({
    where: { campaignId },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    include: { tags: { include: { tag: true } } },
  });

  const campaignFields = await getCampaignFields(campaignId);
  const contactIds = contacts.map((c) => c.id);
  const customValues = await getBulkContactCustomFields(contactIds, campaignFields);
  const customHeaders = await getCustomFieldCsvHeaders(campaignId);

  const csvRows = contacts.map((c) => {
    const row: Record<string, string> = {
      firstName: c.firstName,
      lastName: c.lastName,
      email: c.email ?? "",
      phone: c.phone ?? "",
      address1: c.address1 ?? "",
      address2: c.address2 ?? "",
      city: c.city ?? "",
      province: c.province ?? "",
      postalCode: c.postalCode ?? "",
      ward: c.ward ?? "",
      riding: c.riding ?? "",
      supportLevel: c.supportLevel,
      issues: c.issues.join(";"),
      signRequested: c.signRequested ? "yes" : "no",
      volunteerInterest: c.volunteerInterest ? "yes" : "no",
      doNotContact: c.doNotContact ? "yes" : "no",
      notes: c.notes ?? "",
      tags: c.tags.map((t) => t.tag.name).join(";"),
      lastContactedAt: c.lastContactedAt?.toISOString() ?? "",
    };

    for (const field of campaignFields) {
      const value = customValues[c.id]?.[field.key];
      row[field.key] = value === null || value === undefined
        ? ""
        : Array.isArray(value)
          ? value.join(";")
          : typeof value === "boolean"
            ? value ? "yes" : "no"
            : String(value);
    }

    return row;
  });

  const csv = toCSV(
    csvRows,
    [
      { key: "firstName", label: "First Name" },
      { key: "lastName", label: "Last Name" },
      { key: "email", label: "Email" },
      { key: "phone", label: "Phone" },
      { key: "address1", label: "Address" },
      { key: "address2", label: "Address 2" },
      { key: "city", label: "City" },
      { key: "province", label: "Province" },
      { key: "postalCode", label: "Postal Code" },
      { key: "ward", label: "Ward" },
      { key: "riding", label: "Riding" },
      { key: "supportLevel", label: "Support Level" },
      { key: "issues", label: "Issues (semicolon-separated)" },
      { key: "signRequested", label: "Sign Requested" },
      { key: "volunteerInterest", label: "Volunteer Interest" },
      { key: "doNotContact", label: "Do Not Contact" },
      { key: "notes", label: "Notes" },
      { key: "tags", label: "Tags" },
      { key: "lastContactedAt", label: "Last Contacted At" },
      ...customHeaders,
    ] as { key: keyof (typeof csvRows)[number]; label: string }[]
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="contacts-${campaignId}-${Date.now()}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const contentLength = Number(req.headers.get("content-length") ?? "0");
  if (contentLength > 10_000_000) {
    return NextResponse.json({ error: "Payload too large. Maximum 10MB." }, { status: 413 });
  }

  let body: { campaignId: string; rows: Record<string, string>[] };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const { campaignId, rows } = body;
  if (!campaignId || !Array.isArray(rows)) {
    return NextResponse.json({ error: "campaignId and rows array are required" }, { status: 400 });
  }
  if (rows.length > MAX_IMPORT_ROWS) {
    return NextResponse.json({ error: `Import too large. Max ${MAX_IMPORT_ROWS} rows per request.` }, { status: 413 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const campaignFields = await getCampaignFields(campaignId);
  const fieldMap = new Map(campaignFields.map((field) => [field.key, field]));

  const results = { imported: 0, skipped: 0, errors: [] as string[] };

  for (let i = 0; i < rows.length; i++) {
    const row = normalizeImportRow(rows[i]);
    const firstName = row.firstName?.trim();
    const lastName = row.lastName?.trim();

    if (!firstName || !lastName) {
      results.errors.push(`Row ${i + 2}: firstName and lastName are required`);
      results.skipped++;
      continue;
    }

    const supportLevel = VALID_SUPPORT_LEVELS.includes(row.supportLevel as SupportLevel)
      ? (row.supportLevel as SupportLevel)
      : SupportLevel.unknown;

    const customFieldUpdates: Record<string, string | number | boolean | string[] | null> = {};
    for (const [key, rawValue] of Object.entries(row)) {
      const field = fieldMap.get(key);
      if (!field) continue;
      customFieldUpdates[key] = parseCustomFieldFromCsv(field.fieldType, rawValue ?? "");
    }

    try {
      const created = await prisma.contact.create({
        data: {
          campaignId,
          firstName,
          lastName,
          email: row.email?.trim() || null,
          phone: row.phone?.trim() || null,
          address1: row.address1?.trim() || null,
          address2: row.address2?.trim() || null,
          city: row.city?.trim() || null,
          province: row.province?.trim() || null,
          postalCode: row.postalCode?.trim() || null,
          ward: row.ward?.trim() || null,
          riding: row.riding?.trim() || null,
          supportLevel,
          notes: row.notes?.trim() || null,
          issues: row.issues ? row.issues.split(";").map((s) => s.trim()).filter(Boolean) : [],
          signRequested: parseBoolean(row.signRequested),
          volunteerInterest: parseBoolean(row.volunteerInterest),
          doNotContact: parseBoolean(row.doNotContact),
          importSource: "csv",
        },
      });

      if (Object.keys(customFieldUpdates).length > 0) {
        await setContactCustomFields(created.id, campaignId, customFieldUpdates);
      }

      results.imported++;
    } catch (e) {
      results.errors.push(`Row ${i + 2}: ${(e as Error).message}`);
      results.skipped++;
    }
  }

  await prisma.activityLog.create({
    data: {
      campaignId,
      userId: session!.user.id,
      action: "imported_contacts",
      entityType: "campaign",
      entityId: campaignId,
      details: { imported: results.imported, skipped: results.skipped, rowCount: rows.length },
    },
  });

  return NextResponse.json({ data: results });
}
