import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import FinanceNav from "./finance-nav";
import { redirect } from "next/navigation";

export const metadata = { title: "Finance" };

const FINANCE_ROLES = ["SUPER_ADMIN", "ADMIN", "CAMPAIGN_MANAGER", "FINANCE"];

export default async function FinanceLayout({ children }: { children: React.ReactNode }) {
  const { campaignId, role } = await resolveActiveCampaign();
  if (!FINANCE_ROLES.includes(role)) redirect("/dashboard");
  return (
    <div className="max-w-screen-2xl mx-auto">
      <FinanceNav campaignId={campaignId} />
      {children}
    </div>
  );
}
