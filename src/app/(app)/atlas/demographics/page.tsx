import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasComingSoon from "../coming-soon";
import { FeatureGuide } from "@/components/ui";
export const metadata = { title: "Demographics — Atlas" };
export default async function DemographicsPage() {
  await resolveActiveCampaign();
  return (
    <>
      <FeatureGuide
        featureKey="atlas-demographics"
        title="Ward Demographics"
        description="The demographics module overlays census data onto your ward map — showing you income, age, household size, and language by neighbourhood. Use it to tailor your canvassing message to each area."
        bullets={[
          "See which neighbourhoods have the most renters vs. homeowners",
          "Identify areas with high concentrations of seniors, families, or new Canadians",
          "Use demographic data to prioritise lit-drop language and translation needs",
        ]}
      />
      <AtlasComingSoon title="Demographics" description="Explore Statistics Canada census data overlaid on your riding. View median income, language profiles, renter vs. owner rates, and immigration patterns at the dissemination area level." />
    </>
  );
}
