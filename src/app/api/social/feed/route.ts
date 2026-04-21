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
 *
 * Tabs:
 *  FOR YOU (default) — posts from followed officials + geo-matched posts
 *  LOCAL (local=true) — posts strictly from the user's municipality/ward
 *
 * Discovery mode (no follows, no geo): returns recent platform-wide posts.
 *
 * Query params:
 *  - cursor: ISO date string for pagination (before this date)
 *  - limit: default 20, max 50
 *  - local: "true" for LOCAL tab
 */
export async function GET(req: NextRequest) {
  const rateLimitResponse = await rateLimit(req, "read");
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  const { searchParams } = new URL(req.url);
  const cursor = searchParams.get("cursor");
  const limit = Math.min(parseInt(searchParams.get("limit") ?? "20", 10), 50);
  const isLocal = searchParams.get("local") === "true";

  const userId = session?.user?.id ?? null;

  const orConditions: Prisma.PoliticianPostWhereInput[] = [];

  if (isLocal) {
    // LOCAL tab: strict municipality filter using CivicProfile.municipality or User.postalCode
    let municipality: string | null = null;
    let postalPrefix: string | null = null;

    if (userId) {
      const [civicProfile, user] = await Promise.all([
        prisma.civicProfile.findUnique({
          where: { userId },
          select: { municipality: true },
        }),
        prisma.user.findUnique({
          where: { id: userId },
          select: { postalCode: true, ward: true },
        }),
      ]);
      municipality = civicProfile?.municipality ?? null;
      if (!municipality && user?.postalCode) {
        postalPrefix = user.postalCode.replace(/\s/g, "").slice(0, 3).toUpperCase();
      }
    }

    if (municipality) {
      orConditions.push({ municipalScope: { equals: municipality, mode: "insensitive" } });
    } else if (postalPrefix) {
      orConditions.push({ municipalScope: { contains: postalPrefix, mode: "insensitive" } });
    }
    // If no geo info at all, LOCAL returns empty (no discovery fallback — user needs to set location)
  } else {
    // FOR YOU tab: follows-based + geo blend
    if (userId) {
      const [follows, user] = await Promise.all([
        prisma.officialFollow.findMany({ where: { userId }, select: { officialId: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { postalCode: true } }),
      ]);

      const followedOfficialIds = follows.map((f) => f.officialId);
      if (followedOfficialIds.length > 0) {
        orConditions.push({ officialId: { in: followedOfficialIds } });
      }

      if (user?.postalCode) {
        const postalPrefix = user.postalCode.replace(/\s/g, "").slice(0, 3).toUpperCase();
        orConditions.push({ municipalScope: { contains: postalPrefix, mode: "insensitive" } });
      }
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
      reactionCount: true,
      commentCount: true,
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

  // Attach userReacted flag for authenticated users
  let userReactedSet = new Set<string>();
  if (userId && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const reactions = await prisma.postReaction.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    userReactedSet = new Set(reactions.map((r) => r.postId));
  }

  const enriched = posts.map((p) => ({
    ...p,
    userReacted: userReactedSet.has(p.id),
  }));

  const nextCursor =
    posts.length === limit ? posts[posts.length - 1].createdAt.toISOString() : null;

  // Discovery mode: FOR YOU with no follows, or LOCAL with no geo info
  let isDiscovery = false;
  let needsLocation = false;
  if (isLocal && orConditions.length === 0) {
    needsLocation = true; // user has no geo — LOCAL shows prompt
  } else if (!isLocal && userId) {
    isDiscovery = (await prisma.officialFollow.count({ where: { userId } })) === 0;
  } else if (!userId) {
    isDiscovery = true;
  }

  return NextResponse.json({
    data: enriched,
    nextCursor,
    isDiscovery,
    needsLocation,
  });
}
