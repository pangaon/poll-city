/**
 * POST /api/import/rollback — Rollback a completed import within 24 hours.
 * Deletes all contacts created by the import.
 */
import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { rollbackImport } from "@/lib/import/background-processor";

export async function POST(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const { importLogId } = await req.json();
  if (!importLogId) return NextResponse.json({ error: "importLogId is required" }, { status: 400 });

  const job = await prisma.importLog.findUnique({ where: { id: importLogId } });
  if (!job) return NextResponse.json({ error: "Import not found" }, { status: 404 });
  if (job.userId !== session!.user.id) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  try {
    const result = await rollbackImport(importLogId);
    return NextResponse.json({ ok: true, deletedCount: result.deletedCount });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
