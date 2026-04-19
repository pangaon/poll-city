import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import QaInboxClient from "./qa-inbox-client";

export const metadata = { title: "Q&A Inbox | Communications" };

export default async function QaInboxPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const activeCampaignId = (session.user as { activeCampaignId?: string }).activeCampaignId ?? null;
  if (!activeCampaignId) redirect("/dashboard");

  const campaign = await prisma.campaign.findUnique({
    where: { id: activeCampaignId },
    select: { officialId: true, candidateName: true, name: true },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <QaInboxClient
        officialLinked={!!campaign?.officialId}
        officialId={campaign?.officialId ?? null}
        candidateName={campaign?.candidateName ?? campaign?.name ?? "Your candidate"}
      />
    </div>
  );
}
