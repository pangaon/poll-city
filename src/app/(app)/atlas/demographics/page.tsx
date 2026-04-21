import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasComingSoon from "../coming-soon";
export const metadata = { title: "Demographics — Atlas" };
export default async function DemographicsPage() {
  await resolveActiveCampaign();
  return <AtlasComingSoon title="Demographics" description="Explore Statistics Canada census data overlaid on your riding. View median income, language profiles, renter vs. owner rates, and immigration patterns at the dissemination area level." />;
}
