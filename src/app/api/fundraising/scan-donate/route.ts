import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";

export const dynamic = "force-dynamic";

// Public endpoint — resolves QR attribution for scan-to-donate flows.
// Returns campaign branding + donation page config + sourceId for Stripe attribution.
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const qrId = p.get("qrId");
  if (!qrId) return NextResponse.json({ error: "qrId required" }, { status: 400 });

  const session = await getServerSession(authOptions);

  const qr = await prisma.qrCode.findUnique({
    where: { id: qrId },
    select: {
      id: true,
      campaignId: true,
      entityId: true,
      type: true,
      campaign: {
        select: {
          id: true,
          name: true,
          slug: true,
        },
      },
    },
  });
  if (!qr) return NextResponse.json({ error: "QR code not found" }, { status: 404 });
  if (!qr.campaignId) return NextResponse.json({ error: "QR code not linked to a campaign" }, { status: 400 });

  const campaignId = qr.campaignId;

  const donationPage = qr.entityId
    ? await prisma.donationPage.findFirst({
        where: { campaignId, id: qr.entityId, pageStatus: "active" },
      })
    : await prisma.donationPage.findFirst({
        where: { campaignId, pageStatus: "active" },
      });

  // Find or create a DonationSource for QR attribution tracking
  let source = await prisma.donationSource.findFirst({
    where: { campaignId, qrCodeId: qrId },
  });

  if (!source) {
    source = await prisma.donationSource.create({
      data: {
        campaignId,
        name: `QR Scan — ${qr.id.slice(-8).toUpperCase()}`,
        qrCodeId: qrId,
        active: true,
      },
    });
  }

  return NextResponse.json({
    campaign: qr.campaign,
    donationPage: donationPage
      ? {
          id: donationPage.id,
          title: donationPage.title,
          suggestedAmounts: donationPage.suggestedAmountsJson,
          allowCustomAmount: true,
          currency: "CAD",
        }
      : null,
    sourceId: source.id,
    userId: session?.user?.id ?? null,
  });
}
