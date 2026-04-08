import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import prisma from "@/lib/db/prisma";
import Link from "next/link";
import LiveResultsStream from "@/components/polls/LiveResultsStream";
import { ArrowLeft } from "lucide-react";

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

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-gray-900 flex-1 mr-4 line-clamp-2">{poll.question}</h1>
        <Link
          href={`/polls/${poll.id}`}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors flex-shrink-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to poll
        </Link>
      </div>

      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <LiveResultsStream
          pollId={poll.id}
          pollType={poll.type}
          initialTotal={poll.totalResponses}
        />
      </div>
    </div>
  );
}
