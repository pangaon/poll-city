import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth/auth-options";
import PollDetailClient from "./poll-detail-client";

export const metadata = { title: "Poll — Poll City" };

export default async function PollDetailPage({ params }: { params: { id: string } }) {
  let campaignId = "";
  try {
    const resolved = await resolveActiveCampaign();
    campaignId = resolved.campaignId;
  } catch {
    // Public poll — no campaign context needed
  }
  const session = await getServerSession(authOptions);
  const nonManagerRoles = ["VOLUNTEER", "PUBLIC_USER"];
  const isManager = !!session?.user?.role && !nonManagerRoles.includes(session.user.role as string);
  return <PollDetailClient pollId={params.id} campaignId={campaignId} isManager={isManager} />;
}
