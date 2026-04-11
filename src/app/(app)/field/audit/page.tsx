import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import FieldAuditClient, { type AuditRow } from "./audit-client";

export const metadata = { title: "Field Audit — Poll City" };

export default async function FieldAuditPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  const logs = await prisma.fieldAuditLog.findMany({
    where: { campaignId },
    include: {
      actor: { select: { id: true, name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  const serialized: AuditRow[] = logs.map((l) => ({
    ...l,
    createdAt: l.createdAt.toISOString(),
    oldValueJson: l.oldValueJson as Record<string, unknown> | null,
    newValueJson: l.newValueJson as Record<string, unknown> | null,
  }));

  return (
    <FieldAuditClient
      campaignId={campaignId}
      campaignName={campaignName}
      logs={serialized}
    />
  );
}
