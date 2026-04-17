/**
 * GET /api/import/failed-rows?importLogId=&campaignId=
 * Returns a CSV of all invalid rows from the import so the user can fix and re-import.
 */
import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const limited = await rateLimit(req, "read");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  const importLogId = req.nextUrl.searchParams.get("importLogId");
  const campaignId = req.nextUrl.searchParams.get("campaignId");

  if (!importLogId || !campaignId) {
    return NextResponse.json({ error: "importLogId and campaignId required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "import:write");
  if (forbidden) return forbidden;

  const importLog = await prisma.importLog.findUnique({
    where: { id: importLogId },
    select: { id: true, campaignId: true, filename: true, invalidRows: true },
  });

  if (!importLog || importLog.campaignId !== campaignId) {
    return NextResponse.json({ error: "Import log not found" }, { status: 404 });
  }

  const invalidRows = (importLog.invalidRows as Array<{
    rowIndex: number;
    reason: string;
    rawRow?: Record<string, string>;
  }> | null) ?? [];

  if (invalidRows.length === 0) {
    return NextResponse.json({ error: "No failed rows for this import" }, { status: 404 });
  }

  // Gather all column headers from rawRows (union of all keys)
  const headerSet = new Set<string>(["row_number", "error_reason"]);
  for (const r of invalidRows) {
    if (r.rawRow) {
      for (const key of Object.keys(r.rawRow)) headerSet.add(key);
    }
  }
  const headers = Array.from(headerSet);

  // Build CSV
  function escapeCSV(val: string): string {
    if (val.includes(",") || val.includes('"') || val.includes("\n")) {
      return `"${val.replace(/"/g, '""')}"`;
    }
    return val;
  }

  const rows = [
    headers.map(escapeCSV).join(","),
    ...invalidRows.map((r) => {
      return headers.map((h) => {
        if (h === "row_number") return escapeCSV(String(r.rowIndex));
        if (h === "error_reason") return escapeCSV(r.reason);
        return escapeCSV((r.rawRow?.[h] ?? ""));
      }).join(",");
    }),
  ];

  const csv = rows.join("\n");
  const filename = `failed-rows-${importLog.filename.replace(/\.[^.]+$/, "")}.csv`;

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
    },
  });
}
