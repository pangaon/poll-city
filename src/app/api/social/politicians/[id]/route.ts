import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

/**
 * GET /api/social/politicians/[id]
 *
 * Unified politician profile for both elected officials and candidates.
 * [id] is always an Official.id — candidates running for office are linked
 * via Official.campaigns. The profile merges both contexts.
 */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimit(req, "api");
  if (rateLimitResponse) return rateLimitResponse;

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id ?? null;

  const official = await prisma.official.findUnique({
    where: { id: params.id, isActive: true },
    select: {
      id: true,
      name: true,
      title: true,
      level: true,
      district: true,
      party: true,
      partyName: true,
      bio: true,
      email: true,
      phone: true,
      website: true,
      photoUrl: true,
      subscriptionStatus: true,
      isClaimed: true,
      twitter: true,
      facebook: true,
      instagram: true,
      province: true,
      _count: {
        select: {
          follows: true,
          questions: true,
          politicianPosts: true,
        },
      },
      // Linked campaigns — running for office or active campaigns
      campaigns: {
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          slug: true,
          candidateName: true,
          candidateTitle: true,
          logoUrl: true,
        },
        take: 3,
      },
      // Live approval rating
      approvalRating: {
        select: {
          approvalPct: true,
          disapprovalPct: true,
          neutralPct: true,
          totalSignals: true,
          updatedAt: true,
        },
      },
      // Recent posts
      politicianPosts: {
        where: { isPublished: true },
        orderBy: { createdAt: "desc" },
        take: 10,
        select: {
          id: true,
          postType: true,
          title: true,
          body: true,
          pollId: true,
          imageUrl: true,
          createdAt: true,
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
      },
      // Recent questions from constituents
      questions: {
        orderBy: { createdAt: "desc" },
        take: 5,
        select: {
          id: true,
          question: true,
          answer: true,
          answeredAt: true,
          upvotes: true,
          createdAt: true,
          user: { select: { name: true } },
        },
      },
    },
  });

  if (!official) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Is the current user following this official?
  let isFollowing = false;
  let notificationPreference: string | null = null;
  if (userId) {
    const follow = await prisma.officialFollow.findUnique({
      where: { userId_officialId: { userId, officialId: params.id } },
    });
    isFollowing = !!follow;
    // notificationPreference stored on OfficialFollow — not currently in schema,
    // default to "all" if following
    notificationPreference = isFollowing ? "all" : null;
  }

  return NextResponse.json({
    data: {
      ...official,
      isFollowing,
      notificationPreference,
    },
  });
}
