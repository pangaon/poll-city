/**
 * Standardized audit logging helper.
 * Every POST/PATCH/DELETE must call this.
 *
 * Usage:
 *   await audit(prisma, 'contact.update', {
 *     campaignId, userId, entityId, entityType: 'Contact',
 *     before: oldData, after: newData, ip: request.headers.get('x-forwarded-for')
 *   });
 */
import type { PrismaClient } from "@prisma/client";

export interface AuditData {
  campaignId: string;
  userId: string;
  entityId: string;
  entityType: string;
  before?: unknown;
  after?: unknown;
  ip?: string | null;
  details?: Record<string, unknown>;
}

export async function audit(
  prisma: PrismaClient,
  action: string,
  data: AuditData,
): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: {
        campaignId: data.campaignId,
        userId: data.userId,
        action,
        entityId: data.entityId,
        entityType: data.entityType,
        details: {
          ...(data.details ?? {}),
          ...(data.before !== undefined ? { before: data.before } : {}),
          ...(data.after !== undefined ? { after: data.after } : {}),
          ...(data.ip ? { ipAddress: data.ip } : {}),
        } as object,
      },
    });
  } catch (e) {
    // Audit logging should never block the main operation
    console.error("[audit] Failed to log:", action, e);
  }
}
