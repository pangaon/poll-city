import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

// Every 30 minutes — checks for anomalies across all campaigns.
export async function GET(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  if (cronSecret) {
    const auth = req.headers.get("authorization");
    if (auth !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    }
  }

  const since = new Date(Date.now() - 30 * 60 * 1000);

  const [unresolvedEvents, failedLogins, suspiciousAdoni] = await Promise.all([
    prisma.securityEvent.count({
      where: { createdAt: { gte: since }, success: false },
    }),
    prisma.securityEvent.count({
      where: { type: "login_fail", createdAt: { gte: since } },
    }),
    prisma.adoniSuspiciousActivity.count({
      where: { flaggedAt: { gte: since }, reviewed: false },
    }),
  ]);

  const hasIssues = unresolvedEvents > 5 || failedLogins > 10 || suspiciousAdoni > 0;

  const threatLevel = !hasIssues
    ? "none"
    : failedLogins > 20 || unresolvedEvents > 15
      ? "high"
      : "medium";

  if (threatLevel === "high") {
    console.error(
      `[SECURITY SCAN] HIGH THREAT: ${unresolvedEvents} events, ${failedLogins} failed logins, ${suspiciousAdoni} suspicious Adoni sessions`,
    );
  }

  return NextResponse.json({
    scanned: true,
    since: since.toISOString(),
    hasIssues,
    threatLevel,
    metrics: { unresolvedEvents, failedLogins, suspiciousAdoni },
  });
}
