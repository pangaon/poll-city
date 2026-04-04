import { notFound } from "next/navigation";
import { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import CandidatePageClient from "./candidate-page-client";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    select: {
      candidateName: true,
      jurisdiction: true,
      electionType: true,
      candidateBio: true,
    },
  });

  if (!campaign) {
    return {
      title: "Candidate Not Found",
    };
  }

  return {
    title: `${campaign.candidateName} - ${campaign.jurisdiction}`,
    description: campaign.candidateBio?.slice(0, 160) || `Vote for ${campaign.candidateName} in the ${campaign.electionType} election.`,
    openGraph: {
      title: `${campaign.candidateName} - ${campaign.jurisdiction}`,
      description: campaign.candidateBio?.slice(0, 160),
      type: "website",
    },
  };
}

export default async function CandidatePage({ params }: PageProps) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.slug },
    include: {
      polls: {
        where: { isActive: true, visibility: "public" },
        include: {
          options: true,
          responses: {
            select: { optionId: true },
          },
        },
      },
      _count: {
        select: {
          contacts: {
            where: { supportLevel: "strong_support" },
          },
        },
      },
    },
  });

  if (!campaign) {
    notFound();
  }

  // Calculate poll results
  const pollsWithResults = campaign.polls.map(poll => ({
    id: poll.id,
    question: poll.question,
    options: poll.options.map(option => ({
      id: option.id,
      text: option.text,
      count: poll.responses.filter(r => r.optionId === option.id).length,
      percentage: poll.responses.length > 0
        ? Math.round((poll.responses.filter(r => r.optionId === option.id).length / poll.responses.length) * 100)
        : 0,
    })),
  }));

  return (
    <CandidatePageClient
      campaign={{
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
      }}
      polls={pollsWithResults}
    />
  );
}