import { resolveActiveCampaign } from "@/lib/auth/campaign-resolver";
import AtlasComingSoon from "../coming-soon";
export const metadata = { title: "Boundary Manager — Atlas" };
export default async function BoundaryManagerPage() {
  await resolveActiveCampaign();
  return <AtlasComingSoon title="Boundary Manager" description="Upload and manage riding boundary GeoJSON files, define ward polygons, and overlay electoral district boundaries on your canvassing maps." />;
}
