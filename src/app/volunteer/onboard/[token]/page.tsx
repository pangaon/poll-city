import VolunteerOnboardingClient from "./volunteer-onboarding-client";

export const metadata = { title: "Volunteer Onboarding" };

export default function VolunteerOnboardPage({ params }: { params: { token: string } }) {
  return <VolunteerOnboardingClient token={params.token} />;
}
