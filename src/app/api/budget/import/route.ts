import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";
import Papa from "papaparse";
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
  csv: z.string().min(1),
  dryRun: z.boolean().default(false),
});

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const raw = await req.json().catch(() => null);
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: "Validation failed", details: parsed.error.flatten().fieldErrors }, { status: 400 });
  }
  const { campaignId, csv, dryRun } = parsed.data;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  // Parse CSV
  const parseResult = Papa.parse<CsvRow>(csv, { header: true, skipEmptyLines: true });
  if (parseResult.errors.length > 0) {
    return NextResponse.json(
      { error: "CSV parse failed", details: parseResult.errors.slice(0, 5).map((e) => e.message) },
      { status: 400 }
    );
  }

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

  parseResult.data.forEach((row, idx) => {
    const rowNum = idx + 2; // accounting for header
    const itemType = (row.Type ?? row.itemType ?? "").toLowerCase().trim();
    const category = (row.Category ?? row.category ?? "").trim();
    const amount = parseAmount(row.Amount ?? row.amount);
    const statusRaw = (row.Status ?? row.status ?? "approved").toLowerCase().trim();

    if (itemType !== "allocation" && itemType !== "expense") {
      errors.push({ row: rowNum, message: `Type must be "allocation" or "expense", got "${itemType}"` });
      return;
    }
    if (!category) {
      errors.push({ row: rowNum, message: "Category is required" });
      return;
    }
    if (amount === null) {
      errors.push({ row: rowNum, message: `Amount must be positive number, got "${row.Amount ?? row.amount}"` });
      return;
    }

    const status = STATUS_VALUES.includes(statusRaw as typeof STATUS_VALUES[number])
      ? (statusRaw as typeof STATUS_VALUES[number])
      : "approved";

    const tagsRaw = (row.Tags ?? row.tags ?? "").trim();
    const tags = tagsRaw ? tagsRaw.split(";").map((t) => t.trim()).filter(Boolean) : [];

    validRows.push({
      itemType,
      category,
      amount,
      status,
      vendor: (row.Vendor ?? row.vendor ?? "").trim() || null,
      paymentMethod: (row["Payment Method"] ?? row.paymentMethod ?? "").trim() || null,
      receiptNumber: (row["Receipt Number"] ?? row.receiptNumber ?? "").trim() || null,
      receiptUrl: (row["Receipt URL"] ?? row.receiptUrl ?? "").trim() || null,
      description: (row.Description ?? row.description ?? "").trim() || null,
      tags,
      incurredAt: parseDate(row["Incurred Date"] ?? row.incurredAt) ?? new Date(),
      paidAt: parseDate(row["Paid Date"] ?? row.paidAt),
    });
  });

  if (dryRun) {
    return NextResponse.json({
      data: {
        dryRun: true,
        totalRows: parseResult.data.length,
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
      totalRows: parseResult.data.length,
      imported,
      errorCount: errors.length,
      errors: errors.slice(0, 50),
    },
  });
}
