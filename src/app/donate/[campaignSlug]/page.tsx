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
      stripeOnboarded: true,
      isDemo: true,
    },
  });

  if (!campaign) notFound();

  // Campaign exists but hasn't connected Stripe — show a branded unavailable page
  if (!campaign.stripeOnboarded && !campaign.isDemo) {
    const displayName = campaign.candidateName ?? campaign.name;
    const primary = campaign.primaryColor ?? "#0A2342";
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header style={{ backgroundColor: primary }} className="text-white py-4 px-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            {campaign.logoUrl && (
              <img src={campaign.logoUrl} alt={displayName} className="h-10 w-10 rounded-full object-cover bg-white" />
            )}
            <div>
              <div className="font-bold text-lg leading-tight">{displayName}</div>
              {campaign.candidateTitle && <div className="text-xs opacity-80">{campaign.candidateTitle}</div>}
            </div>
          </div>
        </header>
        <main className="flex-1 flex items-center justify-center px-4 py-16">
          <div className="max-w-md w-full text-center">
            <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center mx-auto mb-6 text-2xl">
              🔒
            </div>
            <h1 className="text-2xl font-bold text-slate-900 mb-3">
              Online donations not yet available
            </h1>
            <p className="text-slate-600 mb-8">
              {displayName}&apos;s campaign is still setting up their donation system.
              Check back soon, or contact the campaign directly to contribute.
            </p>
            {campaign.websiteUrl && (
              <a
                href={campaign.websiteUrl}
                className="inline-block px-6 py-2.5 rounded-lg text-white text-sm font-medium"
                style={{ backgroundColor: primary }}
              >
                Visit campaign website
              </a>
            )}
            <p className="text-xs text-slate-400 mt-8">
              Powered by Poll City — Canadian campaign management
            </p>
          </div>
        </main>
      </div>
    );
  }

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
