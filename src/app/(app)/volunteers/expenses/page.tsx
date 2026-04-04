import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import VolunteerExpensesClient from "./volunteer-expenses-client";

export const metadata = { title: "Volunteer Expenses" };

export default async function VolunteerExpensesPage() {
  const { campaignId } = await resolveActiveCampaign();
  return <VolunteerExpensesClient campaignId={campaignId} />;
}
