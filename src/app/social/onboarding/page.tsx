import type { Metadata } from "next";
import OnboardingFlow from "./onboarding-flow";

export const metadata: Metadata = {
  title: "Join Poll City Social — Your Civic Passport",
  description: "Vote on local issues, track your elected officials, and engage with your community.",
};

export default function SocialOnboardingPage() {
  return <OnboardingFlow />;
}
