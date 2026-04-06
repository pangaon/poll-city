/**
 * Hardened budget XLSX/CSV parser for real-world campaign finance files.
 *
 * Handles every pattern campaign managers actually upload:
 *   - Hierarchical category headers mixed with data rows
 *   - Formula cells (=SUM(...)) — skipped
 *   - "nil" amounts — parsed as 0.00
 *   - Nested payment rows (parent total + child payment details)
 *   - Currency strings like "$3,756.22"
 *   - Notes preserved exactly
 *   - Multiple sheets (first sheet or "Expenses"/"Budget")
 *   - Blank rows — skipped
 *   - Summary/total rows — skipped
 *   - Spending limit rows — extracted as metadata
 *   - Post-election dates — flagged
 *   - Mixed date formats (Date, string, Excel serial, null)
 *   - Non-numeric amounts — logged warning and skipped row (never crash)
 */

import * as XLSX from "xlsx";
import Papa from "papaparse";

export function checkFileSafety(buffer: Buffer, maxSizeMB: number = 50): void {
  const sizeInMB = buffer.length / (1024 * 1024);
  if (sizeInMB > maxSizeMB) {
    throw new Error(`File too large: ${sizeInMB.toFixed(1)}MB. Maximum is ${maxSizeMB}MB.`);
  }
}

export interface ParsedBudgetItem {
  category: string;
  description: string;
  quantity: number | null;
  amount: number;
  paymentReference: string | null;
  date: Date | null;
  notes: string | null;
  isParent: boolean;
  isPaymentDetail: boolean;
  parentDescription: string | null;
  postElection: boolean;
}

export interface ParsedBudget {
  items: ParsedBudgetItem[];
  spendingLimit: number | null;
  partyExpenseLimit: number | null;
  sheetUsed: string;
  warnings: string[];
  totalRows: number;
  skippedRows: number;
  categoryBreakdown: Record<string, { count: number; total: number }>;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const PREFERRED_SHEET_NAMES = ["expenses", "budget", "campaign expenses", "actuals"];

const SKIP_ROW_KEYWORDS = [
  "total", "subtotal", "grand total", "sub-total", "sub total", "sum",
];

const SPENDING_LIMIT_KEYWORDS = [
  "spending limit", "campaign spending limit", "expense limit",
  "general spending limit", "maximum spending",
];

const PARTY_LIMIT_KEYWORDS = [
  "party expense limit", "party spending limit", "party limit",
];

/** Parse an amount cell — handles strings, numbers, "nil", currency symbols, null. */
function parseAmount(value: unknown): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Math.round(value * 100) / 100;
  }
  const str = String(value).trim().toLowerCase();
  if (!str) return null;
  if (str === "nil" || str === "none" || str === "n/a" || str === "-" || str === "—") return 0;
  if (str.startsWith("=")) return null; // formula cell
  // Strip currency, commas, whitespace
  const cleaned = str.replace(/[$,\s]/g, "").replace(/[()]/g, ""); // also strip parens for negatives
  const n = parseFloat(cleaned);
  if (!Number.isFinite(n)) return null;
  // Handle paren-wrapped negatives
  const negative = /^\(.*\)$/.test(str.replace(/\s/g, ""));
  return Math.round((negative ? -n : n) * 100) / 100;
}

/** Parse a date cell — handles Date objects, strings, Excel serials, null. */
function parseDate(value: unknown): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    // Excel serial date: days since 1900-01-01, with Lotus 1-2-3 leap year bug
    if (value < 1 || value > 2958465) return null;
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const ms = value * 86400 * 1000;
    return new Date(excelEpoch.getTime() + ms);
  }
  const str = String(value).trim();
  if (!str) return null;
  const d = new Date(str);
  return isNaN(d.getTime()) ? null : d;
}

/** Check if a row is completely blank. */
function isBlankRow(row: unknown[]): boolean {
  return row.every((cell) => cell === null || cell === undefined || String(cell).trim() === "");
}

/** Check if a row is a summary/total row. */
function isSummaryRow(firstCell: unknown): boolean {
  if (!firstCell) return false;
  const str = String(firstCell).trim().toLowerCase();
  return SKIP_ROW_KEYWORDS.some((kw) => str === kw || str.startsWith(kw + " ") || str.startsWith(kw + ":"));
}

/** Check if first cell is a spending limit indicator. */
function spendingLimitType(firstCell: unknown): "spending" | "party" | null {
  if (!firstCell) return null;
  const str = String(firstCell).trim().toLowerCase();
  if (PARTY_LIMIT_KEYWORDS.some((kw) => str.includes(kw))) return "party";
  if (SPENDING_LIMIT_KEYWORDS.some((kw) => str.includes(kw))) return "spending";
  return null;
}

/** Check if a row looks like a category header: text in col A, no amount in col C. */
function isCategoryHeader(row: unknown[]): boolean {
  const [first, , third] = row;
  if (!first || String(first).trim() === "") return false;
  const firstStr = String(first).trim();
  // Single word or short phrase, no digits
  if (firstStr.length > 60) return false;
  if (/^\d/.test(firstStr)) return false; // starts with digit (likely a data row)
  const amount = parseAmount(third);
  return amount === null || amount === 0;
}

/** Detect if row is a payment detail (child of a parent expense). */
function isPaymentDetailRow(row: unknown[], parentDescription: string | null): boolean {
  if (!parentDescription) return false;
  const [first, , third, fourth] = row;
  if (!first) return false;
  const firstStr = String(first).trim();
  // Payment detail often has parent name + number/suffix + payment ref in col 4
  if (fourth && String(fourth).trim().length > 0 && String(fourth).match(/cheque|e-transfer|transfer|cash|credit|invoice/i)) {
    return true;
  }
  // Parent description as prefix with numeric suffix
  const amount = parseAmount(third);
  if (amount !== null && amount > 0 && firstStr.toLowerCase().startsWith(parentDescription.toLowerCase().slice(0, 15))) {
    return true;
  }
  return false;
}

// ─── Main parser ─────────────────────────────────────────────────────────────

export function parseBudgetXlsx(buffer: Buffer, electionDate?: Date): ParsedBudget {
  checkFileSafety(buffer, 50);

  const warnings: string[] = [];
  const items: ParsedBudgetItem[] = [];
  const categoryBreakdown: Record<string, { count: number; total: number }> = {};
  let spendingLimit: number | null = null;
  let partyExpenseLimit: number | null = null;

  let rows: unknown[][] = [];
  let sheetUsed = "(none)";
  let totalRows = 0;
  let skippedRows = 0;

  // Detect format
  const firstBytes = buffer.slice(0, 8).toString("hex");
  const isXlsx = firstBytes.startsWith("504b0304") || firstBytes.startsWith("d0cf11e0"); // ZIP or OLE2

  if (isXlsx) {
    let workbook: XLSX.WorkBook;
    try {
      workbook = XLSX.read(buffer, { type: "buffer", cellDates: true });
    } catch (e) {
      return {
        items: [], spendingLimit: null, partyExpenseLimit: null,
        sheetUsed: "(error)", warnings: [`Could not read Excel file: ${(e as Error).message}`],
        totalRows: 0, skippedRows: 0, categoryBreakdown: {},
      };
    }

    // Find best sheet
    const sheetNames = workbook.SheetNames;
    if (sheetNames.length === 0) {
      return {
        items: [], spendingLimit: null, partyExpenseLimit: null,
        sheetUsed: "(none)", warnings: ["Excel file has no sheets"],
        totalRows: 0, skippedRows: 0, categoryBreakdown: {},
      };
    }

    let chosenSheet = sheetNames[0];
    for (const name of sheetNames) {
      const lower = name.toLowerCase();
      if (PREFERRED_SHEET_NAMES.some((p) => lower.includes(p))) {
        chosenSheet = name;
        break;
      }
    }
    sheetUsed = chosenSheet;
    const sheet = workbook.Sheets[chosenSheet];
    rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, defval: null, raw: false });
  } else {
    // CSV
    const text = buffer.toString("utf-8");
    const parseResult = Papa.parse<unknown[]>(text, { header: false, skipEmptyLines: false });
    if (parseResult.errors.length > 0) {
      warnings.push(`CSV parse warnings: ${parseResult.errors.slice(0, 3).map((e) => e.message).join("; ")}`);
    }
    rows = parseResult.data;
    sheetUsed = "csv";
  }

  totalRows = rows.length;

  let currentCategory = "Uncategorized";
  let lastParentDescription: string | null = null;

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 1;

    // Skip blank rows
    if (isBlankRow(row)) {
      skippedRows++;
      continue;
    }

    // Column layout assumption: [description, quantity, amount, paymentRef, date, notes]
    // This tolerates shifts by using indices defensively.
    const [colA, colB, colC, colD, colE, colF] = row;

    // Skip summary/total rows
    if (isSummaryRow(colA)) {
      skippedRows++;
      continue;
    }

    // Extract spending limits
    const limitType = spendingLimitType(colA);
    if (limitType) {
      const limitAmount = parseAmount(colC) ?? parseAmount(colB);
      if (limitAmount !== null) {
        if (limitType === "spending") spendingLimit = limitAmount;
        if (limitType === "party") partyExpenseLimit = limitAmount;
      }
      skippedRows++;
      continue;
    }

    // Detect category header
    if (isCategoryHeader(row)) {
      currentCategory = String(colA).trim();
      lastParentDescription = null;
      continue;
    }

    // Parse amount
    const rawAmount = colC;
    if (typeof rawAmount === "string" && rawAmount.trim().startsWith("=")) {
      warnings.push(`Row ${rowNum}: skipped formula cell (${rawAmount})`);
      skippedRows++;
      continue;
    }
    const amount = parseAmount(rawAmount);
    if (amount === null) {
      warnings.push(`Row ${rowNum}: could not parse amount "${String(rawAmount)}"`);
      skippedRows++;
      continue;
    }

    const description = colA ? String(colA).trim() : "";
    if (!description) {
      skippedRows++;
      continue;
    }

    // Detect payment detail
    const isPaymentDetail = isPaymentDetailRow(row, lastParentDescription);
    const isParent = !isPaymentDetail && amount > 0;

    const notes = colF ? String(colF).trim() || null : null;
    const paymentReference = colD ? String(colD).trim() || null : null;
    const quantity = colB !== null && colB !== undefined ? parseAmount(colB) : null;
    const date = parseDate(colE);
    const postElection = !!(date && electionDate && date.getTime() > electionDate.getTime());

    const item: ParsedBudgetItem = {
      category: currentCategory,
      description,
      quantity,
      amount,
      paymentReference,
      date,
      notes,
      isParent,
      isPaymentDetail,
      parentDescription: isPaymentDetail ? lastParentDescription : null,
      postElection,
    };

    items.push(item);

    // Track for breakdown
    if (!isPaymentDetail) {
      if (!categoryBreakdown[currentCategory]) categoryBreakdown[currentCategory] = { count: 0, total: 0 };
      categoryBreakdown[currentCategory].count++;
      categoryBreakdown[currentCategory].total += amount;
    }

    if (isParent) {
      lastParentDescription = description;
    }
  }

  return {
    items,
    spendingLimit,
    partyExpenseLimit,
    sheetUsed,
    warnings,
    totalRows,
    skippedRows,
    categoryBreakdown,
  };
}
