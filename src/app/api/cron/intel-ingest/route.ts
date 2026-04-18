import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { processDataSource } from "@/lib/intel/news-pipeline";

export const dynamic = "force-dynamic";
export const maxDuration = 55;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    console.error("[cron/intel-ingest] CRON_SECRET not configured");
    return NextResponse.json({ error: "Service misconfigured" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.dataSource.findMany({
    where: { isActive: true, candidateDetectionEnabled: true },
    select: { id: true, name: true },
  });

  if (sources.length === 0) {
    return NextResponse.json({ message: "No active CIE sources", processed: 0 });
  }

  const results = [];
  // Serial processing to respect API rate limits and avoid DB contention
  for (const source of sources) {
    const result = await processDataSource(source.id);
    results.push(result);
  }

  const totalArticles = results.reduce((s, r) => s + r.articlesIngested, 0);
  const totalSignals = results.reduce((s, r) => s + r.signalsDetected, 0);
  const totalLeads = results.reduce((s, r) => s + r.leadsCreated, 0);
  const totalErrors = results.reduce((s, r) => s + r.errors.length, 0);

  return NextResponse.json({
    processed: sources.length,
    articlesIngested: totalArticles,
    signalsDetected: totalSignals,
    leadsCreated: totalLeads,
    errors: totalErrors,
    details: results.map((r) => ({
      dataSourceId: r.dataSourceId,
      articles: r.articlesIngested,
      signals: r.signalsDetected,
      leads: r.leadsCreated,
      errors: r.errors,
    })),
  });
}

// SUPER_ADMIN manual trigger — no secret needed, uses session auth
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const user = session.user as typeof session.user & { role?: string };
  if (user?.role !== "SUPER_ADMIN") return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const sources = await prisma.dataSource.findMany({
    where: { isActive: true, candidateDetectionEnabled: true },
    select: { id: true, name: true },
  });

  if (sources.length === 0) {
    return NextResponse.json({ message: "No active CIE sources", processed: 0, articlesIngested: 0, signalsDetected: 0, leadsCreated: 0 });
  }

  const results = [];
  for (const source of sources) {
    const result = await processDataSource(source.id);
    results.push(result);
  }

  const totalArticles = results.reduce((s, r) => s + r.articlesIngested, 0);
  const totalSignals = results.reduce((s, r) => s + r.signalsDetected, 0);
  const totalLeads = results.reduce((s, r) => s + r.leadsCreated, 0);

  return NextResponse.json({
    processed: sources.length,
    articlesIngested: totalArticles,
    signalsDetected: totalSignals,
    leadsCreated: totalLeads,
  });
}
