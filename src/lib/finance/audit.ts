import prisma from "@/lib/db/prisma";
import { Prisma } from "@prisma/client";

export async function logFinanceAudit({
  campaignId,
  entityType,
  entityId,
  action,
  oldValue,
  newValue,
  actorUserId,
}: {
  campaignId: string;
  entityType: string;
  entityId: string;
  action: string;
  oldValue?: Record<string, unknown>;
  newValue?: Record<string, unknown>;
  actorUserId?: string;
}) {
  await prisma.financeAuditLog.create({
    data: {
      campaignId,
      entityType,
      entityId,
      action,
      oldValueJson: oldValue !== undefined ? (oldValue as unknown as Prisma.InputJsonValue) : undefined,
      newValueJson: newValue !== undefined ? (newValue as unknown as Prisma.InputJsonValue) : undefined,
      actorUserId: actorUserId ?? null,
    },
  });
}
