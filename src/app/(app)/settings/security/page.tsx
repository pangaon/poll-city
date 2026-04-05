import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import SecurityClient from "./security-client";

export const dynamic = "force-dynamic";

export default async function SecuritySettingsPage() {
  const { userId } = await resolveActiveCampaign();

  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      twoFactorEnabled: true,
      preferredMfaMethod: true,
      twoFactorBackupCodes: true,
      webauthnCredentials: true,
      phone: true,
      email: true,
    },
  });

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
    />
  );
}
