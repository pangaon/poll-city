import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import PrintShopsClient from "./shops-client";

export const metadata = { title: "Print Shops" };

export default async function PrintShopsPage() {
  await resolveActiveCampaign();
  return <PrintShopsClient />;
}
