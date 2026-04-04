import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import CandidateCallList from "@/components/gotv/candidate-call-list";
export const metadata = { title: "Call List" };

export default async function CallListPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <CandidateCallList campaignId={campaignId} />;
}
