import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

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
  const rateLimitResponse = rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);

  const userId = session?.user?.id ?? null;

  // Build the where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const whereConditions: any[] = [{ isPublished: true }];

  if (userId) {
    // Get followed official IDs
    const follows = await prisma.officialFollow.findMany({
      where: { userId },
      select: { officialId: true },
    });
    const followedOfficialIds = follows.map((f) => f.officialId);

    if (followedOfficialIds.length > 0) {
      whereConditions.push({ officialId: { in: followedOfficialIds } });
    }

    // Also include posts matching user's municipality (derived from postal code)
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { postalCode: true },
    });
    if (user?.postalCode) {
      // Use first 3 chars of postal code as municipality proxy until we have full geo
      const postalPrefix = user.postalCode.replace(/\s/g, "").slice(0, 3).toUpperCase();
      whereConditions.push({ municipalScope: { contains: postalPrefix, mode: "insensitive" as const } });
    }
  }

  const where =
    whereConditions.length === 1
      ? whereConditions[0]
      : { AND: [{ isPublished: true }], OR: whereConditions.slice(1) };

  const cursorWhere = cursor ? { createdAt: { lt: new Date(cursor) } } : {};

  const posts = await prisma.politicianPost.findMany({
    where: { ...where, ...cursorWhere },
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

  // Indicate whether this is a discovery feed (no follows) so UI can show CTA
  const isDiscovery = userId
    ? (await prisma.officialFollow.count({ where: { userId } })) === 0
    : true;

  return NextResponse.json({
    data: posts,
    nextCursor,
    isDiscovery,
  });
}
