import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * GET /api/crm/contacts/[id]/audit
 * Paginated audit log for a contact. CAMPAIGN_MANAGER+ only.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const contact = await prisma.contact.findUnique({
    where: { id: params.id, deletedAt: null },
    select: { id: true, campaignId: true },
  });
  if (!contact) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId: contact.campaignId } },
  });
  if (!membership || !["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER"].includes(membership.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const sp = req.nextUrl.searchParams;
  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "50", 10));
  const entityType = sp.get("entityType");
  const action = sp.get("action");

  const where = {
    contactId: params.id,
    ...(entityType ? { entityType } : {}),
    ...(action ? { action } : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.contactAuditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * limit,
      take: limit,
    }),
    prisma.contactAuditLog.count({ where }),
  ]);

  // Resolve actor names separately (no relation on ContactAuditLog for actor)
  const actorIds = Array.from(new Set(logs.map(l => l.actorUserId).filter(Boolean) as string[]));
  const actors = await prisma.user.findMany({
    where: { id: { in: actorIds } },
    select: { id: true, name: true },
  });
  const actorMap = new Map(actors.map(a => [a.id, a.name]));

  const enriched = logs.map(log => ({
    ...log,
    actorName: log.actorUserId ? actorMap.get(log.actorUserId) ?? null : null,
  }));

  return NextResponse.json({
    data: enriched,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
