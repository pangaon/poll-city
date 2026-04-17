import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import Link from "next/link";
import LiveResultsStream from "@/components/polls/LiveResultsStream";
import { ArrowLeft, Pencil, Globe, Lock, EyeOff } from "lucide-react";
import LivePageActions from "./live-page-actions";
import DemographicsPanel from "./demographics-panel";

export const metadata = { title: "Live Results — Poll City" };

export default async function PollLivePage({ params }: { params: { id: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const poll = await prisma.poll.findUnique({
    where: { id: params.id },
    include: { options: { orderBy: { order: "asc" } } },
  });

  if (!poll) notFound();

  // Visibility check: campaign_only polls need membership
  if (poll.visibility === "campaign_only" && poll.campaignId) {
    const membership = await prisma.membership.findUnique({
      where: {
        userId_campaignId: {
          userId: session.user.id,
          campaignId: poll.campaignId,
        },
      },
    });
    if (!membership) {
      redirect("/polls");
    }
  }

  const nonManagerRoles = ["VOLUNTEER", "PUBLIC_USER"];
  const isManager = !!session?.user?.role && !nonManagerRoles.includes(session.user.role as string);

  // Voter share URL: public/unlisted → social page, campaign_only → campaign app
  const voterUrl = poll.visibility === "campaign_only"
    ? `/polls/${poll.id}`
    : `/social/polls/${poll.id}`;

  const visibilityLabel =
    poll.visibility === "public" ? "Public — anyone can vote"
    : poll.visibility === "campaign_only" ? "Campaign members only"
    : "Unlisted — anyone with the link";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <Link
            href={`/polls/${poll.id}`}
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-3"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to poll
          </Link>
          <h1 className="text-xl font-bold text-gray-900 line-clamp-3">{poll.question}</h1>
          <div className="flex items-center gap-2 mt-2 text-xs text-gray-400">
            {poll.visibility === "public" ? <Globe className="w-3.5 h-3.5" /> : poll.visibility === "campaign_only" ? <Lock className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>{visibilityLabel}</span>
          </div>
        </div>
        {isManager && (
          <Link
            href={`/polls/${poll.id}`}
            className="flex-shrink-0 flex items-center gap-1.5 text-sm text-gray-500 hover:text-[#1D9E75] transition-colors px-3 py-2 rounded-xl border border-gray-200 hover:border-[#1D9E75]"
          >
            <Pencil className="w-3.5 h-3.5" /> Manage
          </Link>
        )}
      </div>

      {/* Live stream */}
      <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
        <LiveResultsStream
          pollId={poll.id}
          pollType={poll.type}
          initialTotal={poll.totalResponses}
        />
      </div>

      {/* Geographic breakdown + trend (lazy client-side fetch) */}
      <DemographicsPanel pollId={poll.id} />

      {/* Share + actions */}
      <LivePageActions
        pollId={poll.id}
        voterUrl={voterUrl}
        isManager={isManager}
        visibility={poll.visibility}
      />

    </div>
  );
}
