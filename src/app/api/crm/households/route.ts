import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { apiAuth } from "@/lib/auth/helpers";

/**
 * GET /api/crm/households
 * List households with pagination, search, and basic stats.
 * Any campaign member can call this.
 */
export async function GET(req: NextRequest) {
  const { session, error } = await apiAuth(req);
  if (error) return error;

  const sp = req.nextUrl.searchParams;
  const campaignId = sp.get("campaignId");
  if (!campaignId) return NextResponse.json({ error: "campaignId required" }, { status: 400 });

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session!.user.id, campaignId } },
  });
  if (!membership) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const page = Math.max(1, parseInt(sp.get("page") ?? "1", 10));
  const limit = Math.min(100, parseInt(sp.get("limit") ?? "50", 10));
  const query = sp.get("query")?.trim() ?? "";
  const ward = sp.get("ward") ?? undefined;
  const visited = sp.get("visited");

  const where = {
    campaignId,
    ...(ward ? { ward } : {}),
    ...(visited === "true" ? { visited: true } : visited === "false" ? { visited: false } : {}),
    ...(query ? {
      OR: [
        { address1: { contains: query, mode: "insensitive" as const } },
        { city: { contains: query, mode: "insensitive" as const } },
        { postalCode: { contains: query, mode: "insensitive" as const } },
      ],
    } : {}),
  };

  const [households, total] = await Promise.all([
    prisma.household.findMany({
      where,
      orderBy: { address1: "asc" },
      skip: (page - 1) * limit,
      take: limit,
      include: {
        contacts: {
          where: { deletedAt: null },
          select: {
            id: true, firstName: true, lastName: true,
            supportLevel: true, phone: true, email: true,
          },
        },
      },
    }),
    prisma.household.count({ where }),
  ]);

  return NextResponse.json({
    data: households,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}
