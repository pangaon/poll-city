import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import Papa from "papaparse";
import * as XLSX from "xlsx";
import { z } from "zod";

export const dynamic = "force-dynamic";

const STATUS_VALUES = ["pending", "approved", "paid", "rejected", "reconciled"] as const;

interface CsvRow {
  Type?: string;
  itemType?: string;
  Category?: string;
  category?: string;
  Amount?: string;
  amount?: string;
  Status?: string;
  status?: string;
  Vendor?: string;
  vendor?: string;
  "Payment Method"?: string;
  paymentMethod?: string;
  "Receipt Number"?: string;
  receiptNumber?: string;
  "Receipt URL"?: string;
  receiptUrl?: string;
  Description?: string;
  description?: string;
  Tags?: string;
  tags?: string;
  "Incurred Date"?: string;
  incurredAt?: string;
  "Paid Date"?: string;
  paidAt?: string;
}

function parseAmount(val: string | undefined): number | null {
  if (!val) return null;
  const cleaned = val.replace(/[$,\s]/g, "").trim();
  if (cleaned === "") return null;
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDate(val: string | undefined): Date | null {
  if (!val || !val.trim()) return null;
  const d = new Date(val.trim());
  return isNaN(d.getTime()) ? null : d;
}

const bodySchema = z.object({
  campaignId: z.string().min(1),
  csv: z.string().min(1).optional(),
  dryRun: z.boolean().default(false),
});

type GenericRow = Record<string, unknown>;

function readCell(row: GenericRow, keys: string[]): string | undefined {
  for (const key of keys) {
    const exact = row[key];
    if (exact !== undefined && exact !== null) return String(exact);

    const matchedKey = Object.keys(row).find((k) => k.toLowerCase() === key.toLowerCase());
    if (matchedKey) {
      const value = row[matchedKey];
      if (value !== undefined && value !== null) return String(value);
    }
  }
  return undefined;
}

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const contentType = req.headers.get("content-type") || "";

  let campaignId = "";
  let dryRun = false;
  let parsedRows: GenericRow[] = [];
  let totalRows = 0;

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    campaignId = String(form.get("campaignId") ?? "").trim();
    dryRun = String(form.get("dryRun") ?? "false").toLowerCase() === "true";
    const file = form.get("file");

    if (!campaignId) {
      return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "file is required" }, { status: 400 });
    }

    const fileName = file.name.toLowerCase();
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    if (fileName.endsWith(".xlsx") || fileName.endsWith(".xls")) {
      const workbook = XLSX.read(buffer, { type: "buffer" });
      const firstSheetName = workbook.SheetNames[0];
      if (!firstSheetName) {
        return NextResponse.json({ error: "Excel file has no sheets" }, { status: 400 });
      }
      const sheet = workbook.Sheets[firstSheetName];
      parsedRows = XLSX.utils.sheet_to_json<GenericRow>(sheet, { defval: "" });
    } else {
      const text = buffer.toString("utf-8");
      const parseResult = Papa.parse<GenericRow>(text, { header: true, skipEmptyLines: true });
      if (parseResult.errors.length > 0) {
        return NextResponse.json(
          { error: "CSV parse failed", details: parseResult.errors.slice(0, 5).map((e) => e.message) },
          { status: 400 }
        );
      }
      parsedRows = parseResult.data;
    }

    totalRows = parsedRows.length;
  } else {
    const raw = await req.json().catch(() => null);
    const parsed = bodySchema.safeParse(raw);
    if (!parsed.success || !parsed.data.csv) {
      return NextResponse.json({ error: "Validation failed", details: parsed.error?.flatten().fieldErrors }, { status: 400 });
    }

    campaignId = parsed.data.campaignId;
    dryRun = parsed.data.dryRun;

    const parseResult = Papa.parse<GenericRow>(parsed.data.csv, { header: true, skipEmptyLines: true });
    if (parseResult.errors.length > 0) {
      return NextResponse.json(
        { error: "CSV parse failed", details: parseResult.errors.slice(0, 5).map((e) => e.message) },
        { status: 400 }
      );
    }
    parsedRows = parseResult.data;
    totalRows = parsedRows.length;
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const errors: Array<{ row: number; message: string }> = [];
  const validRows: Array<{
    itemType: "allocation" | "expense";
    category: string;
    amount: number;
    status: (typeof STATUS_VALUES)[number];
    vendor: string | null;
    paymentMethod: string | null;
    receiptNumber: string | null;
    receiptUrl: string | null;
    description: string | null;
    tags: string[];
    incurredAt: Date;
    paidAt: Date | null;
  }> = [];

  parsedRows.forEach((rawRow, idx) => {
    const rowNum = idx + 2; // accounting for header
    const row = rawRow as CsvRow;
    const itemType = (readCell(rawRow, ["Type", "itemType"]) ?? row.Type ?? row.itemType ?? "")
      .toLowerCase()
      .trim();
    const category = (readCell(rawRow, ["Category", "category"]) ?? row.Category ?? row.category ?? "").trim();
    const amountValue = readCell(rawRow, ["Amount", "amount"]) ?? row.Amount ?? row.amount;
    const amount = parseAmount(amountValue);
    const statusRaw = (readCell(rawRow, ["Status", "status"]) ?? row.Status ?? row.status ?? "approved")
      .toLowerCase()
      .trim();

    if (itemType !== "allocation" && itemType !== "expense") {
      errors.push({ row: rowNum, message: `Type must be "allocation" or "expense", got "${itemType}"` });
      return;
    }
    if (!category) {
      errors.push({ row: rowNum, message: "Category is required" });
      return;
    }
    if (amount === null) {
      errors.push({ row: rowNum, message: `Amount must be positive number, got "${amountValue}"` });
      return;
    }

    const status = STATUS_VALUES.includes(statusRaw as typeof STATUS_VALUES[number])
      ? (statusRaw as typeof STATUS_VALUES[number])
      : "approved";

    const tagsRaw = (readCell(rawRow, ["Tags", "tags"]) ?? row.Tags ?? row.tags ?? "").trim();
    const tags = tagsRaw ? tagsRaw.split(";").map((t) => t.trim()).filter(Boolean) : [];

    validRows.push({
      itemType,
      category,
      amount,
      status,
      vendor: (readCell(rawRow, ["Vendor", "vendor"]) ?? row.Vendor ?? row.vendor ?? "").trim() || null,
      paymentMethod:
        (readCell(rawRow, ["Payment Method", "paymentMethod"]) ?? row["Payment Method"] ?? row.paymentMethod ?? "")
          .trim() || null,
      receiptNumber:
        (readCell(rawRow, ["Receipt Number", "receiptNumber"]) ?? row["Receipt Number"] ?? row.receiptNumber ?? "")
          .trim() || null,
      receiptUrl:
        (readCell(rawRow, ["Receipt URL", "receiptUrl"]) ?? row["Receipt URL"] ?? row.receiptUrl ?? "").trim() ||
        null,
      description: (readCell(rawRow, ["Description", "description"]) ?? row.Description ?? row.description ?? "").trim() || null,
      tags,
      incurredAt: parseDate(readCell(rawRow, ["Incurred Date", "incurredAt"]) ?? row["Incurred Date"] ?? row.incurredAt) ?? new Date(),
      paidAt: parseDate(readCell(rawRow, ["Paid Date", "paidAt"]) ?? row["Paid Date"] ?? row.paidAt),
    });
  });

  if (dryRun) {
    return NextResponse.json({
      data: {
        dryRun: true,
        totalRows,
        validCount: validRows.length,
        errorCount: errors.length,
        errors: errors.slice(0, 50),
        preview: validRows.slice(0, 10),
      },
    });
  }

  // Execute insert in batches
  let imported = 0;
  for (const row of validRows) {
    try {
      await prisma.budgetItem.create({
        data: {
          campaignId,
          itemType: row.itemType,
          category: row.category,
          amount: row.amount,
          status: row.status,
          vendor: row.vendor,
          paymentMethod: row.paymentMethod,
          receiptNumber: row.receiptNumber,
          receiptUrl: row.receiptUrl,
          description: row.description,
          tags: row.tags,
          incurredAt: row.incurredAt,
          paidAt: row.paidAt,
          approvedById: row.status === "approved" || row.status === "paid" ? session!.user.id : null,
        },
      });
      imported++;
    } catch (e) {
      errors.push({ row: imported + 2, message: (e as Error).message });
    }
  }

  return NextResponse.json({
    data: {
      dryRun: false,
      totalRows,
      imported,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    },
  });
}
