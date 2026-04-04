import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import NewPrintJobClient from "./new-job-client";

export const metadata = { title: "New Print Job" };

export default async function NewPrintJobPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <NewPrintJobClient campaignId={campaignId} />;
}
