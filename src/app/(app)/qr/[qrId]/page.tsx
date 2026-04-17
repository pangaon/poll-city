import { Metadata } from "next";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect, notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import QrDetailClient from "./qr-detail-client";
import { buildQrUrl, buildQrImageUrl } from "@/lib/qr/generate";

interface Props {
  params: { qrId: string };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const qr = await prisma.qrCode.findUnique({
    where: { id: params.qrId },
    select: { label: true },
  }).catch(() => null);
  return { title: `${qr?.label ?? "QR Code"} — Poll City` };
}

export default async function QrDetailPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const campaignId = session.user.activeCampaignId;
  if (!campaignId) redirect("/dashboard");

  const qrCode = await prisma.qrCode.findFirst({
    where: { id: params.qrId, campaignId },
    include: {
      _count: { select: { scans: true, prospects: true, signOpportunities: true } },
    },
  });

  if (!qrCode) notFound();

  const baseUrl = process.env.NEXTAUTH_URL;
  const enriched = {
    ...qrCode,
    publicUrl: buildQrUrl(qrCode.token, baseUrl),
    qrImageUrl: buildQrImageUrl(qrCode.token, 400, baseUrl),
    scanCount: qrCode._count.scans,
    prospectCount: qrCode._count.prospects,
    signOpportunityCount: qrCode._count.signOpportunities,
    startAt: qrCode.startAt?.toISOString() ?? null,
    endAt: qrCode.endAt?.toISOString() ?? null,
    createdAt: qrCode.createdAt.toISOString(),
    updatedAt: qrCode.updatedAt.toISOString(),
    landingConfig: (qrCode.landingConfig ?? null) as Record<string, unknown> | null,
  };

  return <QrDetailClient qrCode={enriched} campaignId={campaignId} />;
}
