import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import SecurityClient from "./security-client";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const { userId } = await resolveActiveCampaign();

  const [user, sessions, apiKeys] = await Promise.all([
    prisma.user.findUnique({
      where: { id: userId },
      select: {
        twoFactorEnabled: true,
        preferredMfaMethod: true,
        twoFactorBackupCodes: true,
        webauthnCredentials: true,
        phone: true,
        email: true,
      },
    }),
    prisma.userSession.findMany({
      where: { userId, revokedAt: null },
      orderBy: { lastSeen: "desc" },
      take: 10,
      select: { id: true, device: true, ip: true, lastSeen: true, createdAt: true },
    }),
    prisma.apiKey.findMany({
      where: { userId, revokedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, name: true, keyPrefix: true, lastUsedAt: true, createdAt: true },
    }),
  ]);

  const webauthnCount = Array.isArray(user?.webauthnCredentials)
    ? (user!.webauthnCredentials as unknown as Array<{ label?: string }>).length
    : 0;

  return (
    <SecurityClient
      twoFactorEnabled={user?.twoFactorEnabled ?? false}
      preferredMfaMethod={user?.preferredMfaMethod ?? null}
      backupCodesRemaining={user?.twoFactorBackupCodes?.length ?? 0}
      webauthnCount={webauthnCount}
      hasPhone={Boolean(user?.phone)}
      email={user?.email ?? ""}
      initialSessions={sessions.map((s) => ({
        ...s,
        lastSeen: s.lastSeen.toISOString(),
        createdAt: s.createdAt.toISOString(),
      }))}
      initialApiKeys={apiKeys.map((k) => ({
        ...k,
        lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
        createdAt: k.createdAt.toISOString(),
      }))}
    />
  );
}
