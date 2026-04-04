import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AnalyticsClient from "./analytics-client";

export const metadata = { title: "Analytics — Poll City" };

export default async function AnalyticsPage() {
  await resolveActiveCampaign();
  return <AnalyticsClient />;
}
