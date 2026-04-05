// Shared file upload and XLSX/CSV safety helpers.
// Applied at every ingest boundary (import, budget, voted lists).

export const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB
export const MAX_ROWS_PER_IMPORT = 100_000;

// Cells that begin with any of these are potentially executable formulas
// when opened in Excel/Sheets. Force-text by prefixing with a single quote.
const DANGEROUS_PREFIXES = ["=", "+", "-", "@", "\t", "\r"];

export function sanitizeCellValue(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  if (str.length === 0) return "";
  const trimmed = str.trimStart();
  if (DANGEROUS_PREFIXES.some((c) => trimmed.startsWith(c))) {
    return `'${str}`;
  }
  return str;
}

export function sanitizeRow<T extends Record<string, unknown>>(row: T): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(row)) {
    out[key] = sanitizeCellValue(value);
  }
  return out;
}

export class FileTooLargeError extends Error {
  readonly code = "FILE_TOO_LARGE";
  constructor(public readonly sizeBytes: number, public readonly maxBytes: number) {
    super(
      `File too large: ${(sizeBytes / 1024 / 1024).toFixed(1)} MB. Maximum is ${(maxBytes / 1024 / 1024).toFixed(0)} MB.`,
    );
  }
}

export function checkFileSize(sizeBytes: number, maxBytes: number = MAX_UPLOAD_BYTES): void {
  if (sizeBytes > maxBytes) {
    throw new FileTooLargeError(sizeBytes, maxBytes);
  }
}

export function parseContentLengthHeader(header: string | null): number | null {
  if (!header) return null;
  const parsed = Number.parseInt(header, 10);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

const ALLOWED_MIME = new Set([
  "text/csv",
  "application/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "application/octet-stream", // browsers sometimes send this for xlsx
  "text/plain", // some systems for csv
]);

export function isAllowedMimeType(mimeType: string | undefined | null): boolean {
  if (!mimeType) return false;
  return ALLOWED_MIME.has(mimeType.toLowerCase().split(";")[0].trim());
}
