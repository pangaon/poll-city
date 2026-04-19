import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

/**
 * GET /api/social/feed
 *
 * Returns a combined feed of PoliticianPosts for the authenticated user.
 * Feed sources:
 *  1. Posts from officials the user follows (via OfficialFollow)
 *  2. Posts matching the user's municipality (via postalCode → municipalScope)
 *  3. If no follows, returns recent published posts platform-wide (discovery mode)
 *
 * Query params:
 *  - cursor: ISO date string for pagination (before this date)
 *  - limit: default 20
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const userId = session?.user?.id ?? null;

  const orConditions: Prisma.PoliticianPostWhereInput[] = [];

  if (userId) {
    // Posts from followed officials
    const follows = await prisma.officialFollow.findMany({
      where: { userId },
      select: { officialId: true },
    });
    const followedOfficialIds = follows.map((f) => f.officialId);

    if (followedOfficialIds.length > 0) {
      orConditions.push({ officialId: { in: followedOfficialIds } });
    }

    // Posts matching user's municipality (postal code prefix as proxy)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { postalCode: true },
    });
    if (user?.postalCode) {
      const postalPrefix = user.postalCode.replace(/\s/g, "").slice(0, 3).toUpperCase();
      orConditions.push({
        municipalScope: { contains: postalPrefix, mode: "insensitive" },
      });
    }
  }

  const where: Prisma.PoliticianPostWhereInput = {
    isPublished: true,
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    ...(orConditions.length > 0 ? { OR: orConditions } : {}),
  };

  const posts = await prisma.politicianPost.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: limit,
    select: {
      id: true,
      postType: true,
      title: true,
      body: true,
      authorName: true,
      imageUrl: true,
      municipalScope: true,
      pollId: true,
      createdAt: true,
      officialId: true,
      campaignId: true,
      official: {
        select: {
          id: true,
          name: true,
          title: true,
          level: true,
          district: true,
          photoUrl: true,
          subscriptionStatus: true,
        },
      },
      campaign: {
        select: {
          id: true,
          name: true,
          slug: true,
          candidateName: true,
          logoUrl: true,
        },
      },
      poll: {
        select: {
          id: true,
          question: true,
          type: true,
          totalResponses: true,
          isActive: true,
        },
      },
    },
  });

  const nextCursor =
    posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;

  // Discovery mode when user has no follows
  const isDiscovery = userId
    ? (await prisma.officialFollow.count({ where: { userId } })) === 0
    : true;

  return NextResponse.json({
    data: posts,
    nextCursor,
    isDiscovery,
  });
}
