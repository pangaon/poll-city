import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const issues: string[] = [];

  try {
    // Check DB connectivity with a simple count
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      issues.push("User table is empty — possible data loss");
    }

    // Check for campaigns with no memberships (orphaned)
    const orphanedCampaigns = await prisma.campaign.count({
      where: { memberships: { none: {} } },
    });
    if (orphanedCampaigns > 5) {
      issues.push(`${orphanedCampaigns} campaigns have no memberships`);
    }

    // Check recent error-type notifications (deploy failures in last hour)
    const recentFailures = await prisma.operatorNotification.count({
      where: {
        type: "deploy_failure",
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (recentFailures > 0) {
      issues.push(`${recentFailures} deploy failures in last hour`);
    }
  } catch (e) {
    console.error("[health-monitor] DB health check failed:", e);
    issues.push("DB health check failed");
  }

  if (issues.length > 0) {
    await prisma.operatorNotification.create({
      data: {
        type: "health_alert",
        title: "Health monitor: issues detected",
        body: issues.join("\n"),
        data: { issues, checkedAt: new Date().toISOString() },
      },
    });
  }

  return NextResponse.json({ ok: true, issues });
}
