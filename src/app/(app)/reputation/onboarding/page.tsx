import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import OnboardingClient from "./onboarding-client";

export const metadata = { title: "Reputation Setup — Poll City" };

export default async function ReputationOnboardingPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <OnboardingClient campaignId={campaignId} />;
}
