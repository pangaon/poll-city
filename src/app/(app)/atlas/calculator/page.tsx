import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasComingSoon from "../coming-soon";
export const metadata = { title: "Swing Calculator — Atlas" };
export default async function SwingCalculatorPage() {
  await resolveActiveCampaign();
  return <AtlasComingSoon title="Swing Calculator" description="Model electoral scenarios: apply uniform swing, regional adjustments, and third-party vote splits to forecast your path to victory in every poll division." />;
}
