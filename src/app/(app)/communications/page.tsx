import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import CommunicationsClient from "./communications-client";

export const dynamic = "force-dynamic";
export const metadata = { title: "Communications — Poll City" };

export default async function CommunicationsPage() {
  const { campaignId, campaignName } = await resolveActiveCampaign();

  let tags: Array<{ id: string; name: string; color: string | null }> = [];
  let wards: string[] = [];

  try {
    const [tagsRaw, contactsWithWards] = await Promise.all([
      prisma.tag.findMany({
        where: { campaignId },
        select: { id: true, name: true, color: true },
        orderBy: { name: "asc" },
      }),
      prisma.contact.findMany({
        where: { campaignId, ward: { not: null } },
        select: { ward: true },
        distinct: ["ward"],
        orderBy: { ward: "asc" },
      }),
    ]);
    tags = tagsRaw.map((t) => ({ id: t.id, name: t.name, color: t.color }));
    wards = contactsWithWards.map((c) => c.ward!).filter(Boolean);
  } catch {
    // DB error — render with empty segmentation data rather than crashing
  }

  // Negative margins cancel the app layout's padding so comms fills edge-to-edge
  return (
    <div className="-m-3 sm:-m-4 md:-m-6">
      <CommunicationsClient
        campaignId={campaignId}
        campaignName={campaignName}
        tags={tags}
        wards={wards}
      />
    </div>
  );
}
