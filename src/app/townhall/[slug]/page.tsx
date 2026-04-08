import { notFound } from "next/navigation";
import prisma from "@/lib/db/prisma";
import TownhallPublicClient from "./townhall-public-client";

interface TownhallPageProps {
  params: { slug: string };
}

export async function generateMetadata({ params }: TownhallPageProps) {
  const event = await prisma.event.findFirst({
    where: { slug: params.slug, isTownhall: true },
    select: { name: true, campaign: { select: { name: true } } },
  });
  if (!event) return { title: "Townhall Not Found" };
  return { title: `${event.name} — ${event.campaign.name} Virtual Townhall` };
}

export default async function TownhallPage({ params }: TownhallPageProps) {
  const event = await prisma.event.findFirst({
    where: { slug: params.slug, isTownhall: true },
    include: {
      campaign: { select: { name: true, logoUrl: true, primaryColor: true } },
    },
  });

  if (!event) notFound();

  const serialised = {
    id: event.id,
    name: event.name,
    slug: event.slug ?? params.slug,
    description: event.description,
    eventDate: event.eventDate.toISOString(),
    location: event.location,
    townhallStatus: event.townhallStatus,
    townhallRoomUrl: event.townhallRoomUrl,
    questionVoting: event.questionVoting,
    campaign: event.campaign,
  };

  return <TownhallPublicClient event={serialised} />;
}
