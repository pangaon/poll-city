import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasComingSoon from "../coming-soon";
export const metadata = { title: "Historical Results — Atlas" };
export default async function HistoricalResultsPage() {
  await resolveActiveCampaign();
  return <AtlasComingSoon title="Historical Results" description="Import and visualize past federal, provincial, and municipal election results. Identify swing polls, safe zones, and high-priority districts in your riding." />;
}
