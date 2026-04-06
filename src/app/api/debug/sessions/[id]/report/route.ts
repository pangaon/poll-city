import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { validateDebugAccess } from "@/lib/debug/access";
import { generateDebugReport } from "@/lib/debug/report-generator";

function debugNotFound() {
  return NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await validateDebugAccess(req);
  if (!access.ok) return debugNotFound();

  const session = await prisma.debugSession.findFirst({
    where: { id: params.id, userId: access.userId },
    select: { id: true },
  });
  if (!session) return debugNotFound();

  const report = await generateDebugReport(session.id);
  return NextResponse.json({ report });
}
