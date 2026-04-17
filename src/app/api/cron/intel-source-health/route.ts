import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret) {
    return NextResponse.json({ error: "Service misconfigured" }, { status: 503 });
  }
  if (authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sources = await prisma.dataSource.findMany({
    where: { isActive: true },
    select: { id: true, name: true, baseUrl: true, rssUrl: true, sourceType: true },
  });

  let healthy = 0;
  let degraded = 0;
  let down = 0;

  for (const source of sources) {
    const urlToCheck = source.rssUrl ?? (source.sourceType === "rss" ? null : source.baseUrl);
    if (!urlToCheck) continue;

    const start = Date.now();
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(urlToCheck, {
        method: "HEAD",
        signal: controller.signal,
        headers: { "User-Agent": "PollCity-HealthCheck/1.0" },
      });
      clearTimeout(timeout);
      const ms = Date.now() - start;
      const status = res.ok ? "healthy" : "degraded";
      if (status === "healthy") healthy++;
      else degraded++;

      await prisma.intelSourceHealth.create({
        data: { dataSourceId: source.id, status, httpStatus: res.status, responseMs: ms, itemsFound: 0 },
      });
    } catch {
      down++;
      await prisma.intelSourceHealth.create({
        data: {
          dataSourceId: source.id,
          status: "down",
          errorMessage: "HEAD request failed or timed out",
          itemsFound: 0,
        },
      }).catch(() => {});
    }
  }

  return NextResponse.json({ checked: sources.length, healthy, degraded, down });
}
