import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";

export const revalidate = 30;

async function validateTvToken(slug: string, token: string | null) {
  if (!token) return null;
  const campaign = await prisma.campaign.findUnique({
    where: { slug },
    select: { id: true, name: true, tvEnabled: true, tvToken: true, tvRotate: true, tvRotateSec: true, tvModes: true, primaryColor: true, logoUrl: true },
  });
  if (!campaign || !campaign.tvEnabled || campaign.tvToken !== token) return null;
  return campaign;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } },
) {
  const token = req.nextUrl.searchParams.get("token");
  const campaign = await validateTvToken(params.slug, token);
  if (!campaign) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [contactCount, volunteerCount, donationAgg, tasksDone, tasksTotal] = await Promise.all([
    prisma.contact.count({ where: { campaignId: campaign.id } }),
    prisma.membership.count({ where: { campaignId: campaign.id } }),
    prisma.donation.aggregate({ where: { campaignId: campaign.id }, _sum: { amount: true }, _count: true }),
    prisma.task.count({ where: { campaignId: campaign.id, status: "completed" } }),
    prisma.task.count({ where: { campaignId: campaign.id } }),
  ]);

  return NextResponse.json({
    campaign: { name: campaign.name, primaryColor: campaign.primaryColor, logoUrl: campaign.logoUrl, tvRotate: campaign.tvRotate, tvRotateSec: campaign.tvRotateSec, tvModes: campaign.tvModes },
    stats: {
      contacts: contactCount,
      volunteers: volunteerCount,
      donationsTotal: donationAgg._sum.amount ?? 0,
      donationsCount: donationAgg._count ?? 0,
      tasksDone,
      tasksTotal,
    },
  });
}
