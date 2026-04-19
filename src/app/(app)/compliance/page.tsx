import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/options";
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
    orderBy: { createdAt: "asc" },
    select: { campaignId: true, role: true },
  });

  if (!membership) redirect("/dashboard");

  const campaignId = membership.campaignId;

  // Total contacts with email
  const totalWithEmail = await prisma.contact.count({
    where: { campaignId, deletedAt: null, isDeceased: false, email: { not: null }, doNotContact: false },
  });

  // Contacts with at least one valid email consent record
  const now = new Date();
  const consentedContactIds = await prisma.consentRecord.findMany({
    where: {
      campaignId,
      channel: "email",
      OR: [
        { consentType: "explicit" },
        { consentType: "implied", OR: [{ expiresAt: null }, { expiresAt: { gt: now } }] },
      ],
    },
    select: { contactId: true },
    distinct: ["contactId"],
  });

  // Contacts with express_withdrawal
  const withdrawnContactIds = await prisma.consentRecord.findMany({
    where: { campaignId, channel: "email", consentType: "express_withdrawal" },
    select: { contactId: true },
    distinct: ["contactId"],
  });

  const consentedCount = consentedContactIds.length;
  const withdrawnCount = withdrawnContactIds.length;
  const noConsentCount = Math.max(0, totalWithEmail - consentedCount - withdrawnCount);
  const coveragePct = totalWithEmail > 0 ? Math.round((consentedCount / totalWithEmail) * 100) : 0;

  // Recent consent events
  const recentRecords = await prisma.consentRecord.findMany({
    where: { campaignId },
    orderBy: { collectedAt: "desc" },
    take: 25,
    select: {
      id: true,
      consentType: true,
      channel: true,
      source: true,
      collectedAt: true,
      expiresAt: true,
      notes: true,
      contact: { select: { id: true, firstName: true, lastName: true, email: true } },
      recordedBy: { select: { id: true, name: true } },
    },
  });

  return (
    <ComplianceClient
      campaignId={campaignId}
      stats={{
        totalWithEmail,
        consentedCount,
        withdrawnCount,
        noConsentCount,
        coveragePct,
      }}
      recentRecords={recentRecords.map((r) => ({
        ...r,
        collectedAt: r.collectedAt.toISOString(),
        expiresAt: r.expiresAt?.toISOString() ?? null,
      }))}
    />
  );
}
