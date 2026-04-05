import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import SmsClient from "./sms-client";

export const metadata = { title: "SMS Campaign — Poll City" };
export const dynamic = "force-dynamic";

export default async function SmsPage() {
  const { campaignId } = await resolveActiveCampaign();
  const [tags, wardRows] = await Promise.all([
    prisma.tag.findMany({ where: { campaignId }, orderBy: { name: "asc" }, select: { id: true, name: true, color: true } }),
    prisma.contact.findMany({
      where: { campaignId, ward: { not: null } },
      distinct: ["ward"],
      select: { ward: true },
      take: 100,
    }),
  ]);
  const wards = wardRows.map((r) => r.ward).filter(Boolean) as string[];
  return <SmsClient campaignId={campaignId} tags={tags} wards={wards} />;
}
