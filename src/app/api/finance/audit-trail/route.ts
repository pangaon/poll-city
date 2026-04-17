import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const p = req.nextUrl.searchParams;
  const campaignId = p.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  if (!["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER", "FINANCE"].includes(membership.role)) {
    return NextResponse.json({ error: "Insufficient permissions" }, { status: 403 });
  }

  const entityType = p.get("entityType");
  const from = p.get("from");
  const to = p.get("to");
  const limit = Math.min(Number(p.get("limit") ?? 50), 200);
  const offset = Number(p.get("offset") ?? 0);

  const [logs, total] = await Promise.all([
    prisma.financeAuditLog.findMany({
      where: {
        campaignId,
        ...(entityType ? { entityType } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.financeAuditLog.count({
      where: {
        campaignId,
        ...(entityType ? { entityType } : {}),
        ...(from || to
          ? {
              createdAt: {
                ...(from ? { gte: new Date(from) } : {}),
                ...(to ? { lte: new Date(to) } : {}),
              },
            }
          : {}),
      },
    }),
  ]);

  // Resolve actor names in one query
  const actorIds = Array.from(new Set(logs.map((l) => l.actorUserId).filter(Boolean))) as string[];
  const actors =
    actorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: actorIds } },
          select: { id: true, name: true },
        })
      : [];
  const actorMap = new Map(actors.map((a) => [a.id, a.name]));

  const data = logs.map((l) => ({
    id: l.id,
    entityType: l.entityType,
    entityId: l.entityId,
    action: l.action,
    actorName: l.actorUserId ? (actorMap.get(l.actorUserId) ?? "System") : "System",
    oldValue: l.oldValueJson,
    newValue: l.newValueJson,
    createdAt: l.createdAt,
  }));

  return NextResponse.json({ data, total });
}
