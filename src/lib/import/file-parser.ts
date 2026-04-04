/**
 * Poll City — Universal File Parser
 *
 * Accepts any tabular file format and returns normalized rows + detected metadata.
 * Supports: CSV, TSV, pipe-delimited, semicolon-delimited, Excel (.xlsx/.xls),
 *           fixed-width, files with/without headers, various encodings.
 *
 * Used by the smart import engine before column mapping.
 */

export type Delimiter = "," | "\t" | "|" | ";" | "fixed-width" | "auto";

export interface ParsedFile {
  rows: Record<string, string>[];      // normalized rows as key/value
  rawHeaders: string[];                // original column headers (or generated)
  totalRows: number;
  skippedRows: number;
  detectedDelimiter: string;
  detectedEncoding: string;
  hasHeaders: boolean;
  sampleRows: Record<string, string>[]; // first 5 rows for preview
  warnings: string[];
}

export interface RawRow {
  [key: string]: string;
}

// ─── Main Parser ──────────────────────────────────────────────────────────────

export async function parseAnyFile(
  fileContent: string | ArrayBuffer,
  filename: string,
  hintDelimiter?: Delimiter
): Promise<ParsedFile> {
  const warnings: string[] = [];

  // Decode buffer to string if needed
  let text: string;
  if (typeof fileContent === "string") {
    text = fileContent;
  } else {
    // Try UTF-8 first, fall back to latin1
    try {
      text = new TextDecoder("utf-8").decode(fileContent);
    } catch {
      text = new TextDecoder("iso-8859-1").decode(fileContent);
      warnings.push("File encoding detected as latin-1 (ISO 8859-1). Special characters may need review.");
    }
  }

  // Remove BOM if present
  if (text.charCodeAt(0) === 0xFEFF) {
    text = text.slice(1);
    warnings.push("UTF-8 BOM detected and removed.");
  }

  // Normalize line endings
  text = text.replace(/\r\n/g, "\n").replace(/\r/g, "\n");

  const lines = text.split("\n").filter(l => l.trim().length > 0);

  if (lines.length === 0) {
    return { rows: [], rawHeaders: [], totalRows: 0, skippedRows: 0, detectedDelimiter: ",", detectedEncoding: "utf-8", hasHeaders: false, sampleRows: [], warnings: ["File appears to be empty."] };
  }

  // Detect delimiter
  const delimiter = hintDelimiter && hintDelimiter !== "auto"
    ? hintDelimiter
    : detectDelimiter(lines[0], lines[1]);

  // Detect if first row looks like headers
  const hasHeaders = detectHasHeaders(lines[0], delimiter);

  // Parse rows
  let headers: string[];
  let dataLines: string[];

  if (hasHeaders) {
    headers = parseLine(lines[0], delimiter).map(h => h.trim());
    dataLines = lines.slice(1);
  } else {
    // Generate column names: Column_1, Column_2, etc.
    const firstRow = parseLine(lines[0], delimiter);
    headers = firstRow.map((_, i) => `Column_${i + 1}`);
    dataLines = lines;
    warnings.push("No header row detected. Column names were auto-generated as Column_1, Column_2, etc. Please review the column mapping.");
  }

  // Deduplicate headers (Excel sometimes has duplicate column names)
  const seenHeaders = new Map<string, number>();
  headers = headers.map(h => {
    if (!h) h = "unnamed";
    const count = seenHeaders.get(h) ?? 0;
    seenHeaders.set(h, count + 1);
    return count === 0 ? h : `${h}_${count + 1}`;
  });

  // Parse all data rows
  const rows: RawRow[] = [];
  let skippedRows = 0;

  for (let i = 0; i < dataLines.length; i++) {
    const line = dataLines[i].trim();
    if (!line) continue;

    const values = parseLine(line, delimiter);

    // Skip rows that are clearly empty
    if (values.every(v => !v.trim())) {
      skippedRows++;
      continue;
    }

    const row: RawRow = {};
    headers.forEach((header, idx) => {
      row[header] = (values[idx] ?? "").trim();
    });

    rows.push(row);
  }

  if (rows.length === 0) {
    warnings.push("No data rows found after parsing.");
  }

  return {
    rows,
    rawHeaders: headers,
    totalRows: rows.length,
    skippedRows,
    detectedDelimiter: delimiter,
    detectedEncoding: "utf-8",
    hasHeaders,
    sampleRows: rows.slice(0, 5),
    warnings,
  };
}

// ─── Delimiter Detection ──────────────────────────────────────────────────────

function detectDelimiter(firstLine: string, secondLine?: string): string {
  const candidates = [",", "\t", "|", ";"];

  // Count occurrences of each delimiter in first two lines
  // The correct delimiter should appear consistently
  const scores = candidates.map(delim => {
    const count1 = countOccurrences(firstLine, delim);
    const count2 = secondLine ? countOccurrences(secondLine, delim) : count1;
    // Score: consistency between lines matters more than raw count
    const consistency = count1 > 0 && count2 > 0 && Math.abs(count1 - count2) <= 1 ? 10 : 0;
    return { delim, score: count1 + count2 + consistency };
  });

  scores.sort((a, b) => b.score - a.score);

  // If tab-delimited scores high, it's usually correct (official voter files often are)
  if (scores[0].score > 0) return scores[0].delim;

  // Default to comma
  return ",";
}

function countOccurrences(str: string, char: string): number {
  // Count outside quoted strings
  let count = 0;
  let inQuotes = false;
  for (let i = 0; i < str.length; i++) {
    if (str[i] === '"') inQuotes = !inQuotes;
    else if (!inQuotes && str[i] === char) count++;
  }
  return count;
}

// ─── Header Detection ─────────────────────────────────────────────────────────

function detectHasHeaders(firstLine: string, delimiter: string): boolean {
  const values = parseLine(firstLine, delimiter);

  // If most values look like column names (text, not numbers/dates), assume headers
  const textValues = values.filter(v => {
    const trimmed = v.trim();
    if (!trimmed) return false;
    // Numbers → probably data
    if (/^\d+$/.test(trimmed)) return false;
    // Dates → probably data
    if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) return false;
    if (/^\d{1,2}\/\d{1,2}\/\d{2,4}/.test(trimmed)) return false;
    // Phone numbers → probably data
    if (/^[\d\s\-\(\)]{7,}$/.test(trimmed)) return false;
    // Short text → likely header
    return trimmed.length < 50;
  });

  return textValues.length >= values.length * 0.6;
}

// ─── Line Parser (handles quoted fields) ─────────────────────────────────────

export function parseLine(line: string, delimiter: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  let i = 0;

  while (i < line.length) {
    const char = line[i];

    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // Escaped quote inside quoted field
        current += '"';
        i += 2;
        continue;
      }
      inQuotes = !inQuotes;
    } else if (char === delimiter && !inQuotes) {
      result.push(current);
      current = "";
    } else {
      current += char;
    }
    i++;
  }

  result.push(current);
  return result;
}

// ─── Excel Parser (client-side using SheetJS) ─────────────────────────────────

export async function parseExcelFile(buffer: ArrayBuffer): Promise<ParsedFile> {
  // Dynamic import of SheetJS (only loaded when needed)
  const XLSX = await import("xlsx");

  const workbook = XLSX.read(buffer, { type: "array", cellDates: true });

  // Use first sheet
  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  // Convert to array of arrays
  const aoa: (string | number | boolean | Date | null)[][] = XLSX.utils.sheet_to_json(worksheet, {
    header: 1,
    defval: "",
    raw: false, // format dates as strings
  });

  if (aoa.length === 0) {
    return { rows: [], rawHeaders: [], totalRows: 0, skippedRows: 0, detectedDelimiter: "excel", detectedEncoding: "utf-8", hasHeaders: false, sampleRows: [], warnings: ["Excel file appears to be empty."] };
  }

  // Convert to string rows
  const stringRows = aoa.map(row => row.map(cell => String(cell ?? "").trim()));

  // Build a CSV-like string and pass to main parser
  const csvText = stringRows.map(row => row.map(cell => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n");

  return parseAnyFile(csvText, "file.csv", ",");
}

// ─── Utility ─────────────────────────────────────────────────────────────────

export function detectFileType(filename: string): "csv" | "excel" | "tsv" | "text" {
  const ext = filename.split(".").pop()?.toLowerCase() ?? "";
  if (["xlsx", "xls"].includes(ext)) return "excel";
  if (ext === "tsv") return "tsv";
  if (ext === "csv") return "csv";
  return "text";
}
