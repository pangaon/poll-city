import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import FinanceNav from "./finance-nav";

export const metadata = { title: "Finance" };

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { campaignId } = await resolveActiveCampaign();
  return (
    <div className="max-w-screen-2xl mx-auto">
      <FinanceNav campaignId={campaignId} />
      {children}
    </div>
  );
}
