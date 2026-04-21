import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasComingSoon from "../coming-soon";
import { FeatureGuide } from "@/components/ui";
export const metadata = { title: "Boundary Manager — Atlas" };
export default async function BoundaryManagerPage() {
  await resolveActiveCampaign();
  return (
    <>
      <FeatureGuide
        featureKey="atlas-boundaries"
        title="Electoral Boundary Manager"
        description="The boundary manager lets you view and edit the official electoral boundaries for your ward. Accurate boundaries are critical — they determine exactly which addresses are in your voter universe."
        bullets={[
          "Import official ward boundaries from Elections Ontario or your city clerk",
          "Overlay with poll boundaries to see your voter universe street by street",
          "The canvassing system uses these boundaries to validate addresses",
        ]}
      />
      <AtlasComingSoon title="Boundary Manager" description="Upload and manage riding boundary GeoJSON files, define ward polygons, and overlay electoral district boundaries on your canvassing maps." />
    </>
  );
}
