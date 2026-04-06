import PublicNav from "@/components/layout/public-nav";
import CampaignCostCalculator from "@/components/calculator/campaign-cost-calculator";

export const metadata = {
  title: "Campaign Cost Calculator - Poll City",
  description: "Estimate legal spend limits, budget ranges, and platform cost share for your election.",
};

export default function CalculatorPage() {
  return (
    <>
      <PublicNav />
      <main className="min-h-screen bg-slate-50 py-10">
        <div className="mx-auto max-w-6xl px-4">
          <CampaignCostCalculator />
        </div>
      </main>
    </>
  );
}
