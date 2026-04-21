import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import ComplianceClient from "./compliance-client";

export const dynamic = "force-dynamic";

type ConsentType   = "explicit" | "implied" | "express_withdrawal";
type ConsentChannel = "email" | "sms" | "push";
type ConsentSource  = "import" | "form" | "qr" | "manual" | "social_follow" | "donation" | "event_signup";
type ConsentStatus  = "active" | "revoked";

export default async function CompliancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: "active",
      role: { in: ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"] },
    },
    orderBy: { joinedAt: "asc" },
    select: { campaignId: true },
  });

  if (!membership) redirect("/dashboard");

  const campaignId = membership.campaignId;
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

  let stats = { activeConsents: 0, explicitCount: 0, revokedCount: 0, thisWeek: 0 };
  let trendData: { date: string; consents: number }[] = [];
  let sourceBreakdown: { source: string; count: number; pct: number }[] = [];
  let recentRecords: {
    id: string; consentType: ConsentType; channel: ConsentChannel; source: ConsentSource;
    status: ConsentStatus; collectedAt: string; expiresAt: string | null; notes: string | null;
    contact: { id: string; firstName: string; lastName: string; email: string | null };
    recordedBy: { id: string; name: string | null } | null;
  }[] = [];

  // Pre-build 7-day bucket keys
  const dayKeys: string[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    dayKeys.push(d.toLocaleDateString("en-CA", { month: "short", day: "numeric" }));
  }

  try {
    const [activeRows, revokedCount, thisWeek, rawRecords, sourceGroups, trendRows] = await Promise.all([
      prisma.consentRecord.findMany({
        where: {
          campaignId,
          OR: [
            { consentType: "explicit" },
            { consentType: "implied", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        },
        select: { contactId: true, consentType: true },
        distinct: ["contactId"],
      }),
      prisma.consentRecord.count({
        where: { campaignId, consentType: "express_withdrawal" },
      }),
      prisma.consentRecord.count({
        where: { campaignId, collectedAt: { gte: sevenDaysAgo }, NOT: { consentType: "express_withdrawal" } },
      }),
      prisma.consentRecord.findMany({
        where: { campaignId },
        orderBy: { collectedAt: "desc" },
        take: 50,
        select: {
          id: true, consentType: true, channel: true, source: true,
          collectedAt: true, expiresAt: true, notes: true,
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          recordedBy: { select: { id: true, name: true } },
        },
      }),
      prisma.consentRecord.groupBy({
        by: ["source"],
        where: { campaignId, NOT: { consentType: "express_withdrawal" } },
        _count: { id: true },
        orderBy: { _count: { id: "desc" } },
        take: 6,
      }),
      prisma.consentRecord.findMany({
        where: { campaignId, collectedAt: { gte: sevenDaysAgo }, NOT: { consentType: "express_withdrawal" } },
        select: { collectedAt: true },
      }),
    ]);

    // Stats
    stats = {
      activeConsents: activeRows.length,
      explicitCount:  activeRows.filter((r) => r.consentType === "explicit").length,
      revokedCount,
      thisWeek,
    };

    // 7-day trend
    const dayMap: Record<string, number> = Object.fromEntries(dayKeys.map((k) => [k, 0]));
    for (const r of trendRows) {
      const key = r.collectedAt.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
      if (key in dayMap) dayMap[key]++;
    }
    trendData = dayKeys.map((date) => ({ date, consents: dayMap[date] }));

    // Source breakdown
    const total = sourceGroups.reduce((s, g) => s + g._count.id, 0);
    sourceBreakdown = sourceGroups.map((g) => ({
      source: g.source,
      count:  g._count.id,
      pct:    total > 0 ? Math.round((g._count.id / total) * 100) : 0,
    }));

    // Records
    recentRecords = rawRecords
      .filter((r) => r.contact !== null)
      .map((r) => {
        const isRevoked =
          r.consentType === "express_withdrawal" ||
          (r.expiresAt !== null && r.expiresAt < now);
        return {
          id:           r.id,
          consentType:  r.consentType as ConsentType,
          channel:      r.channel     as ConsentChannel,
          source:       r.source      as ConsentSource,
          status:       (isRevoked ? "revoked" : "active") as ConsentStatus,
          collectedAt:  r.collectedAt.toISOString(),
          expiresAt:    r.expiresAt?.toISOString() ?? null,
          notes:        r.notes,
          contact:      r.contact!,
          recordedBy:   r.recordedBy,
        };
      });
  } catch {
    // ConsentRecord table may not exist until npx prisma db push is run
  }

  return (
    <ComplianceClient
      campaignId={campaignId}
      stats={stats}
      trendData={trendData}
      sourceBreakdown={sourceBreakdown}
      recentRecords={recentRecords}
    />
  );
}
