import { notFound } from "next/navigation";
import { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import CandidatePageClient, { type CampaignData, type PollData, type ElectionHistoryRow, type PageCustomization } from "./candidate-page-client";

interface PageProps {
  params: { slug: string };
}

/* ─── Helpers ─────────────────────────────────────────────────────────────── */

async function getElectionHistory(candidateName: string | null | undefined, officialName: string | null | undefined): Promise<ElectionHistoryRow[]> {
  const name = (candidateName || officialName)?.trim();
  if (!name) return [];
  const parts = name.split(/\s+/);
  const lastName = parts[parts.length - 1];
  try {
    return await prisma.electionResult.findMany({
      where: { candidateName: { contains: lastName, mode: "insensitive" }, electionType: "municipal" },
      orderBy: { electionDate: "desc" },
      take: 10,
      select: { id: true, electionDate: true, jurisdiction: true, candidateName: true, votesReceived: true, totalVotesCast: true, percentage: true, won: true },
    });
  } catch { return []; }
}

function levelToElectionType(level: string): string {
  if (level === "federal") return "federal";
  if (level === "provincial") return "provincial";
  return "municipal";
}

function levelBadge(level: string): string {
  const map: Record<string, string> = {
    federal: "Federal MP",
    provincial: "Provincial MPP",
    municipal: "Municipal Councillor",
  };
  return map[level] ?? "Official";
}

/* ─── Metadata ────────────────────────────────────────────────────────────── */

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: { candidateName: true, jurisdiction: true, electionType: true, candidateBio: true, isPublic: true, officialId: true, customization: true },
  });
  if (campaign?.isPublic || campaign?.officialId) {
    const cx = (campaign.customization ?? {}) as { metaTitle?: string; metaDescription?: string };
    const title = cx.metaTitle || `${campaign.candidateName} — ${campaign.jurisdiction}`;
    const description = cx.metaDescription || (campaign.candidateBio?.slice(0, 160) ?? `Vote for ${campaign.candidateName}.`);
    return {
      title,
      description,
      openGraph: { title, description, type: "website" },
    };
  }
  const official = await prisma.official.findFirst({ where: { externalId: params.slug }, select: { name: true, district: true } });
  if (official) {
    return { title: `${official.name} — ${official.district}`, description: `Official profile on Poll City.` };
  }
  return { title: "Candidate Not Found" };
}

/* ─── Page ────────────────────────────────────────────────────────────────── */

export default async function CandidatePage({ params }: PageProps) {
  // 1. Try campaign by slug
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    include: {
      official: {
        select: {
          id: true, isClaimed: true, name: true, firstName: true, lastName: true,
          title: true, level: true, photoUrl: true, website: true, twitter: true,
          facebook: true, instagram: true, linkedIn: true, phone: true, address: true, email: true,
          partyName: true, party: true,
        },
      },
      polls: {
        where: { isActive: true, visibility: "public" },
        include: { options: true, responses: { select: { optionId: true } } },
      },
      _count: { select: { contacts: { where: { supportLevel: "strong_support" } } } },
    },
  });
  // Note: pageViews increment is handled client-side via POST /api/campaigns/[id]/customization

  // 2. Campaign found and public (or has official) → show it
  if (campaign && (campaign.isPublic || campaign.official)) {
    const electionHistory = await getElectionHistory(campaign.candidateName, campaign.official?.name ?? null);

    const polls: PollData[] = campaign.polls.map((poll: {
      id: string; question: string;
      options: { id: string; text: string }[];
      responses: { optionId: string | null }[];
    }) => {
      const validResponses = poll.responses.filter((r): r is { optionId: string } => r.optionId !== null);
      return {
        id: poll.id,
        question: poll.question,
        options: poll.options.map((opt: { id: string; text: string }) => ({
          id: opt.id,
          text: opt.text,
          count: validResponses.filter((r: { optionId: string }) => r.optionId === opt.id).length,
          percentage: validResponses.length > 0
            ? Math.round((validResponses.filter((r: { optionId: string }) => r.optionId === opt.id).length / validResponses.length) * 100)
            : 0,
        })),
      };
    });

    const campaignData: CampaignData = {
      id: campaign.id,
      slug: campaign.slug,
      candidateName: campaign.candidateName,
      candidateTitle: campaign.candidateTitle,
      candidateBio: campaign.candidateBio,
      jurisdiction: campaign.jurisdiction,
      electionType: campaign.electionType,
      logoUrl: campaign.logoUrl,
      primaryColor: campaign.primaryColor,
      supporterCount: campaign._count.contacts,
      customization: (campaign.customization ?? null) as PageCustomization | null,
      official: campaign.official
        ? {
            id: campaign.official.id,
            isClaimed: campaign.official.isClaimed,
            name: campaign.official.name,
            title: campaign.official.title,
            level: String(campaign.official.level),
            levelBadge: levelBadge(String(campaign.official.level)),
            photoUrl: campaign.official.photoUrl,
            website: campaign.official.website,
            twitter: campaign.official.twitter,
            facebook: campaign.official.facebook,
            instagram: campaign.official.instagram,
            linkedIn: campaign.official.linkedIn,
            phone: campaign.official.phone,
            address: campaign.official.address,
            email: campaign.official.email,
            partyName: campaign.official.partyName,
            party: campaign.official.party,
          }
        : null,
    };

    return <CandidatePageClient campaign={campaignData} polls={polls} electionHistory={electionHistory} />;
  }

  // 3. No campaign → try official by externalId
  const official = await prisma.official.findFirst({
    where: { externalId: params.slug },
    select: {
      id: true, isClaimed: true, name: true, firstName: true, lastName: true,
      title: true, level: true, photoUrl: true, website: true, twitter: true,
      facebook: true, instagram: true, linkedIn: true, phone: true, address: true, email: true, district: true,
      partyName: true, party: true,
    },
  });

  if (official) {
    const electionHistory = await getElectionHistory(null, official.name);

    const campaignData: CampaignData = {
      id: official.id,
      slug: params.slug,
      candidateName: official.name,
      candidateTitle: official.title ?? null,
      candidateBio: null,
      jurisdiction: official.district,
      electionType: levelToElectionType(String(official.level)),
      logoUrl: null,
      primaryColor: "#1E3A8A",
      supporterCount: 0,
      official: {
        id: official.id,
        isClaimed: official.isClaimed,
        name: official.name,
        title: official.title ?? null,
        level: String(official.level),
        levelBadge: levelBadge(String(official.level)),
        photoUrl: official.photoUrl,
        website: official.website,
        twitter: official.twitter,
        facebook: official.facebook,
        instagram: official.instagram,
        linkedIn: official.linkedIn,
        phone: official.phone,
        address: official.address,
        email: official.email,
        partyName: official.partyName,
        party: official.party,
      },
    };

    return <CandidatePageClient campaign={campaignData} polls={[]} electionHistory={electionHistory} />;
  }

  notFound();
}
