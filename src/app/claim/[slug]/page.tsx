import { notFound } from "next/navigation";
import { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import ClaimClient from "./claim-client";

interface PageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const official = await resolveOfficial(params.slug);
  return {
    title: official
      ? `Claim ${official.name}'s Profile — Poll City`
      : "Claim Your Profile — Poll City",
  };
}

/**
 * Resolve an official from a slug that may be:
 *  1. A campaign slug  →  campaign.official (existing flow from /candidates/[slug])
 *  2. An official externalId  →  official.externalId (from /officials directory)
 *  3. An official id (cuid)  →  official.id (fallback)
 */
async function resolveOfficial(slug: string) {
  // Try 1: campaign slug with linked official
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    include: {
      official: {
        select: {
          id: true, name: true, title: true, district: true,
          level: true, isClaimed: true, photoUrl: true, province: true,
        },
      },
    },
  });
  if (campaign?.official) {
    return { ...campaign.official, campaignSlug: campaign.slug };
  }

  // Try 2 & 3: official by externalId or id
  const official = await prisma.official.findFirst({
    where: {
      OR: [{ externalId: slug }, { id: slug }],
    },
    select: {
      id: true, name: true, title: true, district: true,
      level: true, isClaimed: true, photoUrl: true, province: true,
    },
  });
  if (official) {
    return { ...official, campaignSlug: slug }; // slug acts as the token identifier
  }

  return null;
}

export default async function ClaimPage({ params }: PageProps) {
  const official = await resolveOfficial(params.slug);

  if (!official) {
    notFound();
  }

  if (official.isClaimed) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full text-center">
          <div className="bg-white rounded-2xl shadow-sm border p-8 space-y-3">
            <p className="text-gray-700 font-medium">This profile has already been claimed.</p>
            <a
              href={`/candidates/${official.campaignSlug}`}
              className="text-blue-600 hover:underline text-sm"
            >
              View the public page →
            </a>
          </div>
        </div>
      </div>
    );
  }

  return (
    <ClaimClient
      campaign={{ slug: official.campaignSlug, name: official.name }}
      official={{
        id: official.id,
        name: official.name,
        title: official.title ?? "",
        district: official.district,
        level: official.level,
        photoUrl: official.photoUrl,
        province: official.province,
      }}
    />
  );
}
