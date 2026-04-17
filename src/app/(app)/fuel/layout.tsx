import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import FuelNav from "./fuel-nav";

export const metadata = { title: "FuelOps" };

export default async function FuelLayout({ children }: { children: React.ReactNode }) {
  const { campaignId } = await resolveActiveCampaign();
  return (
    <div className="max-w-screen-2xl mx-auto">
      <FuelNav campaignId={campaignId} />
      {children}
    </div>
  );
}
