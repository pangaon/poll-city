import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";
import { guardCampaignRoute } from "@/lib/permissions/engine";
import { parsePagination, paginate } from "@/lib/utils";
import { SignStatus } from "@prisma/client";

// ── GET /api/field/signs?campaignId=X ────────────────────────────────────────
// Field-ops view of signs: enriched with linked follow-up (sign_ops) and
// the canvasser who triggered the request.

export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) {
    return NextResponse.json({ error: "campaignId is required" }, { status: 400 });
  }

  const { forbidden } = await guardCampaignRoute(session!.user.id, campaignId, "canvassing:read");
  if (forbidden) return forbidden;

  const statusFilter = sp.get("status") as SignStatus | null;
  const search = sp.get("search")?.trim();
  const assignedUserId = sp.get("assignedUserId");

  // "queue" mode: only show sign_ops follow-ups that are pending (sign requests
  // that haven't been converted to a scheduled/installed sign yet)
  const queueMode = sp.get("queue") === "1";

  const validStatuses: SignStatus[] = ["requested", "scheduled", "installed", "removed", "declined"];

  const baseWhere = {
    campaignId,
    deletedAt: null,
    ...(statusFilter && validStatuses.includes(statusFilter) ? { status: statusFilter } : {}),
    ...(assignedUserId ? { assignedUserId } : {}),
    ...(search
      ? {
          OR: [
            { address1: { contains: search, mode: "insensitive" as const } },
            { city: { contains: search, mode: "insensitive" as const } },
            { postalCode: { contains: search, mode: "insensitive" as const } },
            { notes: { contains: search, mode: "insensitive" as const } },
            { contact: { firstName: { contains: search, mode: "insensitive" as const } } },
            { contact: { lastName: { contains: search, mode: "insensitive" as const } } },
          ],
        }
      : {}),
    ...(queueMode ? { status: "requested" as SignStatus } : {}),
  };

  const { page, pageSize, skip } = parsePagination(sp);

  const [signs, total] = await Promise.all([
    prisma.sign.findMany({
      where: baseWhere,
      orderBy: [{ status: "asc" }, { requestedAt: "desc" }],
      skip,
      take: pageSize,
      include: {
        contact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            phone: true,
            address1: true,
            city: true,
            postalCode: true,
          },
        },
        assignedUser: { select: { id: true, name: true } },
        followUpActions: {
          where: { followUpType: "sign_ops", deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 1,
          include: {
            fieldAttempt: {
              select: {
                id: true,
                attemptedAt: true,
                attemptedBy: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
    }),
    prisma.sign.count({ where: baseWhere }),
  ]);

  // Summary counts for the field command view
  const [counts] = await Promise.all([
    prisma.sign.groupBy({
      by: ["status"],
      where: { campaignId, deletedAt: null },
      _count: { id: true },
    }),
  ]);

  const summary = counts.reduce<Record<string, number>>((acc, row) => {
    acc[row.status] = row._count.id;
    return acc;
  }, {});

  return NextResponse.json({
    ...paginate(signs, total, page, pageSize),
    summary,
  });
}
