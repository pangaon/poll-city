import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import prisma from "@/lib/db/prisma";
import InboxClient from "./inbox-client";

export const metadata = { title: "Inbox -- Poll City" };
export const dynamic = "force-dynamic";

export default async function InboxPage() {
  const { campaignId } = await resolveActiveCampaign();

  const [logs, questions, mentions] = await Promise.all([
    prisma.notificationLog.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: {
        id: true,
        title: true,
        body: true,
        status: true,
        sentAt: true,
        totalSubscribers: true,
        deliveredCount: true,
        failedCount: true,
        createdAt: true,
      },
    }),
    prisma.question.findMany({
      where: { campaignId },
      orderBy: { createdAt: "desc" },
      take: 30,
      select: { id: true, name: true, email: true, question: true, createdAt: true },
    }),
    prisma.socialMention.findMany({
      where: { campaignId, needsResponse: true },
      orderBy: { mentionedAt: "desc" },
      take: 30,
      select: {
        id: true,
        platform: true,
        authorHandle: true,
        authorName: true,
        content: true,
        url: true,
        mentionedAt: true,
        sentiment: true,
        needsResponse: true,
      },
    }),
  ]);

  return (
    <InboxClient
      logs={JSON.parse(JSON.stringify(logs))}
      questions={JSON.parse(JSON.stringify(questions))}
      mentions={JSON.parse(JSON.stringify(mentions))}
    />
  );
}
