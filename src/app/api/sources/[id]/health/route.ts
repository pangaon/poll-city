import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null) {
  if (!session) return false;
  const user = session.user as typeof session.user & { role?: string };
  return user?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const source = await prisma.platformSource.findUnique({ where: { id: params.id } });
  if (!source) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const sp = req.nextUrl.searchParams;
  const limit = Math.min(50, parseInt(sp.get("limit") ?? "20", 10));

  const checks = await prisma.sourceHealthCheck.findMany({
    where: { sourceId: params.id },
    orderBy: { checkedAt: "desc" },
    take: limit,
  });

  // Compute consecutive failure count from latest checks
  let consecutiveFailures = 0;
  for (const c of checks) {
    if (!c.isReachable) consecutiveFailures++;
    else break;
  }

  const successRate = checks.length > 0
    ? (checks.filter((c) => c.isReachable).length / checks.length) * 100
    : null;

  return NextResponse.json({
    sourceId: params.id,
    sourceName: source.name,
    sourceStatus: source.sourceStatus,
    lastCheckedAt: source.lastCheckedAt,
    lastSuccessAt: source.lastSuccessAt,
    lastErrorAt: source.lastErrorAt,
    errorCount: source.errorCount,
    consecutiveFailures,
    successRate: successRate !== null ? Math.round(successRate) : null,
    checks,
  });
}
