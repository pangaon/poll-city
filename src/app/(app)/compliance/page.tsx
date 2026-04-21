import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import ComplianceClient from "./compliance-client";

export const dynamic = "force-dynamic";

export default async function CompliancePage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");

  // Find the user's primary campaign
  const membership = await prisma.membership.findFirst({
    where: {
      userId: session.user.id,
      status: "active",
      role: { in: ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"] },
    },
    orderBy: { joinedAt: "asc" },
    select: { campaignId: true, role: true },
  });

  if (!membership) redirect("/dashboard");

  const campaignId = membership.campaignId;

  // Total contacts with email
  const totalWithEmail = await prisma.contact.count({
    where: { campaignId, deletedAt: null, isDeceased: false, email: { not: null }, doNotContact: false },
  });

  type ConsentType = "explicit" | "implied" | "express_withdrawal";
  type ConsentChannel = "email" | "sms" | "push";
  type ConsentSource = "import" | "form" | "qr" | "manual" | "social_follow" | "donation" | "event_signup";
  type ConsentRecordSafe = {
    id: string; consentType: ConsentType; channel: ConsentChannel; source: ConsentSource;
    collectedAt: string; expiresAt: string | null; notes: string | null;
    contact: { id: string; firstName: string; lastName: string; email: string | null };
    recordedBy: { id: string; name: string | null } | null;
  };

  // Consent stats — table may not exist until npx prisma db push is run
  let consentedCount = 0;
  let withdrawnCount = 0;
  let recentRecords: ConsentRecordSafe[] = [];

  try {
    const now = new Date();
    const [consentedContactIds, withdrawnContactIds, rawRecords] = await Promise.all([
      prisma.consentRecord.findMany({
        where: {
          campaignId, channel: "email",
          OR: [
            { consentType: "explicit" },
            { consentType: "implied", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
          ],
        },
        select: { contactId: true },
        distinct: ["contactId"],
      }),
      prisma.consentRecord.findMany({
        where: { campaignId, channel: "email", consentType: "express_withdrawal" },
        select: { contactId: true },
        distinct: ["contactId"],
      }),
      prisma.consentRecord.findMany({
        where: { campaignId },
        orderBy: { collectedAt: "desc" },
        take: 25,
        select: {
          id: true, consentType: true, channel: true, source: true,
          collectedAt: true, expiresAt: true, notes: true,
          contact: { select: { id: true, firstName: true, lastName: true, email: true } },
          recordedBy: { select: { id: true, name: true } },
        },
      }),
    ]);
    consentedCount = consentedContactIds.length;
    withdrawnCount = withdrawnContactIds.length;
    recentRecords = rawRecords
      .filter((r) => r.contact !== null)
      .map((r) => ({
        ...r,
        contact: r.contact!,
        consentType: r.consentType as ConsentType,
        channel: r.channel as ConsentChannel,
        source: r.source as ConsentSource,
        collectedAt: r.collectedAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
      }));
  } catch {
    // ConsentRecord table may not exist until npx prisma db push is run
  }

  const noConsentCount = Math.max(0, totalWithEmail - consentedCount - withdrawnCount);
  const coveragePct = totalWithEmail > 0 ? Math.round((consentedCount / totalWithEmail) * 100) : 0;

  return (
    <ComplianceClient
      campaignId={campaignId}
      stats={{ totalWithEmail, consentedCount, withdrawnCount, noConsentCount, coveragePct }}
      recentRecords={recentRecords}
    />
  );
}
