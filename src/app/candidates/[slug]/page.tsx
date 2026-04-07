import { type Metadata } from "next";
import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import CandidatePageClient, { type CandidatePageData, type CandidatePageCustomization } from "@/components/public/candidate-site/candidate-page-client";

export const dynamic = "force-dynamic";

interface PageProps {
  params: { slug: string };
}

type CustomIssue = {
  id: string;
  title: string;
  summary?: string;
  details?: string;
  order?: number;
};

type CustomEndorsement = {
  id: string;
  name: string;
  role?: string;
  quote: string;
  photoUrl?: string;
};

type CustomFaq = {
  id: string;
  q: string;
  a: string;
};

function mapCustomization(raw: unknown): CandidatePageCustomization {
  const cx = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const issueItems = Array.isArray(cx.platformItems) ? cx.platformItems : Array.isArray(cx.platform) ? cx.platform : [];
  const endorsementItems = Array.isArray(cx.endorsements) ? cx.endorsements : [];
  const faqItems = Array.isArray(cx.customFaq) ? cx.customFaq : [];

  const issues: CustomIssue[] = issueItems
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `issue-${index}`,
      title: typeof item.title === "string" ? item.title : (typeof item.q === "string" ? item.q : "Priority Issue"),
      summary: typeof item.summary === "string" ? item.summary : (typeof item.description === "string" ? item.description : undefined),
      details: typeof item.details === "string" ? item.details : (typeof item.body === "string" ? item.body : undefined),
      order: typeof item.order === "number" ? item.order : index,
    }));

  const endorsements: CustomEndorsement[] = endorsementItems
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `endorsement-${index}`,
      name: typeof item.name === "string" ? item.name : (typeof item.org === "string" ? item.org : "Community Supporter"),
      role: typeof item.role === "string" ? item.role : undefined,
      quote: typeof item.quote === "string" ? item.quote : "Proud to support this campaign.",
      photoUrl: typeof item.photoUrl === "string" ? item.photoUrl : undefined,
    }));

  const faqs: CustomFaq[] = faqItems
    .filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null)
    .map((item, index) => ({
      id: typeof item.id === "string" ? item.id : `faq-${index}`,
      q: typeof item.q === "string" ? item.q : "Question",
      a: typeof item.a === "string" ? item.a : "Answer pending approval.",
    }));

  return {
    heroBannerUrl: typeof cx.heroBannerUrl === "string" ? cx.heroBannerUrl : undefined,
    backgroundImageUrl: typeof cx.backgroundImageUrl === "string" ? cx.backgroundImageUrl : undefined,
    candidatePhotoUrl: typeof cx.candidatePhotoUrl === "string" ? cx.candidatePhotoUrl : undefined,
    candidatePhotoUrl2: typeof cx.candidatePhotoUrl2 === "string" ? cx.candidatePhotoUrl2 : undefined,
    office: typeof cx.office === "string" ? cx.office : undefined,
    municipality: typeof cx.municipality === "string" ? cx.municipality : undefined,
    ward: typeof cx.ward === "string" ? cx.ward : undefined,
    boundaryGeoJSON: cx.boundaryGeoJSON,
    yearsInCommunity: typeof cx.yearsInCommunity === "number" ? cx.yearsInCommunity : undefined,
    communityConnections: Array.isArray(cx.communityConnections)
      ? cx.communityConnections.filter((x): x is string => typeof x === "string")
      : [],
    videoUrl: typeof cx.videoUrl === "string" ? cx.videoUrl : undefined,
    gallery: Array.isArray(cx.gallery)
      ? cx.gallery
          .filter((x): x is Record<string, unknown> => typeof x === "object" && x !== null)
          .map((x, i) => ({
            id: typeof x.id === "string" ? x.id : `gallery-${i}`,
            url: typeof x.url === "string" ? x.url : "",
            caption: typeof x.caption === "string" ? x.caption : undefined,
            order: typeof x.order === "number" ? x.order : i,
          }))
          .filter((x) => x.url)
      : [],
    issues,
    endorsements,
    faqs,
  };
}

async function getCandidatePageData(slug: string): Promise<CandidatePageData | null> {
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: {
      id: true,
      slug: true,
      name: true,
      electionType: true,
      electionDate: true,
      jurisdiction: true,
      candidateName: true,
      candidateTitle: true,
      candidateBio: true,
      candidateEmail: true,
      candidatePhone: true,
      logoUrl: true,
      primaryColor: true,
      secondaryColor: true,
      accentColor: true,
      tagline: true,
      websiteUrl: true,
      twitterHandle: true,
      facebookUrl: true,
      instagramHandle: true,
      customization: true,
      isPublic: true,
      officialId: true,
      official: {
        select: {
          isClaimed: true,
          linkedIn: true,
        },
      },
      _count: {
        select: {
          contacts: true,
          volunteerProfiles: true,
        },
      },
      polls: {
        where: { isActive: true },
        orderBy: { createdAt: "desc" },
        take: 1,
        select: {
          id: true,
          question: true,
          totalResponses: true,
          options: {
            select: { id: true, text: true, _count: { select: { responses: true } } },
            orderBy: { order: "asc" },
          },
        },
      },
      events: {
        where: { isPublic: true, status: { in: ["scheduled", "live"] }, eventDate: { gte: new Date() } },
        orderBy: { eventDate: "asc" },
        take: 6,
        select: {
          id: true,
          name: true,
          eventDate: true,
          location: true,
          city: true,
          province: true,
          postalCode: true,
          lat: true,
          lng: true,
          description: true,
          isVirtual: true,
          virtualUrl: true,
          _count: { select: { rsvps: true } },
        },
      },
    },
  });

  if (!campaign || !campaign.isPublic) return null;

  const customization = mapCustomization(campaign.customization);

  // Fetch election history for this candidate
  const candidateName = campaign.candidateName ?? campaign.name;
  const electionHistory = await prisma.electionResult.findMany({
    where: { candidateName: { equals: candidateName, mode: "insensitive" } },
    orderBy: { electionDate: "desc" },
    take: 10,
    select: {
      id: true,
      electionDate: true,
      electionType: true,
      jurisdiction: true,
      candidateName: true,
      partyName: true,
      votesReceived: true,
      totalVotesCast: true,
      percentage: true,
      won: true,
    },
  });

  // Count doors knocked from activity logs
  const doorsKnockedCount = await prisma.activityLog.count({
    where: { campaignId: campaign.id, action: { in: ["door_knock", "canvass_response"] } },
  });

  const activePoll = campaign.polls[0] ?? null;

  return {
    id: campaign.id,
    slug: campaign.slug,
    campaignName: campaign.name,
    candidateName,
    candidateTitle: campaign.candidateTitle ?? "Candidate",
    candidateBio: campaign.candidateBio,
    candidateEmail: campaign.candidateEmail,
    candidatePhone: campaign.candidatePhone,
    tagline: campaign.tagline,
    electionType: campaign.electionType,
    electionDate: campaign.electionDate,
    jurisdiction: campaign.jurisdiction,
    logoUrl: campaign.logoUrl,
    primaryColor: campaign.primaryColor ?? "#0A2342",
    accentColor: campaign.accentColor ?? campaign.secondaryColor ?? "#1D9E75",
    websiteUrl: campaign.websiteUrl,
    twitterHandle: campaign.twitterHandle,
    facebookUrl: campaign.facebookUrl,
    instagramHandle: campaign.instagramHandle,
    linkedInUrl: campaign.official?.linkedIn ?? null,
    isVerified: campaign.official?.isClaimed ?? false,
    supporterCount: campaign._count.contacts,
    volunteerCount: campaign._count.volunteerProfiles,
    doorsKnockedCount,
    activePoll: activePoll
      ? {
          id: activePoll.id,
          title: activePoll.question,
          totalResponses: activePoll.totalResponses,
          options: activePoll.options.map((o: { id: string; text: string; _count: { responses: number } }) => ({
            id: o.id,
            text: o.text,
            votes: o._count.responses,
          })),
        }
      : null,
    electionHistory: electionHistory.map((r) => ({
      id: r.id,
      electionDate: r.electionDate,
      electionType: r.electionType,
      jurisdiction: r.jurisdiction,
      partyName: r.partyName,
      votesReceived: r.votesReceived,
      totalVotesCast: r.totalVotesCast,
      percentage: r.percentage,
      won: r.won,
    })),
    events: campaign.events.map((event) => ({
      id: event.id,
      name: event.name,
      eventDate: event.eventDate,
      location: event.location,
      city: event.city,
      province: event.province,
      postalCode: event.postalCode,
      lat: event.lat,
      lng: event.lng,
      description: event.description,
      isVirtual: event.isVirtual,
      virtualUrl: event.virtualUrl,
      rsvpCount: event._count.rsvps,
    })),
    customization,
  };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await getCandidatePageData(params.slug);
  if (!data) {
    return {
      title: "Candidate Not Found",
      description: "The requested campaign page could not be found.",
    };
  }

  const electionYear = data.electionDate ? new Date(data.electionDate).getFullYear() : new Date().getFullYear();
  const title = `${data.candidateName} for ${data.candidateTitle} — ${data.jurisdiction ?? "Your Community"} ${electionYear}`;
  const description =
    data.tagline ||
    `${data.candidateName} is running for ${data.candidateTitle} in ${data.jurisdiction ?? "their community"}. Learn the platform, upcoming events, and ways to get involved.`;
  const ogImage = data.customization.candidatePhotoUrl || data.logoUrl || undefined;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "profile",
      url: `https://poll.city/candidates/${data.slug}`,
      images: ogImage ? [{ url: ogImage }] : [],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: ogImage ? [ogImage] : [],
    },
  };
}

export default async function CandidatePage({ params }: PageProps) {
  const pageData = await getCandidatePageData(params.slug);
  if (!pageData) notFound();
  return <CandidatePageClient campaign={pageData} />;
}
