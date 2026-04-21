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
  const rateLimitResponse = await rateLimit(req, "read");
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
      districtCode: true,
      party: true,
      partyName: true,
      bio: true,
      tagline: true,
      committeeRoles: true,
      profileMode: true,
      email: true,
      phone: true,
      website: true,
      photoUrl: true,
      subscriptionStatus: true,
      isClaimed: true,
      twitter: true,
      facebook: true,
      instagram: true,
      linkedIn: true,
      province: true,
      termStart: true,
      termEnd: true,
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
          websiteUrl: true,
          electionDate: true,
        },
        take: 3,
      },
      // Live approval rating — raw counts; we compute pct in this handler
      approvalRating: {
        select: {
          score: true,
          netScore: true,
          positiveCount: true,
          negativeCount: true,
          neutralCount: true,
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
          externalUrl: true,
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

  // Compute approval percentages from raw counts (fix: client expects pct, API stores counts)
  const approvalRating = official.approvalRating
    ? (() => {
        const { positiveCount, negativeCount, totalSignals, score, netScore, updatedAt } =
          official.approvalRating;
        const approvalPct =
          totalSignals > 0 ? Math.round((positiveCount / totalSignals) * 100) : 0;
        const disapprovalPct =
          totalSignals > 0 ? Math.round((negativeCount / totalSignals) * 100) : 0;
        const neutralPct = 100 - approvalPct - disapprovalPct;
        return {
          approvalPct,
          disapprovalPct,
          neutralPct: Math.max(0, neutralPct),
          totalSignals,
          score,
          netScore,
          updatedAt: updatedAt.toISOString(),
        };
      })()
    : null;

  // Promises tracker — up to 5 most recent
  const promises = await prisma.officialPromise.findMany({
    where: { officialId: params.id },
    orderBy: { madeAt: "desc" },
    take: 5,
    select: {
      id: true,
      promise: true,
      madeAt: true,
      status: true,
      evidence: true,
      _count: { select: { trackers: true } },
    },
  });

  // Priorities — ordered by displayOrder
  const priorities = await prisma.officialPriority.findMany({
    where: { officialId: params.id, isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      title: true,
      body: true,
      icon: true,
      category: true,
    },
  });

  // Accomplishments — ordered by displayOrder
  const accomplishments = await prisma.officialAccomplishment.findMany({
    where: { officialId: params.id, isActive: true },
    orderBy: { displayOrder: "asc" },
    select: {
      id: true,
      title: true,
      description: true,
      year: true,
      category: true,
    },
  });

  // Gallery photos — ordered by displayOrder, take 12 for initial render
  const galleryPhotos = await prisma.officialGalleryPhoto.findMany({
    where: { officialId: params.id, isActive: true },
    orderBy: { displayOrder: "asc" },
    take: 12,
    select: {
      id: true,
      url: true,
      caption: true,
      context: true,
      altText: true,
    },
  });

  // Upcoming public events from official's linked campaigns
  const campaignIds = official.campaigns.map((c) => c.id);
  type EventRow = {
    id: string;
    name: string;
    eventDate: Date;
    location: string;
    city: string | null;
    description: string | null;
    eventType: string | null;
    isTownhall: boolean;
    isVirtual: boolean;
    virtualUrl: string | null;
    allowPublicRsvp: boolean;
    campaign: { slug: string | null };
  };
  let rawEvents: EventRow[] = [];
  if (campaignIds.length > 0) {
    rawEvents = await prisma.event.findMany({
      where: {
        campaignId: { in: campaignIds },
        isPublic: true,
        eventDate: { gte: new Date() },
        deletedAt: null,
      },
      orderBy: { eventDate: "asc" },
      take: 5,
      select: {
        id: true,
        name: true,
        eventDate: true,
        location: true,
        city: true,
        description: true,
        eventType: true,
        isTownhall: true,
        isVirtual: true,
        virtualUrl: true,
        allowPublicRsvp: true,
        campaign: { select: { slug: true } },
      },
    });
  }

  // Is the current user following this official?
  let isFollowing = false;
  let notificationPreference: string | null = null;
  let campaignConsents: {
    campaignId: string;
    consentId: string;
    signalType: string;
    isActive: boolean;
  }[] = [];
  let isSubscribedToNewsletter = false;

  if (userId) {
    const [follow, consents, newsletterSub] = await Promise.all([
      prisma.officialFollow.findUnique({
        where: { userId_officialId: { userId, officialId: params.id } },
      }),
      official.campaigns.length > 0
        ? prisma.consentLog.findMany({
            where: {
              userId,
              campaignId: { in: official.campaigns.map((c) => c.id) },
              revokedAt: null,
            },
            select: { id: true, campaignId: true, signalType: true, revokedAt: true },
          })
        : Promise.resolve([]),
      prisma.newsletterSubscriber.findFirst({
        where: { officialId: params.id, email: session?.user?.email ?? "", status: "active" },
        select: { id: true },
      }),
    ]);

    isFollowing = !!follow;
    notificationPreference = isFollowing ? "all" : null;
    isSubscribedToNewsletter = !!newsletterSub;
    campaignConsents = consents.map((c) => ({
      campaignId: c.campaignId,
      consentId: c.id,
      signalType: c.signalType,
      isActive: c.revokedAt === null,
    }));
  }

  return NextResponse.json({
    data: {
      ...official,
      termStart: official.termStart ? official.termStart.toISOString() : null,
      termEnd: official.termEnd ? official.termEnd.toISOString() : null,
      campaigns: official.campaigns.map((c) => ({
        ...c,
        electionDate: c.electionDate ? c.electionDate.toISOString() : null,
      })),
      approvalRating,
      events: rawEvents.map((e) => ({
        id: e.id,
        name: e.name,
        eventDate: e.eventDate.toISOString(),
        location: e.location,
        city: e.city,
        description: e.description,
        eventType: e.eventType,
        isTownhall: e.isTownhall,
        isVirtual: e.isVirtual,
        virtualUrl: e.virtualUrl,
        allowPublicRsvp: e.allowPublicRsvp,
        campaignSlug: e.campaign.slug,
      })),
      promises: promises.map((p) => ({
        id: p.id,
        promise: p.promise,
        madeAt: p.madeAt.toISOString(),
        status: p.status,
        evidence: p.evidence,
        trackerCount: p._count.trackers,
      })),
      priorities,
      accomplishments,
      galleryPhotos,
      isFollowing,
      notificationPreference,
      campaignConsents,
      isSubscribedToNewsletter,
    },
  });
}
