import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import InboxClient from "./inbox-client";

export const metadata = { title: "Inbox — Poll City" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { campaignId } = await resolveActiveCampaign();

  const threads = await prisma.inboxThread.findMany({
    where: { campaignId },
    orderBy: [{ lastMessageAt: "desc" }],
    take: 40,
    select: {
      id: true,
      channel: true,
      status: true,
      subject: true,
      fromHandle: true,
      fromName: true,
      lastMessageAt: true,
      unreadCount: true,
      contact: {
        select: { id: true, firstName: true, lastName: true },
      },
      messages: {
        orderBy: { sentAt: "desc" },
        take: 1,
        select: { body: true, direction: true, sentAt: true },
      },
    },
  });

  return (
    <InboxClient
      campaignId={campaignId}
      initialThreads={JSON.parse(JSON.stringify(threads))}
    />
  );
}
