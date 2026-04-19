import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import { rateLimit } from "@/lib/rate-limit";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const rateLimitResponse = rateLimit(req, "read");
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
      termStart: true,
      termEnd: true,
      _count: {
        select: {
          follows: true,
          questions: true,
          politicianPosts: true,
        },
      },
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

  // Compute approval percentages from raw counts
  const approvalRating = official.approvalRating
    ? (() => {
        const {
          positiveCount,
          negativeCount,
          totalSignals,
          score,
          netScore,
          updatedAt,
        } = official.approvalRating;
        const approvalPct =
          totalSignals > 0 ? Math.round((positiveCount / totalSignals) * 100) : 0;
        const disapprovalPct =
          totalSignals > 0 ? Math.round((negativeCount / totalSignals) * 100) : 0;
        const neutralPct = Math.max(0, 100 - approvalPct - disapprovalPct);
        return {
          approvalPct,
          disapprovalPct,
          neutralPct,
          totalSignals,
          score,
          netScore,
          updatedAt: updatedAt.toISOString(),
        };
      })()
    : null;

  const campaignIds = official.campaigns.map((c) => c.id);

  // Run parallel queries for promises, events, follow/consent state
  const [promises, events, followResult] = await Promise.all([
    prisma.officialPromise.findMany({
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
    }),
    campaignIds.length > 0
      ? prisma.event.findMany({
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
        })
      : Promise.resolve([] as Awaited<ReturnType<typeof prisma.event.findMany>>),
    userId
      ? Promise.all([
          prisma.officialFollow.findUnique({
            where: { userId_officialId: { userId, officialId: params.id } },
          }),
          campaignIds.length > 0
            ? prisma.consentLog.findMany({
                where: {
                  userId,
                  campaignId: { in: campaignIds },
                  revokedAt: null,
                },
                select: { id: true, campaignId: true, signalType: true, revokedAt: true },
              })
            : Promise.resolve([] as Awaited<ReturnType<typeof prisma.consentLog.findMany>>),
          session?.user?.email
            ? prisma.newsletterSubscriber.findFirst({
                where: {
                  officialId: params.id,
                  email: session.user.email,
                  status: "active",
                },
                select: { id: true },
              })
            : Promise.resolve(null),
        ])
      : Promise.resolve([null, [] as Awaited<ReturnType<typeof prisma.consentLog.findMany>>, null] as const),
  ]);

  let isFollowing = false;
  let notificationPreference: string | null = null;
  let campaignConsents: {
    campaignId: string;
    consentId: string;
    signalType: string;
    isActive: boolean;
  }[] = [];
  let isSubscribedToNewsletter = false;

  if (userId && Array.isArray(followResult)) {
    const [follow, consents, newsletterSub] = followResult as [
      { userId: string; officialId: string } | null,
      Array<{ id: string; campaignId: string; signalType: string; revokedAt: Date | null }>,
      { id: string } | null,
    ];
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
      approvalRating,
      campaigns: official.campaigns.map((c) => ({
        ...c,
        electionDate: c.electionDate ? c.electionDate.toISOString() : null,
      })),
      termStart: official.termStart ? official.termStart.toISOString() : null,
      termEnd: official.termEnd ? official.termEnd.toISOString() : null,
      promises: promises.map((p) => ({
        id: p.id,
        promise: p.promise,
        madeAt: p.madeAt.toISOString(),
        status: p.status,
        evidence: p.evidence,
        trackerCount: p._count.trackers,
      })),
      events: events.map((e) => ({
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
      isFollowing,
      notificationPreference,
      campaignConsents,
      isSubscribedToNewsletter,
    },
  });
}
