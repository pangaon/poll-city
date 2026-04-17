import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

function isSuperAdmin(session: import("next-auth").Session | null): session is import("next-auth").Session {
  if (!session) return false;
  const u = session.user;
  return u?.role === "SUPER_ADMIN";
}

export async function GET(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!isSuperAdmin(session)) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const { searchParams } = new URL(req.url);
  const dataSourceId = searchParams.get("dataSourceId");

  if (dataSourceId) {
    // Latest 20 health checks for one source
    const checks = await prisma.intelSourceHealth.findMany({
      where: { dataSourceId },
      orderBy: { checkedAt: "desc" },
      take: 20,
      select: { id: true, checkedAt: true, status: true, httpStatus: true, responseMs: true, errorMessage: true, itemsFound: true },
    });
    return NextResponse.json({ checks });
  }

  // Summary: latest health check per source
  const sources = await prisma.dataSource.findMany({
    where: { isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      jurisdictionLevel: true,
      candidateDetectionEnabled: true,
      intelSourceHealths: {
        orderBy: { checkedAt: "desc" },
        take: 1,
        select: { status: true, httpStatus: true, responseMs: true, checkedAt: true, errorMessage: true, itemsFound: true },
      },
    },
    orderBy: [{ priorityTier: "asc" }, { name: "asc" }],
  });

  const summary = sources.map((s) => ({
    id: s.id,
    name: s.name,
    slug: s.slug,
    level: s.jurisdictionLevel,
    detectionEnabled: s.candidateDetectionEnabled,
    latestCheck: s.intelSourceHealths[0] ?? null,
  }));

  const counts = { healthy: 0, degraded: 0, down: 0, unknown: 0 };
  for (const s of summary) {
    const status = (s.latestCheck?.status ?? "unknown") as keyof typeof counts;
    counts[status] = (counts[status] ?? 0) + 1;
  }

  return NextResponse.json({ summary, counts });
}
