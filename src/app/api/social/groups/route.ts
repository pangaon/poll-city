import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

const SEED_GROUPS = [
  { name: "Housing & Development", topic: "housing" as const, description: "Development applications, zoning changes, affordable housing policy." },
  { name: "Transit & Mobility", topic: "transit" as const, description: "Bus routes, cycling infrastructure, road repair, transit funding." },
  { name: "Parks & Recreation", topic: "parks" as const, description: "Park programs, green space protection, community centres." },
  { name: "Community Safety", topic: "safety" as const, description: "Neighbourhood safety, traffic calming, lighting, bylaw enforcement." },
  { name: "Environment & Climate", topic: "environment" as const, description: "Climate action, tree canopy, waste reduction, energy." },
  { name: "Budget & Spending", topic: "budget" as const, description: "Municipal budget votes, tax rates, spending priorities." },
];

/**
 * GET /api/social/groups
 * Returns all civic interest groups. Seeds defaults if none exist.
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = rateLimit(req, "api");
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  let groups = await prisma.civicInterestGroup.findMany({
    orderBy: [{ topic: "asc" }, { memberCount: "desc" }],
    select: {
      id: true,
      name: true,
      description: true,
      topic: true,
      municipality: true,
      memberCount: true,
      createdAt: true,
      _count: { select: { members: true } },
    },
  });

  // Seed default groups if none exist
  if (groups.length === 0) {
    await prisma.civicInterestGroup.createMany({
      data: SEED_GROUPS,
      skipDuplicates: true,
    });
    groups = await prisma.civicInterestGroup.findMany({
      orderBy: { topic: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        topic: true,
        municipality: true,
        memberCount: true,
        createdAt: true,
        _count: { select: { members: true } },
      },
    });
  }

  // If authenticated, mark which groups the user has joined
  let joinedGroupIds = new Set<string>();
  if (userId) {
    const memberships = await prisma.civicGroupMember.findMany({
      where: { userId },
      select: { groupId: true },
    });
    joinedGroupIds = new Set(memberships.map((m) => m.groupId));
  }

  const result = groups.map((g) => ({
    ...g,
    memberCount: g._count.members,
    isJoined: joinedGroupIds.has(g.id),
  }));

  return NextResponse.json({ data: result });
}
