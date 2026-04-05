/**
 * CSV export helpers — RFC 4180 compliant with proper escaping.
 */

export function escapeCsvField(value: unknown): string {
  if (value === null || value === undefined) return "";
  const str = String(value);
  // Quote if it contains comma, newline, or double-quote
  if (/[",\n\r]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function rowsToCsv<T extends Record<string, unknown>>(
  rows: T[],
  columns: Array<{ key: keyof T | string; header: string }>
): string {
  const headerLine = columns.map((c) => escapeCsvField(c.header)).join(",");
  const bodyLines = rows.map((row) =>
    columns.map((c) => escapeCsvField(row[c.key as keyof T])).join(",")
  );
  return [headerLine, ...bodyLines].join("\r\n");
}

export function csvResponse(csv: string, filename: string): Response {
  return new Response(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}

/**
 * Format a filename with campaign slug and today's date.
 */
export function exportFilename(campaignSlug: string, type: string): string {
  const today = new Date().toISOString().slice(0, 10);
  const safeSlug = campaignSlug.replace(/[^a-z0-9-]/gi, "-").toLowerCase();
  return `${safeSlug}-${type}-${today}.csv`;
}
