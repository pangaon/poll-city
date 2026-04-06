import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateDebugAccess } from "@/lib/debug/access";
import { generateDebugReport } from "@/lib/debug/report-generator";

const NO_STORE_HEADERS = { "Cache-Control": "no-store" };

function debugNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404, headers: NO_STORE_HEADERS });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await validateDebugAccess(req);
  if (!access.ok) return debugNotFound();

  const sessionRows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT "id"
    FROM "DebugSession"
    WHERE "id" = ${params.id}
      AND "userId" = ${access.userId}
    LIMIT 1
  `;
  const session = sessionRows[0];
  if (!session) return debugNotFound();

  const report = await generateDebugReport(session.id);
  return NextResponse.json({ report }, { headers: NO_STORE_HEADERS });
}
