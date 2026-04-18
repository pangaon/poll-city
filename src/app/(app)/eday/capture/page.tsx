import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import CaptureClient from "./capture-client";

export const metadata = { title: "Quick Capture — Poll City" };

export default async function QuickCapturePage({
  searchParams,
}: {
  searchParams: { eventId?: string };
}) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.activeCampaignId) redirect("/login");

  const campaignId = session.user.activeCampaignId;

  const membership = await prisma.membership.findUnique({
    where: { userId_campaignId: { userId: session.user.id, campaignId } },
    select: { role: true, status: true },
  });
  if (!membership || membership.status !== "active") redirect("/eday");

  // Load active events for this campaign
  const events = await prisma.captureEvent.findMany({
    where: { campaignId, status: "active", deletedAt: null },
    include: {
      candidates: { where: { isWithdrawn: false }, orderBy: { ballotOrder: "asc" } },
      _count: { select: { locations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const isManager = ["ADMIN", "CAMPAIGN_MANAGER", "SUPER_ADMIN"].includes(membership.role);

  return (
    <CaptureClient
      campaignId={campaignId}
      userId={session.user.id}
      initialEventId={searchParams.eventId ?? null}
      initialEvents={events.map((e) => ({
        id: e.id,
        name: e.name,
        eventType: e.eventType,
        office: e.office,
        ward: e.ward,
        municipality: e.municipality,
        requireDoubleEntry: e.requireDoubleEntry,
        allowPartialSubmit: e.allowPartialSubmit,
        candidates: e.candidates,
        locationCount: e._count.locations,
      }))}
      isManager={isManager}
    />
  );
}
