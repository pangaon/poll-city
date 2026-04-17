import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { audit } from "@/lib/audit";
import { rateLimit } from "@/lib/rate-limit";

// POST /api/import-export/rollback
export async function POST(req: NextRequest) {
  const limited = await rateLimit(req, "form");
  if (limited) return limited;

  const { session, error } = await apiAuth(req);
  if (error) return error;

  let body: unknown;
  try { body = await req.json(); } catch { return NextResponse.json({ error: "Invalid JSON" }, { status: 400 }); }

  const b = body as Record<string, unknown>;
  const importLogId = typeof b.importLogId === "string" ? b.importLogId : null;
  const campaignId = typeof b.campaignId === "string" ? b.campaignId : null;

  if (!importLogId || !campaignId) {
    return NextResponse.json({ error: "importLogId and campaignId required" }, { status: 400 });
  }

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["ADMIN", "SUPER_ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Only admins can roll back imports" }, { status: 403 });
  }

  const importLog = await prisma.importLog.findUnique({
    where: { id: importLogId },
    select: {
      id: true,
      campaignId: true,
      filename: true,
      importedCount: true,
      rollbackData: true,
      rollbackDeadline: true,
      completedAt: true,
      createdAt: true,
      status: true,
    },
  });

  if (!importLog || importLog.campaignId !== campaignId) {
    return NextResponse.json({ error: "Import log not found" }, { status: 404 });
  }
  if (importLog.status === "rolled_back") {
    return NextResponse.json({ error: "This import has already been rolled back" }, { status: 400 });
  }
  if (!importLog.rollbackDeadline || importLog.rollbackDeadline < new Date()) {
    return NextResponse.json({ error: "Rollback deadline has passed" }, { status: 400 });
  }
  if (!importLog.rollbackData) {
    return NextResponse.json({ error: "No rollback data available for this import" }, { status: 400 });
  }

  const contactIds = importLog.rollbackData as string[];
  if (!Array.isArray(contactIds) || contactIds.length === 0) {
    return NextResponse.json({ error: "No contacts to roll back" }, { status: 400 });
  }

  // Safety check: count how many imported contacts have been canvassed since the import completed
  const canvassedCount = await prisma.interaction.count({
    where: {
      contactId: { in: contactIds },
      createdAt: { gte: importLog.completedAt ?? importLog.createdAt },
    },
  });

  // If contacts have been canvassed and caller didn't acknowledge, block with a warning
  const { force } = b as { force?: boolean };
  if (canvassedCount > 0 && !force) {
    return NextResponse.json(
      {
        error: "canvassed_contacts_warning",
        canvassedCount,
        message: `${canvassedCount} contact${canvassedCount !== 1 ? "s" : ""} from this import have been canvassed since it was imported. Rolling back will hide those contacts and their canvassing data. Pass force: true to proceed anyway.`,
      },
      { status: 409 }
    );
  }

  // Soft-delete all imported contacts
  const result = await prisma.contact.updateMany({
    where: {
      id: { in: contactIds },
      campaignId,
    },
    data: {
      deletedAt: new Date(),
      deletedById: session!.user.id,
    },
  });

  // Mark the import as rolled back
  await prisma.importLog.update({
    where: { id: importLogId },
    data: { status: "rolled_back" },
  });

  await audit(prisma, "import.rolled_back", {
    campaignId,
    userId: session!.user.id,
    entityId: importLogId,
    entityType: "ImportLog",
    ip: req.headers.get("x-forwarded-for"),
    details: {
      filename: importLog.filename,
      contactsRolledBack: result.count,
    },
  });

  return NextResponse.json({
    message: `Rolled back ${result.count} contacts from import "${importLog.filename}"`,
    count: result.count,
  });
}
