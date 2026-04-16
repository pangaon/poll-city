import { notFound } from "next/navigation";
import { Metadata } from "next";
import prisma from "@/lib/db/prisma";
import DonateClient from "./donate-client";

interface Props {
  params: { campaignSlug: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.campaignSlug },
    select: { name: true, candidateName: true, description: true, logoUrl: true },
  }).catch(() => null);

  if (!campaign) return { title: "Donate — Poll City" };

  const displayName = campaign.candidateName ?? campaign.name;
  return {
    title: `Donate to ${displayName}`,
    description: campaign.description ?? `Support ${displayName}'s campaign.`,
    openGraph: campaign.logoUrl ? { images: [campaign.logoUrl] } : undefined,
  };
}

export default async function DonatePage({ params }: Props) {
  const campaign = await prisma.campaign.findUnique({
    where: { slug: params.campaignSlug, isActive: true },
    select: {
      id: true,
      name: true,
      slug: true,
      candidateName: true,
      candidateTitle: true,
      candidateBio: true,
      logoUrl: true,
      websiteUrl: true,
      primaryColor: true,
      secondaryColor: true,
      tagline: true,
      jurisdiction: true,
    },
  });

  if (!campaign) notFound();

  // Find the first active donation page for this campaign
  const donationPage = await prisma.donationPage.findFirst({
    where: { campaignId: campaign.id, pageStatus: "active", deletedAt: null },
    select: {
      id: true,
      title: true,
      description: true,
      suggestedAmountsJson: true,
      minimumAmount: true,
      thankYouMessage: true,
      showGoalThermometer: true,
      allowRecurring: true,
      requirePhone: true,
      requireEmployer: true,
    },
    orderBy: { publishedAt: "desc" },
  });

  const suggestedAmounts = donationPage
    ? (donationPage.suggestedAmountsJson as number[])
    : [25, 50, 100, 250];

  return (
    <DonateClient
      campaign={campaign}
      donationPage={donationPage
        ? {
            id: donationPage.id,
            title: donationPage.title,
            description: donationPage.description ?? null,
            suggestedAmounts,
            minimumAmount: donationPage.minimumAmount ?? 5,
            thankYouMessage: donationPage.thankYouMessage ?? null,
            allowRecurring: donationPage.allowRecurring,
            requirePhone: donationPage.requirePhone,
            requireEmployer: donationPage.requireEmployer,
          }
        : null}
    />
  );
}
