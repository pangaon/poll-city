import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";
import { Prisma } from "@prisma/client";

/**
 * GET /api/social/feed
 *
 * Returns a combined feed of PoliticianPosts + community Polls.
 *
 * Tabs:
 *  FOR YOU (default) — posts from followed officials + geo-matched posts + local community polls
 *  LOCAL (local=true) — posts strictly from the user's municipality/ward + local polls
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

  let municipality: string | null = null;
  let postalPrefix: string | null = null;

  if (isLocal) {
    // LOCAL tab: strict municipality filter
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
  } else {
    // FOR YOU tab: follows-based + geo blend
    if (userId) {
      const [follows, user, civicProfile] = await Promise.all([
        prisma.officialFollow.findMany({ where: { userId }, select: { officialId: true } }),
        prisma.user.findUnique({ where: { id: userId }, select: { postalCode: true } }),
        prisma.civicProfile.findUnique({ where: { userId }, select: { municipality: true } }),
      ]);

      const followedOfficialIds = follows.map((f) => f.officialId);
      if (followedOfficialIds.length > 0) {
        orConditions.push({ officialId: { in: followedOfficialIds } });
      }

      if (civicProfile?.municipality) {
        municipality = civicProfile.municipality;
        orConditions.push({
          municipalScope: { equals: civicProfile.municipality, mode: "insensitive" },
        });
      } else if (user?.postalCode) {
        postalPrefix = user.postalCode.replace(/\s/g, "").slice(0, 3).toUpperCase();
        orConditions.push({ municipalScope: { contains: postalPrefix, mode: "insensitive" } });
      }
    }
  }

  const postWhere: Prisma.PoliticianPostWhereInput = {
    isPublished: true,
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    ...(orConditions.length > 0 ? { OR: orConditions } : {}),
  };

  // Community poll where-clause: public polls with no campaign/official attachment
  const pollWhere: Prisma.PollWhereInput = {
    campaignId: null,
    officialId: null,
    createdByUserId: { not: null },
    isActive: true,
    visibility: "public",
    ...(cursor ? { createdAt: { lt: new Date(cursor) } } : {}),
    ...(municipality
      ? { targetRegion: { equals: municipality, mode: "insensitive" } }
      : postalPrefix
      ? { targetRegion: { contains: postalPrefix, mode: "insensitive" } }
      : {}),
  };

  const [posts, communityPolls] = await Promise.all([
    prisma.politicianPost.findMany({
      where: postWhere,
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
    }),
    prisma.poll.findMany({
      where: pollWhere,
      orderBy: { createdAt: "desc" },
      take: limit,
      select: {
        id: true,
        question: true,
        type: true,
        totalResponses: true,
        targetRegion: true,
        endsAt: true,
        createdAt: true,
        createdByUserId: true,
        options: { orderBy: { order: "asc" }, select: { id: true, text: true } },
      },
    }),
  ]);

  // Attach userReacted flag for authenticated users (posts)
  let userReactedSet = new Set<string>();
  if (userId && posts.length > 0) {
    const postIds = posts.map((p) => p.id);
    const reactions = await prisma.postReaction.findMany({
      where: { userId, postId: { in: postIds } },
      select: { postId: true },
    });
    userReactedSet = new Set(reactions.map((r) => r.postId));
  }

  // Attach userVoted flag for authenticated users (community polls)
  const pollVoteMap = new Map<string, { value: string | null; optionId: string | null }>();
  if (userId && communityPolls.length > 0) {
    const pollIds = communityPolls.map((p) => p.id);
    const votes = await prisma.pollResponse.findMany({
      where: { pollId: { in: pollIds }, userId },
      select: { pollId: true, value: true, optionId: true },
    });
    for (const v of votes) {
      pollVoteMap.set(v.pollId, { value: v.value, optionId: v.optionId });
    }
  }

  // Resolve creator display names
  const creatorIds = Array.from(new Set(communityPolls.map((p) => p.createdByUserId!)));
  const creators =
    creatorIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: creatorIds } },
          select: { id: true, name: true },
        })
      : [];
  const creatorMap = new Map(creators.map((u) => [u.id, u.name ?? "Anonymous"]));

  // Build typed items and merge-sort
  const postItems = posts.map((p) => ({
    _type: "post" as const,
    ...p,
    userReacted: userReactedSet.has(p.id),
    createdAt: p.createdAt.toISOString(),
  }));

  const pollItems = communityPolls.map((p) => {
    const vote = pollVoteMap.get(p.id) ?? null;
    return {
      _type: "community_poll" as const,
      id: p.id,
      question: p.question,
      type: p.type,
      totalResponses: p.totalResponses,
      targetRegion: p.targetRegion,
      endsAt: p.endsAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      createdByName: creatorMap.get(p.createdByUserId!) ?? "Anonymous",
      options: p.options,
      userVoted: vote !== null,
      userVoteValue: vote?.value ?? null,
      userVoteOptionId: vote?.optionId ?? null,
    };
  });

  // Merge and sort unified items by createdAt desc, then slice to limit
  const items = [...postItems, ...pollItems]
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .slice(0, limit);

  const nextCursor =
    items.length === limit ? items[items.length - 1].createdAt : null;

  // Discovery mode
  let isDiscovery = false;
  let needsLocation = false;
  if (isLocal && orConditions.length === 0) {
    needsLocation = true;
  } else if (!isLocal && userId) {
    isDiscovery = (await prisma.officialFollow.count({ where: { userId } })) === 0;
  } else if (!userId) {
    isDiscovery = true;
  }

  return NextResponse.json({
    data: items,
    nextCursor,
    isDiscovery,
    needsLocation,
  });
}
