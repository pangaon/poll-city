import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

interface CsvRow {
  name: string;
  address?: string;
  municipality?: string;
  ward?: string;
  district?: string;
  pollNumber?: string;
  expectedTurnout?: string;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().replace(/^"|"$/g, "").toLowerCase());
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cells = lines[i].split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = cells[idx] ?? "";
    });

    if (!row["name"] && !row["location"] && !row["poll"]) continue;

    rows.push({
      name: row["name"] || row["location"] || row["poll"] || `Location ${i}`,
      address: row["address"] || undefined,
      municipality: row["municipality"] || row["city"] || undefined,
      ward: row["ward"] || undefined,
      district: row["district"] || undefined,
      pollNumber: row["poll_number"] || row["poll #"] || row["number"] || undefined,
      expectedTurnout: row["expected_turnout"] || row["turnout"] || undefined,
    });
  }

  return rows;
}

export async function POST(req: NextRequest, { params }: { params: { eventId: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const event = await prisma.captureEvent.findFirst({
    where: { id: params.eventId, deletedAt: null },
    select: { campaignId: true },
  });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: event.campaignId } },
    select: { status: true, role: true },
  });
  if (!membership || membership.status !== "active") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  if (!["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const contentType = req.headers.get("content-type") ?? "";
  let csvText: string;

  if (contentType.includes("multipart/form-data")) {
    const formData = await req.formData().catch(() => null);
    const file = formData?.get("file") as File | null;
    if (!file) return NextResponse.json({ error: "No file provided" }, { status: 400 });
    if (file.size > 5 * 1024 * 1024) return NextResponse.json({ error: "File too large (max 5MB)" }, { status: 400 });
    csvText = await file.text();
  } else {
    const body = await req.json().catch(() => null);
    if (!body?.csv) return NextResponse.json({ error: "csv field required" }, { status: 400 });
    csvText = body.csv as string;
  }

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return NextResponse.json({ error: "No valid rows found in CSV" }, { status: 400 });
  }
  if (rows.length > 500) {
    return NextResponse.json({ error: "Maximum 500 locations per import" }, { status: 400 });
  }

  const dryRun = req.nextUrl.searchParams.get("dryRun") === "true";

  // Validate rows
  const errors: { row: number; error: string }[] = [];
  const validRows: CsvRow[] = [];

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (!row.name || row.name.length > 300) {
      errors.push({ row: i + 2, error: "name is required and must be under 300 characters" });
      continue;
    }
    validRows.push(row);
  }

  if (dryRun) {
    return NextResponse.json({
      valid: validRows.length,
      errors,
      preview: validRows.slice(0, 5),
    });
  }

  // Dedupe against existing locations in this event
  const existing = await prisma.captureLocation.findMany({
    where: { eventId: params.eventId },
    select: { name: true, pollNumber: true },
  });
  const existingNames = new Set(existing.map((e) => e.name.toLowerCase()));
  const existingPolls = new Set(existing.map((e) => e.pollNumber).filter(Boolean));

  const toCreate = validRows.filter((row) => {
    if (existingNames.has(row.name.toLowerCase())) return false;
    if (row.pollNumber && existingPolls.has(row.pollNumber)) return false;
    return true;
  });

  const skipped = validRows.length - toCreate.length;
  const now = new Date();

  const created = await prisma.captureLocation.createMany({
    data: toCreate.map((row) => ({
      eventId: params.eventId,
      campaignId: event.campaignId,
      name: row.name,
      address: row.address ?? null,
      municipality: row.municipality ?? null,
      ward: row.ward ?? null,
      district: row.district ?? null,
      pollNumber: row.pollNumber ?? null,
      expectedTurnout: row.expectedTurnout ? parseInt(row.expectedTurnout, 10) || null : null,
      importedAt: now,
    })),
    skipDuplicates: true,
  });

  return NextResponse.json({
    created: created.count,
    skipped,
    errors,
    total: rows.length,
  });
}
