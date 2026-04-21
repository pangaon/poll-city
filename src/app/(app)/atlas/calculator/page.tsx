import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasComingSoon from "../coming-soon";
import { FeatureGuide } from "@/components/ui";
export const metadata = { title: "Swing Calculator — Atlas" };
export default async function SwingCalculatorPage() {
  await resolveActiveCampaign();
  return (
    <>
      <FeatureGuide
        featureKey="atlas-swing-calculator"
        title="What is the Swing Calculator?"
        description="The swing calculator tells you how many votes you need to win, based on the last election results in your ward. It shows you which polls (voting areas) are closest — where a small swing in your favour could flip the result."
        bullets={[
          "Enter your target vote share to see the swing required from the last election",
          "See poll-by-poll which areas have the most persuadable voters",
          "Use this to prioritise which neighbourhoods to canvass hardest",
        ]}
      />
      <AtlasComingSoon title="Swing Calculator" description="Model electoral scenarios: apply uniform swing, regional adjustments, and third-party vote splits to forecast your path to victory in every poll division." />
    </>
  );
}
