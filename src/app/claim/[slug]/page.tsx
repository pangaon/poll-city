import { notFound } from "next/navigation";
import { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import ClaimClient from "./claim-client";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const data = await resolveOfficial(params.slug);
  return {
    title: data
      ? `${data.official.name} — Launch Your Poll City Campaign`
      : "Claim Your Profile — Poll City",
    description: data
      ? `${data.official.name} is a ${data.official.title} for ${data.official.district}. Claim your Poll City profile to launch your campaign.`
      : undefined,
  };
}

async function resolveOfficial(slug: string) {
  // Try 1: campaign slug with linked official
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    include: {
      official: {
        select: {
          id: true, name: true, title: true, district: true,
          level: true, isClaimed: true, photoUrl: true, province: true, email: true,
          approvalRating: { select: { score: true } },
          _count: { select: { follows: true, questions: true } },
        },
      },
    },
  });
  if (campaign?.official) {
    return {
      official: {
        ...campaign.official,
        approvalScore: campaign.official.approvalRating?.score ?? null,
        followerCount: campaign.official._count.follows,
        questionCount: campaign.official._count.questions,
      },
      campaignSlug: campaign.slug,
    };
  }

  // Try 2 & 3: official by externalId or id
  const official = await prisma.official.findFirst({
    where: {
      isActive: true,
      OR: [{ externalId: slug }, { id: slug }],
    },
    select: {
      id: true, name: true, title: true, district: true,
      level: true, isClaimed: true, photoUrl: true, province: true, email: true,
      approvalRating: { select: { score: true } },
      _count: { select: { follows: true, questions: true } },
    },
  });
  if (official) {
    return {
      official: {
        ...official,
        approvalScore: official.approvalRating?.score ?? null,
        followerCount: official._count.follows,
        questionCount: official._count.questions,
      },
      campaignSlug: slug,
    };
  }

  return null;
}

export default async function ClaimPage({ params }: PageProps) {
  const data = await resolveOfficial(params.slug);
  if (!data) notFound();

  return (
    <ClaimClient
      official={{
        id: data.official.id,
        name: data.official.name,
        title: data.official.title ?? "",
        district: data.official.district,
        level: data.official.level,
        email: data.official.email,
        photoUrl: data.official.photoUrl,
        province: data.official.province,
        isClaimed: data.official.isClaimed,
        approvalScore: data.official.approvalScore,
        followerCount: data.official.followerCount,
        questionCount: data.official.questionCount,
      }}
    />
  );
}
