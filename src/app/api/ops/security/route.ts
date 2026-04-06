import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const since24h = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const since30m = new Date(Date.now() - 30 * 60 * 1000);

  const [
    recentEvents,
    totalUnresolved,
    failedLogins24h,
    suspiciousAdoni,
    securityRules,
  ] = await Promise.all([
    prisma.securityEvent.findMany({
      where: { createdAt: { gte: since24h } },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
    prisma.securityEvent.count({
      where: { success: false },
    }),
    prisma.securityEvent.count({
      where: { type: "login_fail", createdAt: { gte: since24h } },
    }),
    prisma.adoniSuspiciousActivity.findMany({
      where: { reviewed: false },
      orderBy: { flaggedAt: "desc" },
      take: 20,
    }),
    prisma.securityRule.findMany({
      orderBy: { name: "asc" },
    }),
  ]);

  const eventsLast30m = recentEvents.filter(
    (e) => new Date(e.createdAt) >= since30m,
  ).length;

  const threatLevel =
    failedLogins24h > 20 || eventsLast30m > 15
      ? "high"
      : failedLogins24h > 5 || eventsLast30m > 3
        ? "medium"
        : eventsLast30m > 0
          ? "low"
          : "none";

  return NextResponse.json({
    threatLevel,
    metrics: {
      totalUnresolved,
      failedLogins24h,
      eventsLast30m,
      suspiciousAdoniCount: suspiciousAdoni.length,
    },
    recentEvents,
    suspiciousAdoni,
    securityRules,
  });
}

export async function PATCH(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  if (session!.user.role !== "SUPER_ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { eventId, action } = await req.json();

  if (action === "resolve" && eventId) {
    await prisma.securityEvent.update({
      where: { id: eventId },
      data: { success: true },
    });
    return NextResponse.json({ ok: true });
  }

  if (action === "review_adoni" && eventId) {
    await prisma.adoniSuspiciousActivity.update({
      where: { id: eventId },
      data: { reviewed: true },
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
