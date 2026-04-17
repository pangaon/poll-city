import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getQrLandingContext } from "@/lib/qr/landing";
import QrLandingClient from "./qr-landing-client";

interface Props {
  params: { token: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const ctx = await getQrLandingContext(params.token).catch(() => null);
  if (!ctx) return { title: "Poll City" };

  const config = ctx.qrCode.landingConfig;
  const headline = config.headline ?? "Your Voice Matters";
  const candidateName = ctx.campaign?.candidateName ?? ctx.campaign?.name;
  const title = candidateName ? `${candidateName} — Poll City` : headline;
  const description = config.subheadline ?? "Connect with your local community";

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ctx.campaign?.logoUrl ? [ctx.campaign.logoUrl] : [],
    },
  };
}

export default async function QrLandingPage({ params }: Props) {
  const ctx = await getQrLandingContext(params.token).catch(() => null);

  // Don't notFound() for expired/inactive codes — show graceful expired state
  if (!ctx) notFound();

  return <QrLandingClient context={ctx} token={params.token} />;
}
