import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import { notFound } from "next/navigation";
import DesignClient from "./design-client";

export const dynamic = "force-dynamic";

export default async function DesignPage({ params }: { params: { slug: string } }) {
  const { campaignId, campaignName } = await resolveActiveCampaign();
  const template = await prisma.printTemplate.findUnique({
    where: { slug: params.slug },
    select: { id: true, slug: true, name: true, category: true, width: true, height: true },
  });
  if (!template) notFound();

  return (
    <DesignClient
      campaignId={campaignId}
      campaignName={campaignName}
      template={template}
    />
  );
}
