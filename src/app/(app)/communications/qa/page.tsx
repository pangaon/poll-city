import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import { redirect } from "next/navigation";
import prisma from "@/lib/db/prisma";
import SocialHubClient from "./qa-inbox-client";

export const metadata = { title: "Poll City Social Hub | Communications" };

export const dynamic = "force-dynamic";

export default async function QaInboxPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user) redirect("/login");

  const activeCampaignId = (session.user as { activeCampaignId?: string }).activeCampaignId ?? null;
  if (!activeCampaignId) redirect("/dashboard");

  const campaign = await prisma.campaign.findUnique({
    where: { id: activeCampaignId },
    select: { officialId: true, candidateName: true, name: true },
  });

  const officialId = campaign?.officialId ?? null;

  // Stats for the official
  let followerCount = 0;
  let postCount = 0;
  let questionCount = 0;

  if (officialId) {
    const [followers, posts, questions] = await Promise.all([
      prisma.officialFollow.count({ where: { officialId } }),
      prisma.politicianPost.count({ where: { officialId, isPublished: true } }),
      prisma.publicQuestion.count({ where: { officialId, isPublic: true } }),
    ]);
    followerCount = followers;
    postCount = posts;
    questionCount = questions;
  }

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <SocialHubClient
        officialLinked={!!officialId}
        officialId={officialId}
        candidateName={campaign?.candidateName ?? campaign?.name ?? "Your candidate"}
        followerCount={followerCount}
        postCount={postCount}
        questionCount={questionCount}
      />
    </div>
  );
}
