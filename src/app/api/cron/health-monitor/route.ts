import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const dynamic = "force-dynamic";

const STUCK_IMPORT_THRESHOLD_MS = 2 * 60 * 60 * 1000; // 2 hours

export async function GET(req: NextRequest) {
  const secret = req.headers.get("authorization")?.replace("Bearer ", "");
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const issues: string[] = [];
  const repairs: string[] = [];

  try {
    // Check DB connectivity
    const userCount = await prisma.user.count();
    if (userCount === 0) {
      issues.push("User table is empty — possible data loss");
    }

    // Check for orphaned campaigns
    const orphanedCampaigns = await prisma.campaign.count({
      where: { memberships: { none: {} } },
    });
    if (orphanedCampaigns > 5) {
      issues.push(`${orphanedCampaigns} campaigns have no memberships`);
    }

    // Check recent deploy failures
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

  // Sweep stuck imports — mark as failed if processing for >2 hours with no progress
  try {
    const stuckCutoff = new Date(Date.now() - STUCK_IMPORT_THRESHOLD_MS);
    const stuckImports = await prisma.importLog.findMany({
      where: {
        status: { in: ["queued", "processing"] },
        updatedAt: { lt: stuckCutoff },
      },
      select: { id: true, filename: true, campaignId: true, updatedAt: true },
    });

    if (stuckImports.length > 0) {
      await prisma.importLog.updateMany({
        where: { id: { in: stuckImports.map((j) => j.id) } },
        data: {
          status: "failed",
          errors: ["Import timed out — no progress for over 2 hours. Re-upload your file to try again."],
        },
      });

      const stuckNames = stuckImports.map((j) => j.filename ?? j.id).join(", ");
      repairs.push(`Cleared ${stuckImports.length} stuck import(s): ${stuckNames}`);
      issues.push(`${stuckImports.length} import(s) were stuck and have been marked failed`);
    }
  } catch (e) {
    console.error("[health-monitor] Stuck import sweep failed:", e);
    issues.push("Stuck import sweep failed — check logs");
  }

  // Ward boundary freshness — flag any municipality not re-seeded in 14 days
  try {
    const twoWeeksAgo = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    const staleWards = await prisma.wardBoundary.groupBy({
      by: ["municipality"],
      where: { updatedAt: { lt: twoWeeksAgo } },
      _count: { id: true },
    });
    if (staleWards.length > 0) {
      const staleNames = staleWards.map((w) => w.municipality).join(", ");
      issues.push(`Ward boundaries stale (>14 days) for: ${staleNames}`);
    }
  } catch (e) {
    // Ward boundary check is non-critical — don't fail the whole monitor
    console.warn("[health-monitor] Ward staleness check failed:", e);
  }

  // Write notification if there are any issues or repairs
  if (issues.length > 0 || repairs.length > 0) {
    await prisma.operatorNotification.create({
      data: {
        type: "health_alert",
        title: issues.length > 0
          ? `Health monitor: ${issues.length} issue(s) detected`
          : "Health monitor: auto-repairs completed",
        body: [...issues, ...repairs].join("\n"),
        data: { issues, repairs, checkedAt: new Date().toISOString() },
      },
    });
  }

  return NextResponse.json({ ok: true, issues, repairs });
}
