import { NextRequest, NextResponse } from "next/server";
import { apiAuth } from "@/lib/auth/helpers";
import prisma from "@/lib/db/prisma";

/** GET — PIPEDA compliant personal data export.
 *  Returns a JSON file download with all personal data stored for the user.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;
  const userId = session!.user.id as string;

  const [user, securityEvents, sessions, apiKeys, memberships] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        name: true,
        phone: true,
        avatarUrl: true,
        postalCode: true,
        address: true,
        ward: true,
        riding: true,
        role: true,
        emailVerified: true,
        twoFactorEnabled: true,
        preferredMfaMethod: true,
        createdAt: true,
        updatedAt: true,
        lastLoginAt: true,
      },
    }),
    prisma.securityEvent.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { type: true, success: true, ip: true, createdAt: true },
    }),
    prisma.userSession.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { device: true, ip: true, createdAt: true, lastSeen: true, revokedAt: true },
    }),
    prisma.apiKey.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: { name: true, keyPrefix: true, createdAt: true, lastUsedAt: true, revokedAt: true },
    }),
    prisma.membership.findMany({
      where: { userId },
      select: {
        role: true,
        createdAt: true,
        campaign: { select: { name: true, electionType: true } },
      },
    }),
  ]);

  await prisma.securityEvent.create({
    data: { userId, type: "data_export", success: true },
  });

  const payload = {
    exportedAt: new Date().toISOString(),
    notice: "This is your personal data held by Poll City under PIPEDA. Contact privacy@poll.city for questions.",
    profile: user,
    campaignMemberships: memberships,
    loginHistory: securityEvents,
    activeSessions: sessions,
    apiKeys: apiKeys.map((k) => ({ ...k, note: "API key hashes are not exported — only prefix and metadata." })),
  };

  const json = JSON.stringify(payload, null, 2);

  return new NextResponse(json, {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="poll-city-data-export-${userId.slice(0, 8)}.json"`,
      "Cache-Control": "no-store",
    },
  });
}
