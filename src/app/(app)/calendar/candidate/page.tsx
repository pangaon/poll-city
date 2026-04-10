import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import CandidateScheduleClient from "./candidate-schedule-client";

export const metadata = { title: "Candidate Schedule" };

export default async function CandidateSchedulePage() {
  const { campaignId } = await resolveActiveCampaign();
  return <CandidateScheduleClient campaignId={campaignId} />;
}
